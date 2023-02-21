import pino from 'pino';
import Constant from './constant';
import Util from '../common/util';
import Config from '../config';
import TendermintApi from '../plugins/chains/tendermint';
import {
  saveBlockCommits,
  savePeerCounts,
  saveBlockHeights,
} from './influx-store';

const kvStoreKeys = Constant.KV_STORE_KEY_TYPES;
const logger = pino().child({
  module: 'kv-store',
});

const generateConsulKey = ({
  type,
  blockHeight,
  metaData: {
    projectName,
    networkName,
    region,
    validatorAddress,
  },
}) => {
  const nodeStatusPrefix = `projects/nodes/${projectName}/${networkName}/${region}`;
  const globalStatusPrefix = `projects/global/${projectName}/${networkName}`;
  switch (type) {
    case kvStoreKeys.NODE_STATUS_BLOCK_HEIGHT:
      return `${nodeStatusPrefix}/status/block-height`;
    case kvStoreKeys.NODE_STATUS_BLOCK_TIME:
      return `${nodeStatusPrefix}/status/block-time`;
    case kvStoreKeys.NODE_STATUS_PEERS_TOTAL:
      return `${nodeStatusPrefix}/status/peers-total`;
    case kvStoreKeys.NODE_STATUS_PEERS_INBOUND:
      return `${nodeStatusPrefix}/status/peers-inbound`;
    case kvStoreKeys.NODE_STATUS_PEERS_OUTBOUND:
      return `${nodeStatusPrefix}/status/peers-outbound`;
    case kvStoreKeys.NODE_STATUS_CATCHING_UP:
      return `${nodeStatusPrefix}/status/catching-up`;
    case kvStoreKeys.GLOBAL_STATUS_BLOCK_HEIGHT:
      return `${globalStatusPrefix}/status/block-height`;
    case kvStoreKeys.GLOBAL_STATUS_BLOCK_TIME:
      return `${globalStatusPrefix}/status/block-time`;
    case kvStoreKeys.GLOBAL_STATUS_PEERS_TOTAL:
      return `${globalStatusPrefix}/status/peers-total`;
    case kvStoreKeys.GLOBAL_STATUS_PEERS_INBOUND:
      return `${globalStatusPrefix}/status/peers-inbound`;
    case kvStoreKeys.GLOBAL_STATUS_PEERS_OUTBOUND:
      return `${globalStatusPrefix}/status/peers-outbound`;
    case kvStoreKeys.GLOBAL_COMMIT_BY_BLOCK_HEIGHT:
      return `${globalStatusPrefix}/commits/${blockHeight}/${validatorAddress}`;
    case kvStoreKeys.GLOBAL_STATUS_CATCHING_UP:
      return `${globalStatusPrefix}/status/catching-up`;
    default:
      return '';
  }
};

const upsertMultipleKeys = (Backend) => async (data) => {
  const chunks = Util.splitArray(data, Config.maxKVStoreTransactions);
  const promises = chunks.map((ch) => {
    const payload = ch.map((d) => ({
      KV: {
        Verb: 'set',
        Key: d.key,
        Value: Buffer.from(d.value.toString()).toString('base64'),
      },
    }));
    return Backend.kv.txn(payload);
  });
  return Promise.all(promises);
};

const deleteMultipleKeys = (Backend) => async (data) => {
  const chunks = Util.splitArray(data, Config.maxKVStoreTransactions);
  const promises = chunks.map((ch) => {
    const payload = ch.map((d) => ({
      KV: {
        Verb: 'delete',
        Key: d,
      },
    }));
    return Backend.kv.txn(payload);
  });
  return Promise.all(promises);
};

