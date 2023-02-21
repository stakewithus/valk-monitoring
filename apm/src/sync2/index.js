import fs from 'fs';
import Bluebird from 'bluebird';
import path from 'path';
import pino from 'pino';
import KVStore from '../monit/kv-store';
import Constant from '../monit/constant';

import Util from '../common/util';
import Core from '../core';
import Backend from '../plugins/backends/consul2/api';
import LcdBackend from '../monit/lcd-backend';
import TerraOracle from '../monit/terra/oracle-backend';

const { CHECK_NAMES } = Constant;

Bluebird.promisifyAll(fs);
const logger = pino().child({ module: 'cmd/sync' });


const parseJobFile = (schd) => async (jobHCL) => {
  let change = 'None';
  let changeErr = null;
  const rawHCL = await fs.readFileAsync(jobHCL, 'utf-8');
  const normHCL = schd.stripNewLine(rawHCL);
  try {
    const jobDef = await schd.job.parse(`${normHCL}`);
    const jobPlan = await schd.job.plan(jobDef.ID, jobDef, { diff: true });
    const {
      Diff: {
        Type,
      },
    } = jobPlan;
    change = Type;
    return {
      change,
      changeErr,
      jobDef,
    };
  } catch (e) {
    changeErr = e;
    return {
      change,
      changeErr,
    };
  }
};

const addTendermintService = (jobLayout, isSingleHost, validatorSettings) => async (n) => {
  const {
    name,
    cat,
    network,
    ports: {
      http_p2p: httpP2P,
      http_rpc: httpRPC,
    },
  } = jobLayout;
  const {
    nodeRegion,
    nodeAddress,
  } = n;
  const validatorAddresses = Util.getValidatorAddress(validatorSettings, name, network);
  const svcName = Util.getServiceName(name, isSingleHost, nodeRegion);
  // Basic Checks
  const httpRPCAlive = {
    Name: 'http-rpc-alive',
    Notes: 'Checks that Tendermint RPC Server is running',
    HTTP: `http://${nodeAddress}:${httpRPC}/status`,
    Method: 'GET',
    Interval: '300s',
    ServiceID: svcName,
    Status: 'critical',
  };

  const httpP2PAlive = {
    Name: 'http-p2p-alive',
    Notes: 'Checks that Tendermint P2P Server is running',
    TCP: `${nodeAddress}:${httpP2P}`,
    Interval: '300s',
    ServiceID: svcName,
    Status: 'critical',
  };
  // Advanced Checks
  const tmMissedBlocks = isSingleHost ? validatorAddresses.map((v) => ({
    Name: Util.getMissedBlockName(v.name),
    CheckID: Util.getMissedBlockCheckId(svcName, v.name),
    Notes: `Tally for monitoring missed blocks threshold ${v.address}`,
    TTL: '300s',
    ServiceID: svcName,
    Status: 'critical',
  })) : {
    Name: CHECK_NAMES.TM_MISSED_BLOCK,
    Notes: 'Tally for monitoring missed blocks threshold',
    TTL: '300s',
    ServiceID: svcName,
    Status: 'critical',
  };
  const tmLateBlock = {
    Name: CHECK_NAMES.TM_LATE_BLOCK_TIME,
    Notes: 'Tally for late block time threshold',
    TTL: '300s',
    ServiceID: svcName,
    Status: 'critical',
  };
  const tmPeerCount = {
    Name: CHECK_NAMES.TM_PEER_COUNT,
    Notes: 'Tally for peer count threshold',
    TTL: '300s',
    ServiceID: svcName,
    Status: 'critical',
  };
  // Sample Service Definition / Payload
  const svcDef = {
    ID: svcName,
    Name: svcName,
    Address: nodeAddress, // Set to the local agent's address
    Port: httpP2P,
    Meta: {
      'node-project': 'blockchain-client',
      'node-project-cat': cat,
      'node-project-name': name,
      'node-project-network': network,
    },
    Checks: [
      httpRPCAlive,
      httpP2PAlive,
      ...tmMissedBlocks,
      tmLateBlock,
      tmPeerCount,
    ],
  };
  await n.createService(svcDef);
};

const addService = (jobLayout, isSingleHost, validatorSettings) => async (n) => {
  const {
    nodeName,
    nodeRegion,
    nodeAddress,
    nodeServiceList,
  } = n;
  logger.info(`Current service list: ${JSON.stringify(nodeServiceList)}`);
  const {
    name,
  } = jobLayout;
  const exclRegions = jobLayout.region.excl;
  const svcName = Util.getServiceName(name, isSingleHost, nodeRegion);
  if (exclRegions.includes(nodeRegion) || nodeServiceList.indexOf(svcName) > -1) return 0;
  logger.info(`Attempting to register service ${jobLayout.canonKey} on ${nodeName} - ${nodeRegion} [${nodeAddress}]`);
  const { cat } = jobLayout;
  if (cat === 'tendermint') {
    await addTendermintService(jobLayout, isSingleHost, validatorSettings)(n);
    logger.info(`Service ${jobLayout.canonKey} registered successfully on ${nodeName} - ${nodeRegion} [${nodeAddress}]`);
    return 0;
  }
  return 1;
};

const removeService = (jobLayout, isSingleHost) => async (n) => {
  const {
    nodeName,
    nodeRegion,
    nodeAddress,
    nodeServiceList,
  } = n;
  const {
    name,
  } = jobLayout;
  const svcName = Util.getServiceName(name, isSingleHost, nodeRegion);
  if (nodeServiceList.indexOf(svcName) === -1) return 0;
  logger.info(`Attempting to de-register service ${jobLayout.canonKey} on ${nodeName} - ${nodeRegion} [${nodeAddress}]`);
  await n.destroyService(svcName);
  logger.info(`Service ${jobLayout.canonKey} de-registered successfully on ${nodeName} - ${nodeRegion} [${nodeAddress}]`);
  return 0;
};

