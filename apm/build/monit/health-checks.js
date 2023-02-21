'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _toArray2 = require('babel-runtime/helpers/toArray');

var _toArray3 = _interopRequireDefault(_toArray2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _constant = require('./constant');

var _constant2 = _interopRequireDefault(_constant);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _kvStore = require('./kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _healthCheckCounter = require('./health-check-counter');

var _healthCheckCounter2 = _interopRequireDefault(_healthCheckCounter);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

var _influxStore = require('./influx-store');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CHECK_NAMES = _constant2.default.CHECK_NAMES;


var getLateBlockTimeStatus = function getLateBlockTimeStatus(nodeState, healthCheckConfigs) {
  var currentTime = Math.floor(Date.now() / 1000);
  var delta = currentTime - nodeState.block_time;
  var status = _constant2.default.HEALTH_CHECK_STATUS.PASS;
  if (delta > healthCheckConfigs.lastBlockTime.critical) {
    status = _constant2.default.HEALTH_CHECK_STATUS.CRITICAL;
  } else if (delta > healthCheckConfigs.lastBlockTime.warning) {
    status = _constant2.default.HEALTH_CHECK_STATUS.WARNING;
  }
  return {
    timeDelta: delta,
    status: status
  };
};

var updateHealthCheckPass = function updateHealthCheckPass(Backend) {
  return async function (checkId) {
    var note = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var response = await Backend.agent.check.ttlPass(checkId, note);
    return {
      checkId: checkId,
      status: _constant2.default.HEALTH_CHECK_STATUS.PASS,
      response: response,
      note: note
    };
  };
};
var updateHealthCheckWarning = function updateHealthCheckWarning(Backend) {
  return async function (_ref) {
    var checkId = _ref.checkId,
        _ref$note = _ref.note,
        note = _ref$note === undefined ? '' : _ref$note,
        type = _ref.type,
        _ref$nodeMeta = _ref.nodeMeta,
        nodeMeta = _ref$nodeMeta === undefined ? {} : _ref$nodeMeta,
        _ref$nodeState = _ref.nodeState,
        nodeState = _ref$nodeState === undefined ? {} : _ref$nodeState;

    (0, _influxStore.saveHealthChecks)({
      nodeId: nodeMeta.nodeId,
      region: nodeMeta.region,
      network: nodeMeta.networkName,
      project: nodeMeta.projectName,
      host: nodeMeta.host,
      blockHeight: nodeState.block_height,
      blockTime: nodeState.block_time,
      status: _constant2.default.HEALTH_CHECK_STATUS.WARNING,
      checkId: checkId,
      note: note,
      type: type
    });
    var response = await Backend.agent.check.ttlWarn(checkId, note);
    return {
      checkId: checkId,
      status: _constant2.default.HEALTH_CHECK_STATUS.WARNING,
      response: response,
      note: note
    };
  };
};
var updateHealthCheckCritical = function updateHealthCheckCritical(Backend) {
  return async function (_ref2) {
    var checkId = _ref2.checkId,
        _ref2$note = _ref2.note,
        note = _ref2$note === undefined ? '' : _ref2$note,
        type = _ref2.type,
        _ref2$nodeMeta = _ref2.nodeMeta,
        nodeMeta = _ref2$nodeMeta === undefined ? {} : _ref2$nodeMeta,
        _ref2$nodeState = _ref2.nodeState,
        nodeState = _ref2$nodeState === undefined ? {} : _ref2$nodeState;

    (0, _influxStore.saveHealthChecks)({
      nodeId: nodeMeta.nodeId,
      region: nodeMeta.region,
      network: nodeMeta.networkName,
      project: nodeMeta.projectName,
      host: nodeMeta.host,
      blockHeight: nodeState.block_height,
      blockTime: nodeState.block_time,
      status: _constant2.default.HEALTH_CHECK_STATUS.CRITICAL,
      checkId: checkId,
      note: note,
      type: type
    });
    var response = await Backend.agent.check.ttlFail(checkId, note);
    return {
      checkId: checkId,
      status: _constant2.default.HEALTH_CHECK_STATUS.CRITICAL,
      response: response,
      note: note
    };
  };
};

var updateHealthCheckConnectionError = function updateHealthCheckConnectionError(Backend) {
  return async function (_ref3) {
    var checkId = _ref3.checkId,
        nodeMeta = _ref3.nodeMeta,
        checkName = _ref3.checkName,
        type = _ref3.type;

    if (_healthCheckCounter2.default.get(nodeMeta, checkName) < 2) {
      _healthCheckCounter2.default.increase(nodeMeta, checkName);
      return true;
    }
    if (_healthCheckCounter2.default.get(nodeMeta, checkName) <= 5) {
      _healthCheckCounter2.default.increase(nodeMeta, checkName);
      return updateHealthCheckWarning(Backend)({
        checkId: checkId,
        note: _constant2.default.NOTE_MESSAGES.DISCONNECTION_ERROR_WARNING,
        nodeMeta: nodeMeta,
        type: type
      });
    }
    return updateHealthCheckCritical(Backend)({
      checkId: checkId,
      note: _constant2.default.NOTE_MESSAGES.DISCONNECTION_ERROR_CRITICAL,
      nodeMeta: nodeMeta,
      type: type
    });
  };
};

var updateDefaultChecks = function updateDefaultChecks(Backend) {
  return async function (_ref4) {
    var checkId = _ref4.checkId,
        nodeState = _ref4.nodeState,
        nodeMeta = _ref4.nodeMeta,
        checkName = _ref4.checkName,
        type = _ref4.type;

    if (!nodeState) {
      return updateHealthCheckConnectionError(Backend)({
        checkId: checkId,
        nodeMeta: nodeMeta,
        checkName: checkName,
        type: type
      });
    }
    _healthCheckCounter2.default.reset(nodeMeta, checkName);
    if (nodeState.catching_up) {
      var warningNote = 'Node is still catch up, now at ' + nodeState.block_height;
      return updateHealthCheckWarning(Backend)({
        checkId: checkId,
        note: warningNote,
        nodeMeta: nodeMeta,
        nodeState: nodeState,
        type: type
      });
    }
    return null;
  };
};

var updateChecks = function updateChecks(Backend) {
  return async function (_ref5) {
    var status = _ref5.status,
        note = _ref5.note,
        checkId = _ref5.checkId,
        nodeMeta = _ref5.nodeMeta,
        nodeState = _ref5.nodeState,
        type = _ref5.type;

    var updateResponse = null;
    switch (status) {
      case _constant2.default.HEALTH_CHECK_STATUS.PASS:
        updateResponse = await updateHealthCheckPass(Backend)(checkId, note);
        break;
      case _constant2.default.HEALTH_CHECK_STATUS.WARNING:
        updateResponse = await updateHealthCheckWarning(Backend)({
          checkId: checkId,
          note: note,
          nodeMeta: nodeMeta,
          nodeState: nodeState,
          type: type
        });
        break;
      case _constant2.default.HEALTH_CHECK_STATUS.CRITICAL:
        updateResponse = await updateHealthCheckCritical(Backend)({
          checkId: checkId,
          note: note,
          nodeMeta: nodeMeta,
          nodeState: nodeState,
          type: type
        });
        break;
      default:
        updateResponse = null;
    }
    return updateResponse;
  };
};

var updateLateBlockTimeStatus = function updateLateBlockTimeStatus(Backend) {
  return async function (_ref6) {
    var nodeState = _ref6.nodeState,
        checkId = _ref6.checkId,
        nodeMeta = _ref6.nodeMeta,
        checkName = _ref6.checkName,
        healthCheckConfigs = _ref6.healthCheckConfigs;

    if (!checkId) {
      return null;
    }
    var defaultCheck = await updateDefaultChecks(Backend)({
      nodeState: nodeState,
      checkId: checkId,
      nodeMeta: nodeMeta,
      checkName: checkName,
      type: CHECK_NAMES.TM_LATE_BLOCK_TIME
    });
    if (defaultCheck) {
      return defaultCheck;
    }

    var _getLateBlockTimeStat = getLateBlockTimeStatus(nodeState, healthCheckConfigs),
        timeDelta = _getLateBlockTimeStat.timeDelta,
        status = _getLateBlockTimeStat.status;

    var updateResponse = await updateChecks(Backend)({
      checkId: checkId,
      status: status,
      note: timeDelta + 's',
      nodeMeta: nodeMeta,
      nodeState: nodeState,
      type: CHECK_NAMES.TM_LATE_BLOCK_TIME
    });
    return (0, _extends3.default)({}, updateResponse, {
      time: timeDelta
    });
  };
};

var updatePeerCountStatus = function updatePeerCountStatus(Backend) {
  return async function (_ref7) {
    var nodeState = _ref7.nodeState,
        checkId = _ref7.checkId,
        nodeMeta = _ref7.nodeMeta,
        checkName = _ref7.checkName,
        healthCheckConfigs = _ref7.healthCheckConfigs;

    if (!checkId) {
      return null;
    }
    if (!nodeState) {
      return updateHealthCheckConnectionError(Backend)({
        checkId: checkId,
        nodeMeta: nodeMeta,
        checkName: checkName,
        type: CHECK_NAMES.TM_PEER_COUNT
      });
    }
    _healthCheckCounter2.default.reset(nodeMeta, checkName);
    var status = _constant2.default.HEALTH_CHECK_STATUS.PASS;
    if (nodeState.total_peers < healthCheckConfigs.peerCounts.critical) {
      status = _constant2.default.HEALTH_CHECK_STATUS.CRITICAL;
    } else if (nodeState.total_peers < healthCheckConfigs.peerCounts.warning) {
      status = _constant2.default.HEALTH_CHECK_STATUS.WARNING;
    }
    var updateResponse = await updateChecks(Backend)({
      status: status,
      checkId: checkId,
      note: nodeState.total_peers + 'peers',
      nodeMeta: nodeMeta,
      nodeState: nodeState,
      type: CHECK_NAMES.TM_PEER_COUNT
    });
    return (0, _extends3.default)({}, updateResponse, {
      peers: nodeState.total_peers
    });
  };
};

var updateMissedBlocksStatus = function updateMissedBlocksStatus(Backend) {
  return async function (_ref8) {
    var nodeState = _ref8.nodeState,
        nodeMeta = _ref8.nodeMeta,
        checkId = _ref8.checkId,
        checkName = _ref8.checkName,
        healthCheckConfigs = _ref8.healthCheckConfigs,
        validatorAddress = _ref8.validatorAddress;

    if (!checkId) {
      console.log('checkId not found');
      return null;
    }
    var defaultCheck = await updateDefaultChecks(Backend)({
      nodeState: nodeState,
      checkId: checkId,
      nodeMeta: nodeMeta,
      checkName: checkName,
      type: CHECK_NAMES.TM_MISSED_BLOCK
    });
    if (defaultCheck) {
      return defaultCheck;
    }
    var commitBlockHeight = nodeState.block_height - 1;
    var lastCommitValues = await _kvStore2.default.getBlockCommitKeys(Backend)({
      from: commitBlockHeight - _config2.default.numberOfLastCommits - 1,
      to: commitBlockHeight - 1,
      metaData: {
        projectName: _util2.default.getProjectName(nodeMeta.projectName),
        networkName: nodeMeta.networkName,
        validatorAddress: validatorAddress
      }
    });
    if (lastCommitValues.length < 40) {
      // ignore this check if node is not catching up
      console.log('Not enough values', nodeMeta.projectName, nodeMeta.networkName, nodeMeta.region, lastCommitValues.length);
      return updateHealthCheckPass(Backend)(checkId);
    }
    var missedBlocksTotal = lastCommitValues.map(function (c) {
      return +c.value;
    }).filter(function (v) {
      return v === 0;
    }).length;
    var upTimeRatio = (lastCommitValues.length - missedBlocksTotal) / lastCommitValues.length;
    var upTimePercentage = Math.floor(upTimeRatio * 100);
    if (upTimePercentage < healthCheckConfigs.missedBlocks.critical) {
      console.log('Critical', nodeMeta.projectName, nodeMeta.region, upTimePercentage);
      return updateHealthCheckCritical(Backend)({
        checkId: checkId,
        note: upTimePercentage,
        nodeMeta: nodeMeta,
        nodeState: nodeState,
        type: CHECK_NAMES.TM_MISSED_BLOCK
      });
    }
    if (upTimePercentage < healthCheckConfigs.missedBlocks.warning) {
      return updateHealthCheckWarning(Backend)({
        checkId: checkId,
        note: upTimePercentage,
        nodeMeta: nodeMeta,
        nodeState: nodeState,
        type: CHECK_NAMES.TM_MISSED_BLOCK
      });
    }
    return updateHealthCheckPass(Backend)(checkId);
  };
};

var update = function update(Backend) {
  return async function (_ref9) {
    var _healthChecks;

    var nodeState = _ref9.nodeState,
        nodeMeta = _ref9.nodeMeta,
        production = _ref9.production,
        healthCheckConfigs = _ref9.healthCheckConfigs;

    var checks = (0, _values2.default)(nodeMeta.nodeChecks).filter(function (c) {
      return c.CheckID.startsWith('service:' + _util2.default.getServiceName(nodeMeta.projectName, production, nodeMeta.region));
    }).reduce(function (acc, check) {
      acc[check.Name] = check.CheckID;
      return acc;
    }, {});
    var lateBlockAndPeerCount = [updateLateBlockTimeStatus(Backend)({
      nodeState: nodeState,
      nodeMeta: nodeMeta,
      checkId: checks[CHECK_NAMES.TM_LATE_BLOCK_TIME],
      checkName: CHECK_NAMES.TM_LATE_BLOCK_TIME,
      healthCheckConfigs: healthCheckConfigs
    }), updatePeerCountStatus(Backend)({
      nodeState: nodeState,
      nodeMeta: nodeMeta,
      checkId: checks[CHECK_NAMES.TM_PEER_COUNT],
      checkName: CHECK_NAMES.TM_PEER_COUNT,
      healthCheckConfigs: healthCheckConfigs
    })];
    var validatorAddresses = nodeMeta.validatorAddresses;

    var missedBlockPromises = validatorAddresses.map(function (v) {
      return updateMissedBlocksStatus(Backend)({
        nodeState: nodeState,
        nodeMeta: nodeMeta,
        validatorAddress: v.address,
        checkId: checks[_util2.default.getMissedBlockName(v.name)],
        checkName: _util2.default.getMissedBlockName(v.name),
        healthCheckConfigs: healthCheckConfigs
      });
    });

    var _ref10 = await _promise2.default.all([].concat(lateBlockAndPeerCount, (0, _toConsumableArray3.default)(missedBlockPromises))),
        _ref11 = (0, _toArray3.default)(_ref10),
        lateBlockTime = _ref11[0],
        peerCount = _ref11[1],
        missedBlocksInARow = _ref11.slice(2);

    var healthChecks = (_healthChecks = {}, (0, _defineProperty3.default)(_healthChecks, CHECK_NAMES.TM_LATE_BLOCK_TIME, (0, _extends3.default)({}, lateBlockTime, {
      prevStatus: nodeMeta.nodeChecks[checks[CHECK_NAMES.TM_LATE_BLOCK_TIME]].Status.toUpperCase()
    })), (0, _defineProperty3.default)(_healthChecks, CHECK_NAMES.TM_PEER_COUNT, (0, _extends3.default)({}, peerCount, {
      prevStatus: nodeMeta.nodeChecks[checks[CHECK_NAMES.TM_PEER_COUNT]].Status.toUpperCase()
    })), _healthChecks);
    validatorAddresses.map(function (v, indx) {
      var checkName = _util2.default.getMissedBlockName(v.name);
      healthChecks[checkName] = (0, _extends3.default)({}, missedBlocksInARow[indx], {
        prevStatus: nodeMeta.nodeChecks[checks[checkName]].Status.toUpperCase()
      });
      return null;
    });
    return {
      nodeId: nodeMeta.nodeId,
      project: nodeMeta.projectName,
      network: nodeMeta.networkName,
      region: nodeMeta.region,
      ip: nodeMeta.host,
      healthChecks: healthChecks
    };
  };
};

exports.default = {
  update: update
};
//# sourceMappingURL=health-checks.js.map