const updateNodeStatuses = (Backend) => async ({
  nodeState,
  metaData,
}) => {
  const statuses = [{
    key: kvStoreKeys.NODE_STATUS_BLOCK_HEIGHT,
    value: nodeState.block_height,
  },
  {
    key: kvStoreKeys.NODE_STATUS_BLOCK_TIME,
    value: nodeState.block_time,
  },
  {
    key: kvStoreKeys.NODE_STATUS_PEERS_INBOUND,
    value: nodeState.inbound_peers,
  },
  {
    key: kvStoreKeys.NODE_STATUS_PEERS_OUTBOUND,
    value: nodeState.outbound_peers,
  },
  {
    key: kvStoreKeys.NODE_STATUS_PEERS_TOTAL,
    value: nodeState.total_peers,
  },
  {
    key: kvStoreKeys.NODE_STATUS_CATCHING_UP,
    value: nodeState.catching_up ? 1 : 0,
  },
  ];

  // save peer counts into influx db
  savePeerCounts({
    network: metaData.networkName,
    project: metaData.projectName,
    region: metaData.region,
    inbound: nodeState.inbound_peers,
    outbound: nodeState.outbound_peers,
    total: nodeState.total_peers,
  });
  // save block height into influx db
  saveBlockHeights({
    network: metaData.networkName,
    project: metaData.projectName,
    region: metaData.region,
    height: nodeState.block_height,
    time: nodeState.block_time * 1000,
  });

  const keyValues = statuses.map((status) => ({
    key: generateConsulKey({
      type: status.key,
      metaData,
    }),
    value: status.value,
  }));
  await upsertMultipleKeys(Backend)(keyValues);
  return keyValues.reduce((acc, row) => {
    acc[row.key] = {
      type: 'upsert',
      value: row.value,
    };
    return acc;
  }, {});
};

const updateGlobalStatuses = (Backend) => async ({
  nodeState,
  metaData,
}) => {
  const statuses = [{
    key: kvStoreKeys.GLOBAL_STATUS_BLOCK_HEIGHT,
    value: nodeState.block_height,
  },
  {
    key: kvStoreKeys.GLOBAL_STATUS_BLOCK_TIME,
    value: nodeState.block_time,
  },
  {
    key: kvStoreKeys.GLOBAL_STATUS_PEERS_INBOUND,
    value: nodeState.inbound_peers,
  },
  {
    key: kvStoreKeys.GLOBAL_STATUS_PEERS_OUTBOUND,
    value: nodeState.outbound_peers,
  },
  {
    key: kvStoreKeys.GLOBAL_STATUS_PEERS_TOTAL,
    value: nodeState.total_peers,
  },
  {
    key: kvStoreKeys.GLOBAL_STATUS_CATCHING_UP,
    value: nodeState.catching_up ? 1 : 0,
  },
  ];
  const keyValues = statuses.map((status) => ({
    key: generateConsulKey({
      type: status.key,
      metaData,
    }),
    value: status.value,
  }));
  await upsertMultipleKeys(Backend)(keyValues);
  return keyValues.reduce((acc, row) => {
    acc[row.key] = {
      type: 'upsert',
      value: row.value,
    };
    return acc;
  }, {});
};

const getOldKeys = (Backend) => async ({
  keyType,
  minBlockHeight,
  metaData,
}) => {
  try {
    const keys = await Backend.kv.list(`projects/global/${metaData.projectName}/${metaData.networkName}/commits`);
    return keys.filter((key) => {
      const arr = key.split('/');
      const blockHeight = arr[arr.length - 2];
      if (+blockHeight < +minBlockHeight) {
        return true;
      }
      return false;
    }).map((key) => {
      const arr = key.split('/');
      const blockHeight = +arr[arr.length - 2];
      return generateConsulKey({
        type: keyType,
        metaData,
        blockHeight,
      });
    });
  } catch (e) {
    return [];
  }
};

const updateAndRemoveKeys = (Backend) => async ({
  keyType,
  blocks,
  metaData,
  minBlockHeight,
}) => {
  const removeKeys = await getOldKeys(Backend)({ keyType, metaData, minBlockHeight });
  const upsertKeys = blocks.map((blk) => {
    const key = generateConsulKey({
      type: keyType,
      metaData,
      blockHeight: blk.key,
    });
    return {
      key,
      value: blk.value,
    };
  });
  await Promise.all([
    upsertMultipleKeys(Backend)(upsertKeys),
    deleteMultipleKeys(Backend)(removeKeys),
  ]);
  const upsertResult = upsertKeys.reduce((acc, row) => {
    acc[row.key] = {
      type: 'upsert',
      value: row.value,
    };
    return acc;
  }, {});
  const removeResult = removeKeys.reduce((acc, key) => {
    acc[key] = {
      type: 'del',
    };
    return acc;
  }, {});
  return {
    ...upsertResult,
    ...removeResult,
  };
};

const getValueByKey = (Backend) => async (keyType, metaData) => {
  const key = generateConsulKey({
    type: keyType,
    metaData,
  });
  return Backend.kv.getValue(key);
};

