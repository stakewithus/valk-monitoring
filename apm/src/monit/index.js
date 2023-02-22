import fs from 'fs';
import path from 'path';
import Bluebird from 'bluebird';
import pino from 'pino';
import Tendermint from '../plugins/chains/tendermint';
import HealthCheck from './health-checks';
import KVStore from './kv-store';
import Core from '../core';
import Config from '../config';
import Util from '../common/util';
import Consul from '../plugins/backends/consul2/api';
import Github from '../server/controllers/github';
import Alerting from './alerting';
import TerraMonitoring from './terra';

Bluebird.promisifyAll(fs);
const logger = pino().child({ module: 'cmd/monit' });

const parseJobFile = (nodeList, schd) => async (jobHCL) => {
  const rawHCL = await fs.readFileAsync(jobHCL, 'utf-8');
  const normHCL = schd.stripNewLine(rawHCL);
  const jobDef = await schd.job.parse(`${normHCL}`);
  const jobLayout = schd.Job.layoutFromDef(jobDef);
  return nodeList.map((n) => ({
    nodeId: n.nodeID,
    projectName: jobLayout.name,
    networkName: jobLayout.network || 'unknown',
    port: jobLayout.ports.http_rpc,
    host: n.nodeAddress,
    region: n.nodeRegion,
    nodeChecks: n.nodeChecks,
    nodeServiceList: n.nodeServiceList,
  }));
};

const getAllJobs = (nodeList, Schedule) => async (configDir) => {
  const fileList = await fs.readdirAsync(configDir);
  const jobFileList = fileList.filter((f) => f.endsWith('.hcl')).map((f) => path.join(configDir, f));
  const jobParser = parseJobFile(nodeList, Schedule);
  const jobTasks = await Promise.all(jobFileList.map(jobParser));
  return jobTasks.reduce((acc, job) => acc.concat(job), []);
};

const updateKVStore = (Backend) => async ({
  nodeState, nodeMeta, validatorSettings,
}) => {
  if (!nodeState) {
    return null;
  }
  nodeMeta.validatorAddresses = Util.getValidatorAddress(validatorSettings, nodeMeta.projectName, nodeMeta.networkName); // eslint-disable-line
  return KVStore.update(Backend)({ nodeState, nodeMeta });
};

const updateHealthChecks = (Backend) => async ({
  nodeState, nodeMeta, healthCheckConfigs, production, validatorSettings,
}) => {
  const customConfig = healthCheckConfigs.customSettings[nodeMeta.projectName];
  let customHealthCheckConfigs = healthCheckConfigs.defaultSettings;
  if (customConfig) {
    customHealthCheckConfigs = Object.assign({}, healthCheckConfigs.defaultSettings, customConfig); // eslint-disable-line
  }
  nodeMeta.validatorAddresses = Util.getValidatorAddress(validatorSettings, nodeMeta.projectName, nodeMeta.networkName); // eslint-disable-line
  return HealthCheck.update(Backend)({
    nodeState, nodeMeta, production, healthCheckConfigs: customHealthCheckConfigs,
  });
};

const getNodes = async ({
  nodeIp, production, consulPort, nomadPort, prodConfigFile, config,
}) => {
  if (production) {
    const serverConfig = await Util.getProductionFileConfig(prodConfigFile);
    const { nodeList: nodeInfos } = await Core.getClusterProd(nodeIp, consulPort, serverConfig);
    return nodeInfos.reduce((acc, n) => acc.concat(n.projects.map((prj) => ({
      nodeId: n.nodeID,
      projectName: prj.name,
      networkName: prj.network || 'unknown',
      port: prj.ports.http_rpc,
      host: n.nodeAddress,
      region: n.nodeRegion,
      nodeChecks: n.nodeChecks,
      nodeServiceList: n.nodeServiceList,
    }))), []);
  }
  const { nodeList, schd: Schedule } = await Core.getCluster(nodeIp, nomadPort,
    consulPort);
  return getAllJobs(nodeList, Schedule)(config);
};

const getHighestBlockHeightByProject = (projectStates) => projectStates.reduce((acc, state) => {
  if (!state) {
    return acc;
  }
  const pid = `${state.projectName}-${state.networkName}`;
  if (!acc[pid]) {
    acc[pid] = state.block_height;
  } else {
    acc[pid] = Math.max(acc[pid], state.block_height);
  }
  return acc;
}, {});