const updateServices = async (nodeList, jobLayout, isSingleHost, validatorSettings) => {
  const { region: { incl: inclFilter, excl: exclFilter } } = jobLayout;
  // Register Services on qualifed nodes
  const inclNodeList = nodeList.filter((n) => inclFilter.indexOf(n.nodeRegion) > -1);
  const serviceAdder = addService(jobLayout, isSingleHost, validatorSettings);
  logger.info(`[u] Add services on ${inclNodeList.length} nodes`);
  await Promise.all(inclNodeList.map(serviceAdder));
  // De-register Services on un-qualifed nodes
  const exclNodeList = nodeList.filter((n) => exclFilter.indexOf(n.nodeRegion) > -1);
  const serviceRemover = removeService(jobLayout, isSingleHost);
  logger.info(`[u] Remove services on ${exclNodeList.length} nodes`);
  await Promise.all(exclNodeList.map(serviceRemover));
};

const addJob = (nodeList, schd, bend) => async (task) => {
  const { jobDef } = task;
  try {
    // Create Job
    await schd.job.create(jobDef.ID, jobDef, {});
  } catch (e) {
    logger.error(`Caught error when creating job ${jobDef.ID}`);
    console.log(e);
    return 1;
  }
  // Get Job Affinity, to get list of qualified nodes for allocation
  // After Job Create Success
  const jobLayout = schd.Job.layoutFromDef(jobDef);
  // Update Service Mesh
  await updateServices(nodeList, jobLayout);
  return 0;
};

const updateJob = (nodeList, schd, bend) => async (task) => {
  const { jobDef } = task;
  try {
    // Create Job
    await schd.job.update(jobDef.ID, jobDef, {});
  } catch (e) {
    logger.error(`Caught error when updating job ${jobDef.ID}`);
    console.log(e);
    return 1;
  }
  // After Job Create Success
  const jobLayout = schd.Job.layoutFromDef(jobDef);
  // Update Service Mesh
  await updateServices(nodeList, jobLayout);
  return 0;
};

const addTerraBackend = async (nodeHost, consulPort) => {
  const bend = Backend(nodeHost, consulPort).Api;
  const lcdList = process.env.TERRA_LCD.split(',');
  await Promise.all(lcdList.map(async (lcd) => {
    const [host, port] = lcd.split(':');
    await LcdBackend.addService(bend)('terra', host, port);
    return LcdBackend.addCheck(bend)('terra', host, port);
  }));
  return TerraOracle.addCheck(bend);
};

const syncProd = async (nodeHost, consulPort, prodConfigFile) => {
  await addTerraBackend(nodeHost, consulPort);
  logger.info('Retrieving cluster info...');
  const serverConfig = await Util.getProductionFileConfig(prodConfigFile);
  const { nodeList, bend } = await Core.getClusterProd(nodeHost, consulPort, serverConfig);
  const validatorSettings = await KVStore.getValidatorAddressSettings(bend)(prodConfigFile);
  const projects = serverConfig.nodes.reduce((acc, node) => {
    node.projects.forEach((proj) => {
      const existingProj = acc.find((e) => e.name === proj.name && e.network === proj.network
        && proj.ports.http_p2p === e.ports.http_p2p && proj.ports.http_rpc === e.ports.http_rpc);
      if (existingProj) {
        existingProj.region.incl.push(node.region);
      } else {
        acc.push({
          name: proj.name,
          network: proj.network,
          cat: 'tendermint',
          region: {
            incl: [node.region],
            excl: serverConfig.deRegisterServices[proj.name] || [],
          },
          ports: proj.ports,
        });
      }
    });
    return acc;
  }, []);
  const isSingleHost = true;
  return Promise.all(projects.map((p) => updateServices(
    nodeList, p, isSingleHost, validatorSettings,
  )));
};

const sync = async (
  nodeHost,
  nomadPort,
  consulPort,
  configDir,
  {
    nomadToken,
    consulToken,
  },
  production,
  prodConfigFile,
) => {
  if (production) {
    return syncProd(nodeHost, consulPort, prodConfigFile);
  }
  logger.info('Retrieving cluster info...');
  const { nodeList, schd, bend } = await Core.getCluster(nodeHost, nomadPort, consulPort);
  logger.info('Start Syncing Jobs');
  const fileList = await fs.readdirAsync(configDir);
  const jobFileList = fileList.filter((f) => f.endsWith('.hcl')).map((f) => path.join(configDir, f));
  const jobParser = parseJobFile(schd);
  const jobTasks = await Promise.all(jobFileList.map(jobParser));
  const addJobTasks = jobTasks.filter((j) => j.change === 'Added');
  logger.info(`Jobs to Add: ${addJobTasks.length}`);
  const adder = addJob(nodeList, schd, bend);
  await Promise.all(addJobTasks.map(adder));

  const updateJobTasks = jobTasks.filter((j) => j.change === 'Edited');
  logger.info(`Jobs to Update: ${updateJobTasks.length}`);
  const updater = updateJob(nodeList, schd, bend);
  await Promise.all(updateJobTasks.map(updater));

  const failedJobTasks = jobTasks.filter((j) => j.changeErr !== null);
  return logger.info(`Jobs that failed to parse: ${failedJobTasks.length}`);
};

export default sync;
