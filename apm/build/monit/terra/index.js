'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _lcdBackend = require('../lcd-backend');

var _lcdBackend2 = _interopRequireDefault(_lcdBackend);

var _oracleBackend = require('./oracle-backend');

var _oracleBackend2 = _interopRequireDefault(_oracleBackend);

var _kvStore = require('../kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _config = require('../../config');

var _config2 = _interopRequireDefault(_config);

var _api = require('../../plugins/backends/consul2/api');

var _api2 = _interopRequireDefault(_api);

var _notification = require('../../notification');

var _notification2 = _interopRequireDefault(_notification);

var _service = require('./service');

var _service2 = _interopRequireDefault(_service);

var _constant = require('../constant');

var _constant2 = _interopRequireDefault(_constant);

var _exchangeRates = require('./exchange-rates');

var _exchangeRates2 = _interopRequireDefault(_exchangeRates);

var _influxStore = require('../influx-store');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'cmd/monit/tera/oracle-backend' });

var getHealthChecks = async function getHealthChecks(Backend) {
  var nodeChecks = await Backend.agent.check.list();
  var lcdList = process.env.TERRA_LCD.split(',');
  var lcdHealthChecks = lcdList.map(function (lcd) {
    var _lcd$split = lcd.split(':'),
        _lcd$split2 = (0, _slicedToArray3.default)(_lcd$split, 2),
        host = _lcd$split2[0],
        port = _lcd$split2[1];

    return _lcdBackend2.default.healthCheck(nodeChecks, 'terra', host, port);
  });
  var lcdResult = lcdHealthChecks.filter(function (c) {
    return c;
  }).map(function (check) {
    return {
      project: 'terra',
      name: 'Terra-LCD-Backend',
      id: check.CheckID,
      status: check.Status,
      output: check.Output,
      notes: check.Notes
    };
  });
  var oracleHealthCheck = _oracleBackend2.default.healthCheck(nodeChecks);
  if (!oracleHealthCheck) {
    return lcdResult;
  }
  var oracleResult = {
    project: 'terra',
    name: 'Terra-Oracle-Backend',
    status: oracleHealthCheck.Status,
    output: oracleHealthCheck.Output,
    notes: oracleHealthCheck.Notes
  };
  var result = lcdResult.concat(oracleResult);
  return result;
};

var getLCDAlerts = function getLCDAlerts(checks) {
  var lcdList = process.env.TERRA_LCD.split(',');
  return lcdList.map(function (lcd) {
    var _lcd$split3 = lcd.split(':'),
        _lcd$split4 = (0, _slicedToArray3.default)(_lcd$split3, 2),
        host = _lcd$split4[0],
        port = _lcd$split4[1];

    var check = _lcdBackend2.default.healthCheck(checks, 'terra', host, port);
    if (!_lcdBackend2.default.shouldAlerting(check, 'terra', host, port)) {
      return null;
    }
    var alert = {
      type: 'LCD-Monitoring',
      project: 'terra',
      endpoint: lcd,
      status: check.Status && check.Status.toUpperCase()
    };
    if (alert.status === _constant2.default.HEALTH_CHECK_STATUS.CRITICAL) {
      alert.note = check.Output;
    }
    return alert;
  }).filter(function (e) {
    return e;
  });
};

var getOracleAlert = function getOracleAlert(check) {
  if (!_oracleBackend2.default.shouldAlerting(check.status, check.prevStatus)) {
    return [];
  }
  return [{
    type: 'Oracle-Monitoring',
    project: 'terra',
    status: check.status,
    prevStatus: check.prevStatus,
    note: check.note
  }];
};

var handleAlerting = async function handleAlerting(alerts) {
  await _promise2.default.all(alerts.map(_notification2.default.sendToSlack));
  return _notification2.default.sendToTwilio(alerts);
};

var saveToKVStore = async function saveToKVStore(Backend) {
  var missingData = await _service2.default.getMissingVote();
  (0, _influxStore.saveTerraOracleMisses)({ height: missingData.height, misses: missingData.result });
  var votingPeriod = Math.floor(+missingData.height / 5);
  var keyPrefix = _oracleBackend2.default.getKeyPrefix();
  var kvKey = _oracleBackend2.default.getKey(votingPeriod);
  await Backend.kv.upsert(kvKey, +missingData.result);
  var votingMisses = await _kvStore2.default.getAllByKeyPrefix(Backend)(keyPrefix);
  var lastVotingPeriodForSaving = votingPeriod - _config2.default.numberOfLastVotingPeriod;
  var lastVotings = await _oracleBackend2.default.getLastVotings(votingMisses, lastVotingPeriodForSaving);
  await _oracleBackend2.default.removeOldKeys(Backend)(votingMisses, lastVotingPeriodForSaving);
  return lastVotings;
};

var getUptimePercentage = function getUptimePercentage(Backend) {
  return async function (votingPeriod) {
    var keyPrefix = _oracleBackend2.default.getKeyPrefix();
    var votingMisses = await _kvStore2.default.getAllByKeyPrefix(Backend)(keyPrefix);
    var lastVotings = await _oracleBackend2.default.getLastVotings(votingMisses, votingPeriod - _config2.default.numberOfLastVotingPeriod);
    var missed = lastVotings[lastVotings.length - 1] - lastVotings[0];
    var totalVotingPeriod = lastVotings.length;
    var percentage = (1 - missed / totalVotingPeriod) * 100;
    return Math.round(percentage * 100) / 100;
  };
};

var run = async function run(_ref) {
  var nodeIp = _ref.node,
      consulPort = _ref.consulPort;

  try {
    var Backend = (0, _api2.default)(nodeIp, consulPort).Api;
    var lastVotings = await saveToKVStore(Backend);
    var checks = await Backend.agent.check.list();
    var alertings = getLCDAlerts(checks);
    if (lastVotings.length > 10) {
      var oracleHealthCheck = await _oracleBackend2.default.updateHealthCheck(Backend)(lastVotings, checks);
      if (oracleHealthCheck) {
        alertings = alertings.concat(getOracleAlert(oracleHealthCheck));
      }
    }
    await handleAlerting(alertings);
  } catch (error) {
    logger.error('TerraMonitoring-ERROR', error);
  }
};

var fetchExchangeRate = async function fetchExchangeRate() {
  try {
    var activeDenoms = await _service2.default.getActiveDenoms();
    _exchangeRates2.default.runEverySec(activeDenoms);
  } catch (error) {
    logger.error('fetchExchangeRate-ERROR');
    logger.info(error && error.toString());
  }
};

exports.default = {
  getHealthChecks: getHealthChecks,
  run: run,
  getUptimePercentage: getUptimePercentage,
  fetchExchangeRate: fetchExchangeRate
};
//# sourceMappingURL=index.js.map
