import Constant from './constant';
import Config from '../config';
import KVStore from './kv-store';
import HealthCheckCounter from './health-check-counter';
import Util from '../common/util';
import {
  saveHealthChecks,
} from './influx-store';

const { CHECK_NAMES } = Constant;

const getLateBlockTimeStatus = (nodeState, healthCheckConfigs) => {
  const currentTime = Math.floor(Date.now() / 1000);
  const delta = currentTime - nodeState.block_time;
  let status = Constant.HEALTH_CHECK_STATUS.PASS;
  if (delta > healthCheckConfigs.lastBlockTime.critical) {
    status = Constant.HEALTH_CHECK_STATUS.CRITICAL;
  } else if (delta > healthCheckConfigs.lastBlockTime.warning) {
    status = Constant.HEALTH_CHECK_STATUS.WARNING;
  }
  return {
    timeDelta: delta,
    status,
  };
};

const updateHealthCheckPass = (Backend) => async (checkId, note = '') => {
  const response = await Backend.agent.check.ttlPass(checkId, note);
  return {
    checkId,
    status: Constant.HEALTH_CHECK_STATUS.PASS,
    response,
    note,
  };
};
const updateHealthCheckWarning = (Backend) => async ({
  checkId,
  note = '',
  type,
  nodeMeta = {},
  nodeState = {},
}) => {
  saveHealthChecks({
    nodeId: nodeMeta.nodeId,
    region: nodeMeta.region,
    network: nodeMeta.networkName,
    project: nodeMeta.projectName,
    host: nodeMeta.host,
    blockHeight: nodeState.block_height,
    blockTime: nodeState.block_time,
    status: Constant.HEALTH_CHECK_STATUS.WARNING,
    checkId,
    note,
    type,
  });
  const response = await Backend.agent.check.ttlWarn(checkId, note);
  return {
    checkId,
    status: Constant.HEALTH_CHECK_STATUS.WARNING,
    response,
    note,
  };
};
const updateHealthCheckCritical = (Backend) => async ({
  checkId,
  note = '',
  type,
  nodeMeta = {},
  nodeState = {},
}) => {
  saveHealthChecks({
    nodeId: nodeMeta.nodeId,
    region: nodeMeta.region,
    network: nodeMeta.networkName,
    project: nodeMeta.projectName,
    host: nodeMeta.host,
    blockHeight: nodeState.block_height,
    blockTime: nodeState.block_time,
    status: Constant.HEALTH_CHECK_STATUS.CRITICAL,
    checkId,
    note,
    type,
  });
  const response = await Backend.agent.check.ttlFail(checkId, note);
  return {
    checkId,
    status: Constant.HEALTH_CHECK_STATUS.CRITICAL,
    response,
    note,
  };
};

const updateHealthCheckConnectionError = (Backend) => async ({
  checkId,
  nodeMeta,
  checkName,
  type,
}) => {
  if (HealthCheckCounter.get(nodeMeta, checkName) < 2) {
    HealthCheckCounter.increase(nodeMeta, checkName);
    return true;
  }
  if (HealthCheckCounter.get(nodeMeta, checkName) <= 5) {
    HealthCheckCounter.increase(nodeMeta, checkName);
    return updateHealthCheckWarning(Backend)({
      checkId,
      note: Constant.NOTE_MESSAGES.DISCONNECTION_ERROR_WARNING,
      nodeMeta,
      type,
    });
  }
  return updateHealthCheckCritical(Backend)({
    checkId,
    note: Constant.NOTE_MESSAGES.DISCONNECTION_ERROR_CRITICAL,
    nodeMeta,
    type,
  });
};

const updateDefaultChecks = (Backend) => async ({
  checkId,
  nodeState,
  nodeMeta,
  checkName,
  type,
}) => {
  if (!nodeState) {
    return updateHealthCheckConnectionError(Backend)({
      checkId,
      nodeMeta,
      checkName,
      type,
    });
  }
  HealthCheckCounter.reset(nodeMeta, checkName);
  if (nodeState.catching_up) {
    const warningNote = `Node is still catch up, now at ${nodeState.block_height}`;
    return updateHealthCheckWarning(Backend)({
      checkId,
      note: warningNote,
      nodeMeta,
      nodeState,
      type,
    });
  }
  return null;
};

