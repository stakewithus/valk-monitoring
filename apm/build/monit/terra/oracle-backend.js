'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _kvStore = require('../kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _constant = require('../constant');

var _constant2 = _interopRequireDefault(_constant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'cmd/monit/tera/oracle-backend' });
var CHECK_IDS = {
  ORACLE_MISSING_VOTE: 'oracle-terra-missing-vote'
};

var getKeyPrefix = function getKeyPrefix() {
  return 'backend/terra/oracle/' + process.env.TERRA_ORACLE_VALIDATOR_ADDRESS + '/miss/';
};

var getKey = function getKey(vp) {
  return '' + getKeyPrefix() + vp;
};

var addCheck = async function addCheck(bend) {
  var nodeServices = await bend.agent.service.list();
  var svcName = 'terra-backend';
  if (!nodeServices[svcName]) {
    throw new Error('Service ' + svcName + ' not found');
  }
  var nodeChecks = await bend.agent.check.list();
  if (nodeChecks[CHECK_IDS.ORACLE_MISSING_VOTE]) {
    return null;
  }
  var missingVoteCheck = {
    CheckID: CHECK_IDS.ORACLE_MISSING_VOTE,
    Name: CHECK_IDS.ORACLE_MISSING_VOTE,
    Notes: 'Checks that Oracle Backend does not miss any vote',
    TTL: '20s',
    ServiceID: svcName,
    Status: 'critical'
  };
  return bend.agent.check.register(missingVoteCheck);
};

var healthCheck = function healthCheck(nodeChecks) {
  return nodeChecks[CHECK_IDS.ORACLE_MISSING_VOTE];
};

var getLastVotings = function getLastVotings(votingMisses, minVotingPeriod) {
  var lastVotings = votingMisses.filter(function (v) {
    var arrList = v.key.split('/');
    var votingPeriod = arrList[arrList.length - 1];
    return votingPeriod > minVotingPeriod;
  }).map(function (v) {
    return +v.value;
  });
  lastVotings.sort();
  return lastVotings;
};

var updateHealthCheck = function updateHealthCheck(Backend) {
  return async function (lastVotings, checks) {
    var missed = lastVotings[lastVotings.length - 1] - lastVotings[0];
    var checkId = CHECK_IDS.ORACLE_MISSING_VOTE;
    if (!checks[checkId]) {
      logger.info('CHECKID_NOT_FOUND', checks, checkId);
      return null;
    }
    var status = null;
    var criticalMisses = +process.env.TERRA_ORACLE_CRITICAL || 5;
    var warningMisses = +process.env.TERRA_ORACLE_WARNING || 1;
    if (missed > criticalMisses) {
      await Backend.agent.check.ttlFail(checkId, missed);
      status = _constant2.default.HEALTH_CHECK_STATUS.CRITICAL;
    } else if (missed > warningMisses) {
      await Backend.agent.check.ttlWarn(checkId, missed);
      status = _constant2.default.HEALTH_CHECK_STATUS.WARNING;
    } else {
      await Backend.agent.check.ttlPass(checkId);
      status = _constant2.default.HEALTH_CHECK_STATUS.PASS;
    }
    return {
      status: status,
      prevStatus: checks[checkId].Status,
      note: missed
    };
  };
};

var shouldAlerting = function shouldAlerting(status, prevStatus) {
  if (process.env.TERRA_ORACLE_DISABLE_ALERT == 1) {
    return false;
  }
  if (!prevStatus) {
    logger.error('shoudAlerting: prevStatus is undefined');
  }
  if (status === _constant2.default.HEALTH_CHECK_STATUS.PASS) {
    return false;
  }
  return prevStatus && status && prevStatus.toUpperCase() !== status.toUpperCase();
};

var removeOldKeys = function removeOldKeys(Backend) {
  return function (votingMisses, minVotingPeriod) {
    var removingVotingPeriod = votingMisses.map(function (v) {
      var arrList = v.key.split('/');
      var votingPeriod = arrList[arrList.length - 1];
      return +votingPeriod;
    }).filter(function (vp) {
      return vp < minVotingPeriod;
    });
    var removingKeys = removingVotingPeriod.map(function (vp) {
      return getKey(vp);
    });
    return _kvStore2.default.deleteMultipleKeys(Backend)(removingKeys);
  };
};

exports.default = {
  getKey: getKey,
  getKeyPrefix: getKeyPrefix,
  healthCheck: healthCheck,
  addCheck: addCheck,
  updateHealthCheck: updateHealthCheck,
  removeOldKeys: removeOldKeys,
  shouldAlerting: shouldAlerting,
  getLastVotings: getLastVotings
};
//# sourceMappingURL=oracle-backend.js.map