const updateBlockCommitByValidator = (Backend) => async ({
  nodeState, metaData, blocks, validatorAddress, minBlockHeight,
}) => {
  const blockCommits = blocks.filter(b => b).map((blk) => {
    const block = blk.block_meta || blk.block;
    const blockHeight = block.header.height - 1; // pre-commit of previous block
    const blockPreCommits = blk.block.last_commit.precommits || blk.block.last_commit.signatures;
    const validatorAddressInCommits = blockPreCommits
      .find((c) => c && c.validator_address === validatorAddress);
    const value = validatorAddressInCommits ? 1 : 0;
    return {
      key: blockHeight,
      value,
      time: block.header.time,
    };
  });
  const validatorCommit = nodeState.validator_commits
    .find((vc) => vc.address === validatorAddress);
  const commitBlockValue = validatorCommit && validatorCommit.commit ? 1 : 0;
  blockCommits.push({
    key: nodeState.block_height - 1,
    value: commitBlockValue,
    time: nodeState.block_time * 1000,
  });
  // save to influxdb
  saveBlockCommits({
    network: metaData.networkName,
    project: metaData.projectName,
    blockCommits: blockCommits.map((bc) => ({
      height: bc.key,
      missed: !bc.value,
      time: new Date(bc.time).valueOf(),
    })),
  });
  const res = await Promise.all([
    updateAndRemoveKeys(Backend)({
      keyType: kvStoreKeys.GLOBAL_COMMIT_BY_BLOCK_HEIGHT,
      blocks: blockCommits,
      metaData: { ...metaData, validatorAddress },
      minBlockHeight,
    }),
  ]);
  return res.filter((r) => r).reduce((acc, r) => ({
    ...acc,
    ...r,
  }), {});
};

const updateBlockCommit = (Backend) => async ({
  nodeState,
  metaData,
}) => {
  const currentBlockHeight = nodeState.block_height;
  const previousBlockHeightKey = generateConsulKey({
    type: kvStoreKeys.GLOBAL_STATUS_BLOCK_HEIGHT,
    metaData,
  });
  const previousBlockHeight = await Backend.kv.getValue(previousBlockHeightKey);
  // eslint-disable-next-line eqeqeq
  if (previousBlockHeight && previousBlockHeight == currentBlockHeight) {
    return null;
  }
  const limitFromBlockHeight = currentBlockHeight - 1 - Config.numberOfLastCommits;
  const fromBlk = previousBlockHeight > 0
    ? Math.max(+previousBlockHeight + 1, limitFromBlockHeight) : limitFromBlockHeight;
  const blocks = await TendermintApi.getBlocks(
    metaData.host, metaData.port, Config.requestTimeoutMs,
  )(fromBlk, currentBlockHeight - 1); // avoid duplicate latest block height call
  const { validatorAddresses } = metaData;
  const res = await Promise.all(validatorAddresses.map((v) => updateBlockCommitByValidator(
    Backend,
  )({
    nodeState,
    metaData,
    blocks,
    validatorAddress: v.address,
    minBlockHeight: limitFromBlockHeight - 10,
  })));
  return res.filter((r) => r).reduce((acc, r) => ({
    ...acc,
    ...r,
  }), {});
};

const update = (Backend) => async ({
  nodeState,
  nodeMeta,
}) => {
  const projectName = Util.getProjectName(nodeMeta.projectName);
  const metaData = {
    ...nodeMeta,
    projectName,
  };
  let updateBC = [];
  if (nodeState.updateGlobal) {
    updateBC = await updateBlockCommit(Backend)({
      nodeState,
      metaData,
    });
  }
  const result = await Promise.all([
    updateNodeStatuses(Backend)({
      nodeState,
      metaData,
    }),
    nodeState.updateGlobal && updateGlobalStatuses(Backend)({
      nodeState,
      metaData,
    }),
  ]);
  const finalResult = result.concat(updateBC);
  return finalResult.filter((r) => r).reduce((acc, r) => ({
    ...acc,
    ...r,
  }), {});
};


