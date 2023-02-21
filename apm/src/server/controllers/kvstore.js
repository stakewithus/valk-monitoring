import WebSocket from '../websocket';
import StatusController from './status';
import Constant from '../../monit/constant';
import KVStore from '../../monit/kv-store';
import Config from '../../config';
import Util from '../../common/util';
import Core from '../../core';

const getKVStoreValueByKey = (rawData) => rawData.reduce((acc, data) => {
  const value = Buffer.from(data.Value, 'base64').toString('utf-8');
  acc[data.Key] = value;
  return acc;
}, {});

const generateBroadcastData = async (kvStoreData, validatorSettings) => {
  const keys = Object.keys(kvStoreData);
  const projectAndNetworkList = StatusController.getProjectAndNetworkList(keys);
  const keyTypes = [
    Constant.KV_STORE_KEY_TYPES.GLOBAL_STATUS_BLOCK_HEIGHT,
    Constant.KV_STORE_KEY_TYPES.GLOBAL_STATUS_BLOCK_TIME,
    Constant.KV_STORE_KEY_TYPES.GLOBAL_STATUS_PEERS_INBOUND,
    Constant.KV_STORE_KEY_TYPES.GLOBAL_STATUS_PEERS_OUTBOUND,
    Constant.KV_STORE_KEY_TYPES.GLOBAL_STATUS_PEERS_TOTAL,
    Constant.KV_STORE_KEY_TYPES.GLOBAL_STATUS_CATCHING_UP,
  ];
  return Promise.all(projectAndNetworkList.map(async (row) => {
    const validatorAddresses = await Util.getValidatorAddress(validatorSettings,
      row.project, row.network);
    const metaData = { projectName: row.project, networkName: row.network };
    const [blockHeight, blockTime, peersInbound, peersOutbound, peersTotal, catchingUp] = keyTypes
      .map((keyType) => kvStoreData[KVStore.generateConsulKey({ type: keyType, metaData })]);
    let blockCommits = [];
    if (blockHeight > 1) {
      const minimumBlock = Math.max(blockHeight - 50, 1);
      blockCommits = validatorAddresses.map((v) => {
        const commits = [];
        for (let i = blockHeight - 1; i >= minimumBlock; i -= 1) {
          commits.push(kvStoreData[KVStore.generateConsulKey({
            type: Constant.KV_STORE_KEY_TYPES.GLOBAL_COMMIT_BY_BLOCK_HEIGHT,
            blockHeight: i,
            metaData: { ...metaData, validatorAddress: v.address },
          })]);
        }
        return {
          name: v.name,
          values: commits.filter((c) => c).map((value) => !!+value),
        };
      });
    }
    return {
      ...metaData,
      catchingUp: !!+catchingUp,
      blockTime,
      blockHeight,
      peersInbound,
      peersOutbound,
      peersTotal,
      commits: blockCommits,
    };
  }));
};

const watch = (req, res) => async ({ wss, Backend, prodConfigFile }) => {
  if (!req.body || req.body.length === 0) {
    return res;
  }
  const KVStoreData = getKVStoreValueByKey(req.body);
  const validatorSettings = await KVStore.getValidatorAddressSettings(Backend)(prodConfigFile);
  const formattedData = await generateBroadcastData(KVStoreData, validatorSettings);
  WebSocket.broadcast(wss)('GLOBAL_STATUS_UPDATE', formattedData);
  res.write('ok');
  return res;
};

const listNodes = (req, res) => async ({ Backend }) => {
  const nodes = await Backend.kv.getValue(Config.mutedNodesKey) || '';
  res.writeHead(200, { 'content-type': 'application/json' });
  res.write(nodes);
  return res;
};

