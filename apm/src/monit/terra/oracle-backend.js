import pino from 'pino';
import KVStore from '../kv-store';
import CONSTANT from '../constant';

const logger = pino().child({ module: 'cmd/monit/tera/oracle-backend' });
const CHECK_IDS = {
  ORACLE_MISSING_VOTE: 'oracle-terra-missing-vote',
};

const getKeyPrefix = () => `backend/terra/oracle/${process.env.TERRA_ORACLE_VALIDATOR_ADDRESS}/miss/`;

const getKey = (vp) => `${getKeyPrefix()}${vp}`;

const addCheck = async (bend) => {
  const nodeServices = await bend.agent.service.list();
  const svcName = 'terra-backend';
  if (!nodeServices[svcName]) {
    throw new Error(`Service ${svcName} not found`);
  }
  const nodeChecks = await bend.agent.check.list();
  if (nodeChecks[CHECK_IDS.ORACLE_MISSING_VOTE]) {
    return null;
  }
  const missingVoteCheck = {
    CheckID: CHECK_IDS.ORACLE_MISSING_VOTE,
    Name: CHECK_IDS.ORACLE_MISSING_VOTE,
    Notes: 'Checks that Oracle Backend does not miss any vote',
    TTL: '20s',
    ServiceID: svcName,
    Status: 'critical',
  };
  return bend.agent.check.register(missingVoteCheck);
};

const healthCheck = (nodeChecks) => nodeChecks[CHECK_IDS.ORACLE_MISSING_VOTE];

const getLastVotings = (votingMisses, minVotingPeriod) => {
  const lastVotings = votingMisses.filter((v) => {
    const arrList = v.key.split('/');
    const votingPeriod = arrList[arrList.length - 1];
    return votingPeriod > minVotingPeriod;
  }).map((v) => +v.value);
  lastVotings.sort();
  return lastVotings;
};

const updateHealthCheck = (Backend) => async (lastVotings, checks) => {
  const missed = lastVotings[lastVotings.length - 1] - lastVotings[0];
  const checkId = CHECK_IDS.ORACLE_MISSING_VOTE;
  if (!checks[checkId]) {
    logger.info('CHECKID_NOT_FOUND', checks, checkId);
    return null;
  }
  let status = null;
  const criticalMisses = +process.env.TERRA_ORACLE_CRITICAL || 5;
  const warningMisses = +process.env.TERRA_ORACLE_WARNING || 1;
  if (missed > criticalMisses) {
    await Backend.agent.check.ttlFail(checkId, missed);
    status = CONSTANT.HEALTH_CHECK_STATUS.CRITICAL;
  } else if (missed > warningMisses) {
    await Backend.agent.check.ttlWarn(checkId, missed);
    status = CONSTANT.HEALTH_CHECK_STATUS.WARNING;
  } else {
    await Backend.agent.check.ttlPass(checkId);
    status = CONSTANT.HEALTH_CHECK_STATUS.PASS;
  }
  return {
    status,
    prevStatus: checks[checkId].Status,
    note: missed,
  };
};

const shouldAlerting = (status, prevStatus) => {
  if (process.env.TERRA_ORACLE_DISABLE_ALERT == 1) {
    return false;
  }
  if (!prevStatus) {
    logger.error('shoudAlerting: prevStatus is undefined');
  }
  if (status === CONSTANT.HEALTH_CHECK_STATUS.PASS) {
    return false;
  }
  return prevStatus && status && prevStatus.toUpperCase() !== status.toUpperCase();
};

const removeOldKeys = (Backend) => (votingMisses, minVotingPeriod) => {
  const removingVotingPeriod = votingMisses.map((v) => {
    const arrList = v.key.split('/');
    const votingPeriod = arrList[arrList.length - 1];
    return +votingPeriod;
  }).filter((vp) => vp < minVotingPeriod);
  const removingKeys = removingVotingPeriod.map((vp) => getKey(vp));
  return KVStore.deleteMultipleKeys(Backend)(removingKeys);
};

export default {
  getKey,
  getKeyPrefix,
  healthCheck,
  addCheck,
  updateHealthCheck,
  removeOldKeys,
  shouldAlerting,
  getLastVotings,
};