const updateChecks = (Backend) => async ({
  status,
  note,
  checkId,
  nodeMeta,
  nodeState,
  type,
}) => {
  let updateResponse = null;
  switch (status) {
    case Constant.HEALTH_CHECK_STATUS.PASS:
      updateResponse = await updateHealthCheckPass(Backend)(checkId, note);
      break;
    case Constant.HEALTH_CHECK_STATUS.WARNING:
      updateResponse = await updateHealthCheckWarning(Backend)({
        checkId,
        note,
        nodeMeta,
        nodeState,
        type,
      });
      break;
    case Constant.HEALTH_CHECK_STATUS.CRITICAL:
      updateResponse = await updateHealthCheckCritical(Backend)({
        checkId,
        note,
        nodeMeta,
        nodeState,
        type,
      });
      break;
    default:
      updateResponse = null;
  }
  return updateResponse;
};

const updateLateBlockTimeStatus = (Backend) => async ({
  nodeState,
  checkId,
  nodeMeta,
  checkName,
  healthCheckConfigs,
}) => {
  if (!checkId) {
    return null;
  }
  const defaultCheck = await updateDefaultChecks(Backend)({
    nodeState,
    checkId,
    nodeMeta,
    checkName,
    type: CHECK_NAMES.TM_LATE_BLOCK_TIME,
  });
  if (defaultCheck) {
    return defaultCheck;
  }
  const {
    timeDelta,
    status,
  } = getLateBlockTimeStatus(nodeState, healthCheckConfigs);
  const updateResponse = await updateChecks(Backend)({
    checkId,
    status,
    note: `${timeDelta}s`,
    nodeMeta,
    nodeState,
    type: CHECK_NAMES.TM_LATE_BLOCK_TIME,
  });
  return {
    ...updateResponse,
    time: timeDelta,
  };
};

const updatePeerCountStatus = (Backend) => async ({
  nodeState,
  checkId,
  nodeMeta,
  checkName,
  healthCheckConfigs,
}) => {
  if (!checkId) {
    return null;
  }
  if (!nodeState) {
    return updateHealthCheckConnectionError(Backend)({
      checkId,
      nodeMeta,
      checkName,
      type: CHECK_NAMES.TM_PEER_COUNT,
    });
  }
  HealthCheckCounter.reset(nodeMeta, checkName);
  let status = Constant.HEALTH_CHECK_STATUS.PASS;
  if (nodeState.total_peers < healthCheckConfigs.peerCounts.critical) {
    status = Constant.HEALTH_CHECK_STATUS.CRITICAL;
  } else if (nodeState.total_peers < healthCheckConfigs.peerCounts.warning) {
    status = Constant.HEALTH_CHECK_STATUS.WARNING;
  }
  const updateResponse = await updateChecks(Backend)({
    status,
    checkId,
    note: `${nodeState.total_peers}peers`,
    nodeMeta,
    nodeState,
    type: CHECK_NAMES.TM_PEER_COUNT,
  });
  return {
    ...updateResponse,
    peers: nodeState.total_peers,
  };
};