const getAllByKeyPrefix = (Backend) => async (keyPrefix) => {
  const payload = [{
    KV: {
      Verb: 'get-tree',
      Key: keyPrefix,
    },
  }];
  try {
    const response = await Backend.kv.txn(payload);
    if (response.Errors) {
      logger.error(`getAllByKeyPrefix ${keyPrefix}`, response.Errors);
      return [];
    }
    return response.Results.map((r) => ({
      key: r.KV.Key,
      value: r.KV.Value && Buffer.from(r.KV.Value, 'base64').toString('utf-8').replace(/"/g, ''),
    }));
  } catch (e) {
    logger.error(`getAllByKeyPrefix ${keyPrefix}`, e && e.toString());
    return [];
  }
};

const getBlockCommitKeys = (Backend) => async ({
  from,
  to,
  metaData,
}) => {
  const payload = [
    {
      KV: {
        Verb: 'get-tree',
        Key: `projects/global/${metaData.projectName}/${metaData.networkName}/commits/`,
      },
    },
  ];
  try {
    const response = await Backend.kv.txn(payload);
    if (response.Errors) {
      logger.error(`getBlockCommitKeys ${from}-${to}`, response.Errors);
      return [];
    }
    const commits = (response.Results || []).map((r) => {
      const arr = r.KV.Key.split('/');
      const blockHeight = arr[arr.length - 2];
      const address = arr[arr.length - 1];
      return {
        key: +blockHeight,
        address,
        value: r.KV.Value && Buffer.from(r.KV.Value, 'base64').toString('utf-8').replace(/"/g, ''),
      };
    }).filter((c) => c.address === metaData.validatorAddress && c.key >= from && c.key < to);
    commits.sort((e1, e2) => (e1.key < e2.key ? 1 : -1));
    return commits;
  } catch (e) {
    logger.error(`getBlockCommitKeys ${from}-${to}`, e && e.toString());
    return [];
  }
};

const getThresholdSettings = (Backend) => async ({
  production,
  prodConfigFile,
}) => {
  const {
    defaultSettings: defaultSettingInFile,
    customSettings: customSettingInFile,
  } = await Util.getHealthCheckConfigs(production, prodConfigFile);
  const [defaultSettingStr, customSettingsStr] = await Promise.all([
    Backend.kv.getValue(Config.thresholdDefaultSettingsKey),
    Backend.kv.getValue(Config.thresholdCustomSettingsKey),
  ]);
  const defaultSettingsArr = (defaultSettingStr || '').split(',');
  const defaultSettings = defaultSettingsArr.filter((s) => s).reduce((acc, s) => {
    const [type, warning, critical] = s.split(':');
    acc[type] = {
      warning: +warning,
      critical: +critical,
    };
    return acc;
  }, {});

  const customSettingsArr = (customSettingsStr || '').split(',');
  const customSettings = customSettingsArr.filter((s) => s).reduce((acc, s) => {
    const [project, type, warning, critical] = s.split(':');
    if (!acc[project]) {
      acc[project] = {};
    }
    acc[project][type] = {
      warning: +warning,
      critical: +critical,
    };
    return acc;
  }, {});
  const finalDefaultSettings = Object.assign(defaultSettingInFile, defaultSettings);
  const finalCustomSettings = Object.assign(customSettingInFile, customSettings);
  return {
    defaultSettings: finalDefaultSettings,
    customSettings: finalCustomSettings,
  };
};

const getValidatorSettingsByProject = (Backend) => async (project, network) => {
  const fullProjectName = Util.getProjectName(project);
  const validatorStr = await Backend.kv
    .getValue(`${Config.validatorAddressesPrefix}/${fullProjectName}/${network}`) || '';
  const validatorAddresses = validatorStr.split(',').filter((v) => v).reduce((acc, v) => {
    const [name, address] = v.split(':');
    return acc.concat({ name, address });
  }, []);
  if (validatorAddresses.length > 0) {
    return {
      project: fullProjectName,
      network,
      validators: validatorAddresses,
    };
  }
  const defaultValidatorAddresses = Config.projectSettings[fullProjectName]
    && Config.projectSettings[fullProjectName][network];
  return {
    project: fullProjectName,
    network,
    validators: defaultValidatorAddresses,
  };
};

const getValidatorAddressSettings = (Backend) => async (prodConfigFile) => {
  const projectList = await Util.getProjectList(prodConfigFile);
  const validatorAddressess = await Promise.all(projectList
    .map((e) => getValidatorSettingsByProject(Backend)(e.project, e.network)));
  return validatorAddressess;
};

export default {
  update,
  getValueByKey,
  generateConsulKey,
  getAllByKeyPrefix,
  getBlockCommitKeys,
  getThresholdSettings,
  getValidatorAddressSettings,
  deleteMultipleKeys,
};