const updateNodes = ({ query }, res) => async ({ Backend }) => {
  try {
    await Backend.kv.upsert(Config.mutedNodesKey, query.get('nodes'));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(query.get('nodes'));
    return res;
  } catch (e) {
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const composeDefaultSettings = (updatingSettings) => {
  const savedStr = Object.keys(updatingSettings).reduce((acc, s) => {
    const str = `${s}:${updatingSettings[s].warning}:${updatingSettings[s].critical}`;
    if (acc) {
      return `${acc},${str}`;
    }
    return str;
  }, '');
  return savedStr;
};

const composeCustomSettings = (updatingSettings) => {
  const savedStr = Object.keys(updatingSettings).reduce((acc, proj) => {
    const str = Object.keys(updatingSettings[proj]).reduce((acc2, s) => {
      const setting = updatingSettings[proj][s];
      const str2 = `${proj}:${s}:${setting.warning}:${setting.critical}`;
      if (acc2) {
        return `${acc2},${str2}`;
      }
      return str2;
    }, '');
    if (acc) {
      return `${acc},${str}`;
    }
    return str;
  }, '');
  return savedStr;
};

const updateThresholdSettings = ({ body }, res) => async ({
  Backend, prodConfigFile,
}) => {
  try {
    const validatorAddresses = await KVStore
      .getValidatorAddressSettings(Backend)(prodConfigFile);
    const { defaultSettings: updateDefaultSettings, customSettings: updateCustomSettings } = body;
    const validTypes = Object.keys(Config.thresholdLimits);
    const validProjects = validatorAddresses.map((v) => v.project);
    const areSettingsValid = updateDefaultSettings && Object.keys(updateDefaultSettings)
      .every((s) => validTypes.includes(s)
        && +updateDefaultSettings[s].warning > 0
        && +updateDefaultSettings[s].critical > 0);
    const areCustomSettingsValid = Object.keys(updateCustomSettings || [])
      .every((proj) => validProjects.includes(Util.getProjectName(proj))
        && Object.keys(updateCustomSettings[proj]).every((s) => validTypes.includes(s)
          && +updateCustomSettings[proj][s].warning > 0
          && +updateCustomSettings[proj][s].critical > 0));
    if (!areSettingsValid || !areCustomSettingsValid) {
      res.writeHead(400);
      res.write('Invalid payload');
      return res;
    }
    const defaultSettingsStr = composeDefaultSettings(updateDefaultSettings);
    const customSettingsStr = composeCustomSettings(updateCustomSettings);
    await Promise.all([
      Backend.kv.upsert(Config.thresholdDefaultSettingsKey, defaultSettingsStr),
      Backend.kv.upsert(Config.thresholdCustomSettingsKey, customSettingsStr),
    ]);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify({ default: defaultSettingsStr, custom: customSettingsStr }));
    return res;
  } catch (e) {
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const getThresholdSettings = (req, res) => async ({ Backend, production, prodConfigFile }) => {
  try {
    const settings = await KVStore.getThresholdSettings(Backend)({ production, prodConfigFile });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify(settings));
    return res;
  } catch (e) {
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const getValidatorAddresses = (req, res) => async ({ Backend, prodConfigFile }) => {
  try {
    const validatorAddressess = await KVStore.getValidatorAddressSettings(Backend)(prodConfigFile);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify(validatorAddressess));
    return res;
  } catch (e) {
    console.log(e);
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const addNewChecks = (Backend) => async (nodeList, serverConfig, project, network, validator) => {
  const projectName = Util.getProjectNameSimple(project);
  const deregisteredRegions = serverConfig.deRegisterServices[projectName] || [];
  const nodes = nodeList
    .filter((node) => !deregisteredRegions.includes(projectName)
      && node.projects.some((p) => p.name === projectName && p.network === network))
    .map((node) => ({
      region: node.nodeRegion,
      project: projectName,
      network,
    }));
  await Promise.all(nodes.map(async (node) => {
    const svcName = Util.getServiceName(node.project, true, node.region);
    const checkPayload = {
      Name: Util.getMissedBlockName(validator.name),
      ID: Util.getMissedBlockCheckId(svcName, validator.name),
      Notes: `Tally for monitoring missed blocks threshold ${validator.address}`,
      TTL: '20s',
      ServiceID: svcName,
      Status: 'critical',
    };
    const res = await Backend.agent.check.register(checkPayload);
    return res;
  }));
};

const removeChecks = (Backend) => async (nodeList, serverConfig, project, network, validator) => {
  const projectName = Util.getProjectNameSimple(project);
  const deregisteredRegions = serverConfig.deRegisterServices[projectName] || [];
  const nodes = nodeList
    .filter((node) => !deregisteredRegions.includes(projectName)
      && node.projects.some((p) => p.name === projectName && p.network === network))
    .map((node) => ({
      region: node.nodeRegion,
      project: projectName,
      network,
    }));
  await Promise.all(nodes.map(async (node) => {
    const svcName = Util.getServiceName(node.project, true, node.region);
    const checkId = Util.getMissedBlockCheckId(svcName, validator.name);
    return Backend.agent.check.destroy(checkId);
  }));
};

const updateValidatorAddressKVStore = (Backend) => async (validatorAddresses, project, network) => {
  const validatorStr = validatorAddresses.reduce((acc, v) => {
    const str = `${v.name}:${v.address}`;
    if (acc) {
      return `${acc},${str}`;
    }
    return str;
  }, '');
  return Backend.kv.upsert(`${Config.validatorAddressesPrefix}/${project}/${network}`,
    validatorStr);
};

const updateValidatorAddress = (req, res) => async ({
  Backend,
  node: nodeIp,
  nomadPort,
  consulPort,
  production,
  prodConfigFile,
}) => {
  try {
    const {
      body: {
        network, project, validator,
      },
    } = req;
    const isPayloadValid = network && project
      && validator && validator.address && validator.address.length === 40 && validator.name;
    if (!isPayloadValid) {
      res.writeHead(400);
      res.write('Invalid payload');
      return res;
    }
    const validatorSettings = await KVStore.getValidatorAddressSettings(Backend)(prodConfigFile);
    const validatorAddresses = Util.getValidatorAddress(validatorSettings, project, network);
    const doesValidatorExist = validatorAddresses
      .find((v) => v.address === validator.address || v.name === validator.name);
    if (doesValidatorExist) {
      res.writeHead(400);
      res.write('Validator name or address exists!');
      return res;
    }
    const newValidatorAddress = validatorAddresses.concat({
      name: validator.name,
      address: validator.address,
    });
    await updateValidatorAddressKVStore(Backend)(newValidatorAddress, project, network);
    const {
      nodeList,
      serverConfig,
    } = await Core.getNodeInfos({
      nodeIp,
      nomadPort,
      consulPort,
      production,
      prodConfigFile,
    });

    await addNewChecks(Backend)(nodeList, serverConfig, project, network, validator);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify({
      project, network, validators: newValidatorAddress,
    }));
    return res;
  } catch (e) {
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const removeValidatorAddress = (req, res) => async ({
  Backend,
  node: nodeIp,
  nomadPort,
  consulPort,
  production,
  prodConfigFile,
}) => {
  try {
    const {
      body: {
        network, project, validator,
      },
    } = req;
    const isPayloadValid = network && project
      && validator && validator.address && validator.address.length === 40 && validator.name;
    if (!isPayloadValid) {
      res.writeHead(400);
      res.write('Invalid payload');
      return res;
    }
    const validatorSettings = await KVStore.getValidatorAddressSettings(Backend)(prodConfigFile);
    const validatorAddresses = Util.getValidatorAddress(validatorSettings, project, network);
    const matchValidatorIndex = validatorAddresses
      .findIndex((v) => v.address === validator.address && v.name === validator.name);
    if (matchValidatorIndex === -1) {
      res.writeHead(400);
      res.write('Validator not found!');
      return res;
    }
    validatorAddresses.splice(matchValidatorIndex, 1);
    await updateValidatorAddressKVStore(Backend)(validatorAddresses, project, network);

    const {
      nodeList,
      serverConfig,
    } = await Core.getNodeInfos({
      nodeIp,
      nomadPort,
      consulPort,
      production,
      prodConfigFile,
    });

    await removeChecks(Backend)(nodeList, serverConfig, project, network, validator);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify({
      project, network, validators: validatorAddresses,
    }));
    return res;
  } catch (e) {
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

export default {
  watch,
  listNodes,
  updateNodes,
  updateThresholdSettings,
  getThresholdSettings,
  getValidatorAddresses,
  updateValidatorAddress,
  removeValidatorAddress,
};