const updateMissedBlocksStatus = (Backend) => async ({
  nodeState,
  nodeMeta,
  checkId,
  checkName,
  healthCheckConfigs,
  validatorAddress,
}) => {
  if (!checkId) {
    console.log('checkId not found');
    return null;
  }
  const defaultCheck = await updateDefaultChecks(Backend)({
    nodeState,
    checkId,
    nodeMeta,
    checkName,
    type: CHECK_NAMES.TM_MISSED_BLOCK,
  });
  if (defaultCheck) {
    return defaultCheck;
  }
  const commitBlockHeight = nodeState.block_height - 1;
  const lastCommitValues = await KVStore.getBlockCommitKeys(Backend)({
    from: commitBlockHeight - Config.numberOfLastCommits - 1,
    to: commitBlockHeight - 1,
    metaData: {
      projectName: Util.getProjectName(nodeMeta.projectName),
      networkName: nodeMeta.networkName,
      validatorAddress,
    },
  });
  if (lastCommitValues.length < 40) {
    // ignore this check if node is not catching up
    console.log('Not enough values', nodeMeta.projectName, nodeMeta.networkName, nodeMeta.region, lastCommitValues.length);
    return updateHealthCheckPass(Backend)(checkId);
  }
  const missedBlocksTotal = lastCommitValues.map((c) => +c.value).filter((v) => v === 0).length;
  const upTimeRatio = (lastCommitValues.length - missedBlocksTotal) / lastCommitValues.length;
  const upTimePercentage = Math.floor(upTimeRatio * 100);
  if (upTimePercentage < healthCheckConfigs.missedBlocks.critical) {
    console.log('Critical', nodeMeta.projectName, nodeMeta.region, upTimePercentage);
    return updateHealthCheckCritical(Backend)({
      checkId,
      note: upTimePercentage,
      nodeMeta,
      nodeState,
      type: CHECK_NAMES.TM_MISSED_BLOCK,
    });
  }
  if (upTimePercentage < healthCheckConfigs.missedBlocks.warning) {
    return updateHealthCheckWarning(Backend)({
      checkId,
      note: upTimePercentage,
      nodeMeta,
      nodeState,
      type: CHECK_NAMES.TM_MISSED_BLOCK,
    });
  }
  return updateHealthCheckPass(Backend)(checkId);
};

const update = (Backend) => async ({
  nodeState,
  nodeMeta,
  production,
  healthCheckConfigs,
}) => {
  const checks = Object.values(nodeMeta.nodeChecks)
    .filter((c) => c.CheckID.startsWith(`service:${Util.getServiceName(nodeMeta.projectName, production, nodeMeta.region)}`))
    .reduce((acc, check) => {
      acc[check.Name] = check.CheckID;
      return acc;
    }, {});
  const lateBlockAndPeerCount = [
    updateLateBlockTimeStatus(Backend)({
      nodeState,
      nodeMeta,
      checkId: checks[CHECK_NAMES.TM_LATE_BLOCK_TIME],
      checkName: CHECK_NAMES.TM_LATE_BLOCK_TIME,
      healthCheckConfigs,
    }),
    updatePeerCountStatus(Backend)({
      nodeState,
      nodeMeta,
      checkId: checks[CHECK_NAMES.TM_PEER_COUNT],
      checkName: CHECK_NAMES.TM_PEER_COUNT,
      healthCheckConfigs,
    }),
  ];
  const { validatorAddresses } = nodeMeta;
  const missedBlockPromises = validatorAddresses.map((v) => updateMissedBlocksStatus(Backend)({
    nodeState,
    nodeMeta,
    validatorAddress: v.address,
    checkId: checks[Util.getMissedBlockName(v.name)],
    checkName: Util.getMissedBlockName(v.name),
    healthCheckConfigs,
  }));
  const [lateBlockTime, peerCount, ...missedBlocksInARow] = await Promise.all([
    ...lateBlockAndPeerCount,
    ...missedBlockPromises,
  ]);
  const healthChecks = {
    [CHECK_NAMES.TM_LATE_BLOCK_TIME]: {
      ...lateBlockTime,
      prevStatus: nodeMeta.nodeChecks[checks[CHECK_NAMES.TM_LATE_BLOCK_TIME]].Status.toUpperCase(),
    },
    [CHECK_NAMES.TM_PEER_COUNT]: {
      ...peerCount,
      prevStatus: nodeMeta.nodeChecks[checks[CHECK_NAMES.TM_PEER_COUNT]].Status.toUpperCase(),
    },
  };
  validatorAddresses.map((v, indx) => {
    const checkName = Util.getMissedBlockName(v.name);
    healthChecks[checkName] = {
      ...missedBlocksInARow[indx],
      prevStatus: nodeMeta.nodeChecks[checks[checkName]].Status.toUpperCase(),
    };
    return null;
  });
  return {
    nodeId: nodeMeta.nodeId,
    project: nodeMeta.projectName,
    network: nodeMeta.networkName,
    region: nodeMeta.region,
    ip: nodeMeta.host,
    healthChecks,
  };
};

export default {
  update,
};