const getMutedNodes = async (Backend) => {
  const mutedConfig = await Backend.kv.getValue(Config.mutedNodesKey);
  if (!mutedConfig) {
    return [];
  }
  const nodes = mutedConfig.split(',');
  return nodes.map((node) => {
    const [region, projectName] = node.split(':');
    if (!region) {
      return null;
    }
    return {
      region,
      projectName,
    };
  }).filter((n) => n);
};

const getConfigs = (Backend) => async ({ production, prodConfigFile }) => {
  const [healthCheckConfigs, mutedNodes, validatorSettings] = await Promise.all([
    KVStore.getThresholdSettings(Backend)({ production, prodConfigFile }),
    getMutedNodes(Backend),
    KVStore.getValidatorAddressSettings(Backend)(prodConfigFile),
  ]);
  return {
    healthCheckConfigs,
    mutedNodes,
    validatorSettings,
  };
};

const run = async ({
  node: nodeIp, consulPort, nomadPort, prodConfigFile, production, config,
}) => {
  try {
    const nodes = await getNodes({
      nodeIp, production, consulPort, nomadPort, prodConfigFile, config,
    });
    const runningNodes = nodes.filter((n) => n.nodeServiceList && n.nodeServiceList
      .includes(Util.getServiceName(n.projectName, production, n.region)));
    if (runningNodes.length === 0) {
      logger.info('Service is not registered on nodes');
      return null;
    }
    const {
      healthCheckConfigs,
      mutedNodes,
      validatorSettings,
    } = await getConfigs(Consul(nodeIp, consulPort).Api)({
      production, prodConfigFile,
    });
    const requestPromises = runningNodes
      .map((n) => Tendermint.getNodeState(
        n.host,
        n.port,
        Util.getProjectName(n.projectName),
        n.networkName,
        Config.requestTimeoutMs,
        validatorSettings,
      ));
    const nodeStates = await Promise.all(requestPromises);
    const highestBlockHeights = getHighestBlockHeightByProject(nodeStates);
    const nodeForUpdatingGlobal = nodeStates
      .reduce((acc, node) => {
        if (!node) return acc;
        const pid = `${node.projectName}-${node.networkName}`;
        if (!acc[pid] && (+node.block_height === +highestBlockHeights[pid])) {
          acc[pid] = node.meta.id;
        }
        return acc;
      }, {});
    const nodeStatesForUpdating = nodeStates.map((node) => {
      if (!node) return node;
      if (node.meta.id === nodeForUpdatingGlobal[`${node.projectName}-${node.networkName}`]) {
        return Object.assign(node, { updateGlobal: true });
      }
      return node;
    });
    const ConsulClient = Consul(nodeIp, consulPort).Api;
    const updateKVStorePromises = nodeStatesForUpdating
      .map((nodeState, index) => {
        const consulClient = production ? ConsulClient
          : Consul(runningNodes[index].host, consulPort).Api;
        return updateKVStore(consulClient)({
          nodeState,
          nodeMeta: runningNodes[index],
          validatorSettings,
        });
      });
    await Promise.all(updateKVStorePromises);
    const updateHealthCheckPromises = nodeStatesForUpdating
      .map((nodeState, index) => {
        const consulClient = production ? ConsulClient
          : Consul(runningNodes[index].host, consulPort).Api;
        return updateHealthChecks(consulClient)({
          nodeState,
          nodeMeta: runningNodes[index],
          healthCheckConfigs,
          validatorSettings,
          production,
        });
      });
    const healthCheckResult = await Promise.all(updateHealthCheckPromises);
    await Alerting.handleAlerting(mutedNodes, healthCheckResult, validatorSettings);
    return healthCheckResult;
  } catch (e) {
    console.log(e);
    logger.error('Error while executing the command');
    logger.info(e && e.toString());
    return null;
  }
};

const getConfigDir = async () => {
  let commands = null;
  try {
    commands = await Github.getCommands(process.env.GITHUB_REPO);
    await Github.runCommand(commands.remove);
    await Github.runCommand(commands.fetch);
    return commands.configDir;
  } catch (e) {
    logger.error('Error fetching config');
    logger.info(e && e.toString());
    return null;
  }
};

const runEvery5s = async (args) => {
  const result = await run(args);
  await TerraMonitoring.run(args);
  if (args.v) {
    console.dir(result, { depth: null });
  }
  setTimeout(() => {
    runEvery5s(args);
  }, 5000);
};

const start = async (args) => {
  if (!args.config && !args.production) {
    args.config = await getConfigDir(); // eslint-disable-line no-param-reassign
    logger.info('Using config dir', args.config);
  }
  TerraMonitoring.fetchExchangeRate();
  runEvery5s(args);
};
export default {
  start,
  run,
};
