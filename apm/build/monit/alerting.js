'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _constant = require('./constant');

var _constant2 = _interopRequireDefault(_constant);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

var _notification = require('../notification');

var _notification2 = _interopRequireDefault(_notification);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CHECK_NAMES = _constant2.default.CHECK_NAMES;
var HEALTH_CHECK_STATUS = _constant2.default.HEALTH_CHECK_STATUS;

var logger = (0, _pino2.default)().child({ module: 'cmd/alerting' });

var isNodeMuted = function isNodeMuted(mutedNodes, projectName, region) {
  var result = mutedNodes.filter(function (node) {
    if (!node.region) {
      return node.projectName === projectName;
    }
    return node.projectName === projectName && node.region === region;
  });
  return result.length > 0;
};

var isStatusChanged = function isStatusChanged(check) {
  if (!check.status || !check.prevStatus) {
    return false;
  }
  return check.status !== HEALTH_CHECK_STATUS.PASS && check.status !== check.prevStatus;
};

var alertDataFromNode = function alertDataFromNode(node) {
  return {
    project: node.project,
    network: node.network,
    region: node.region,
    ip: node.ip
  };
};

var getAlertByType = function getAlertByType(changedStatusNodes, type) {
  return changedStatusNodes.reduce(function (acc, node) {
    var healthCheck = node.healthChecks[type];
    if (!healthCheck) {
      logger.error('getAlertByType Error');
      console.log(changedStatusNodes, type);
      throw new Error('HEALTH_CHECK_NOT_FOUND');
    }
    if (isStatusChanged(healthCheck)) {
      return acc.concat((0, _extends3.default)({}, alertDataFromNode(node), {
        type: type,
        status: healthCheck.status,
        note: healthCheck.note,
        prevStatus: healthCheck.prevStatus
      }));
    }
    return acc;
  }, []);
};

var getDisconnectionAlert = function getDisconnectionAlert(changedStatusNodes) {
  var disconnectionErrorNodes = changedStatusNodes.filter(function (node) {
    var healthCheckValues = (0, _values2.default)(node.healthChecks);
    var statuses = healthCheckValues.reduce(function (acc, check) {
      return acc.concat(check.status);
    }, []);
    var isAllStatusCritical = statuses.every(function (s) {
      return s === HEALTH_CHECK_STATUS.CRITICAL;
    });
    var isAllStatusWarning = statuses.every(function (s) {
      return s === HEALTH_CHECK_STATUS.WARNING;
    });
    var isAllNoteCritical = healthCheckValues.every(function (c) {
      return c.note === _constant2.default.NOTE_MESSAGES.DISCONNECTION_ERROR_CRITICAL;
    });
    var isAllNoteWarning = healthCheckValues.every(function (c) {
      return c.note === _constant2.default.NOTE_MESSAGES.DISCONNECTION_ERROR_WARNING;
    });
    return isAllStatusCritical && isAllNoteCritical || isAllStatusWarning && isAllNoteWarning;
  }, []);
  var alerts = disconnectionErrorNodes.map(function (node) {
    return (0, _extends3.default)({}, alertDataFromNode(node), {
      note: node.healthChecks[CHECK_NAMES.TM_LATE_BLOCK_TIME].note,
      status: node.healthChecks[CHECK_NAMES.TM_LATE_BLOCK_TIME].status,
      prevStatus: node.healthChecks[CHECK_NAMES.TM_LATE_BLOCK_TIME].prevStatus
    });
  });
  var alertNodeIds = disconnectionErrorNodes.map(function (node) {
    return node.nodeId;
  });
  return {
    alerts: alerts,
    others: changedStatusNodes.filter(function (alert) {
      return !alertNodeIds.includes(alert.nodeId);
    })
  };
};

var getMissedBlockAlert = function getMissedBlockAlert(changedStatusNodes, validatorSettings) {
  return changedStatusNodes.filter(function (r) {
    return r;
  }).reduce(function (acc, node) {
    var existing = acc.find(function (e) {
      return e.project === node.project && e.network === node.network;
    });
    if (existing) {
      return acc;
    }
    var validatorChecks = [];
    var validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, node.project, node.network);
    validatorAddresses.map(function (validator) {
      var check = node.healthChecks[_util2.default.getMissedBlockName(validator.name)];
      if (isStatusChanged(check)) {
        validatorChecks.push({
          project: node.project,
          network: node.network,
          type: CHECK_NAMES.TM_MISSED_BLOCK,
          status: check.status,
          prevStatus: check.prevStatus,
          note: check.note,
          validator: validator.name
        });
      }
      return null;
    });
    return acc.concat(validatorChecks);
  }, []);
};

var handleAlerting = async function handleAlerting(mutedNodes, nodeStatuses, validatorSettings) {
  var changedStatusNodes = nodeStatuses.filter(function (node) {
    if (isNodeMuted(mutedNodes, node.project, node.region)) {
      return false;
    }
    var healthChecks = (0, _values2.default)(node.healthChecks);
    return healthChecks.some(function (check) {
      return isStatusChanged(check);
    });
  });

  var _getDisconnectionAler = getDisconnectionAlert(changedStatusNodes),
      disconnectErrorAlerts = _getDisconnectionAler.alerts,
      others = _getDisconnectionAler.others;

  var lateBlockAlerts = getAlertByType(others, CHECK_NAMES.TM_LATE_BLOCK_TIME);
  var peerCountAlert = getAlertByType(others, CHECK_NAMES.TM_PEER_COUNT);
  var missedBlockAlert = getMissedBlockAlert(others, validatorSettings);
  var alerts = [].concat((0, _toConsumableArray3.default)(disconnectErrorAlerts), (0, _toConsumableArray3.default)(lateBlockAlerts), (0, _toConsumableArray3.default)(peerCountAlert), (0, _toConsumableArray3.default)(missedBlockAlert));
  await _promise2.default.all(alerts.map(_notification2.default.sendToSlack));
  return _notification2.default.sendToTwilio(alerts);
};

exports.default = {
  handleAlerting: handleAlerting
};
//# sourceMappingURL=alerting.js.map
