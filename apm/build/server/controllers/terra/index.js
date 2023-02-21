'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objectDestructuringEmpty2 = require('babel-runtime/helpers/objectDestructuringEmpty');

var _objectDestructuringEmpty3 = _interopRequireDefault(_objectDestructuringEmpty2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _service = require('../../../monit/terra/service');

var _service2 = _interopRequireDefault(_service);

var _terra = require('../../../monit/terra');

var _terra2 = _interopRequireDefault(_terra);

var _influxStore = require('../../../monit/influx-store');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getStatus = function getStatus(req, res) {
  return async function (_ref) {
    var Backend = _ref.Backend;

    var missesData = await _service2.default.getMissingVote();
    var votingPeriod = Math.floor(+missesData.height / 5);
    var uptime = await _terra2.default.getUptimePercentage(Backend)(votingPeriod);
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)({
      blockHeight: missesData.height,
      misses: missesData.result,
      uptime: uptime
    }));
    return res;
  };
};

var getHealthChecks = function getHealthChecks(req, res) {
  return async function (_ref2) {
    var Backend = _ref2.Backend;

    var result = await _terra2.default.getHealthChecks(Backend);
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(result));
    return res;
  };
};

var getMissesChart = function getMissesChart(req, res) {
  return async function (_ref3) {
    (0, _objectDestructuringEmpty3.default)(_ref3);

    var limit = 2500;
    var from = (req.query.get('from') || 0) * 1e6;
    var to = (req.query.get('to') || 0) * 1e6;
    var fromBlock = Number(req.query.get('from_block'));
    var toBlock = Number(req.query.get('to_block'));
    var BLOCKS = Number(req.query.get('blocks')) || 50;
    var missesByBlockHeight = await (0, _influxStore.getTerraOracleMisses)({
      from: from, to: to, fromBlock: fromBlock, toBlock: toBlock, limit: limit
    });
    var ret = [];
    if (missesByBlockHeight.length > 0) {
      var lastBlockHeight = missesByBlockHeight[0].height;
      var lastTotalMisses = missesByBlockHeight[0].misses;
      ret.push({
        x: lastBlockHeight,
        y: 0
      });
      missesByBlockHeight.slice(1).forEach(function (val, idx) {
        if (lastBlockHeight + BLOCKS <= val.height || missesByBlockHeight.length - 2 === idx) {
          ret.push({
            x: val.height,
            y: val.misses - lastTotalMisses
          });
          lastBlockHeight = val.height;
          lastTotalMisses = val.misses;
        }
      });
    }
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getExchangeRateCharts = function getExchangeRateCharts(req, res) {
  return async function (_ref4) {
    (0, _objectDestructuringEmpty3.default)(_ref4);

    var limit = 50;
    var from = (req.query.get('from') || 0) * 1e6;
    var to = (req.query.get('to') || 0) * 1e6;
    var fromBlock = Number(req.query.get('from_block'));
    var toBlock = Number(req.query.get('to_block'));
    var ret = await (0, _influxStore.getTerraOracleExchangeRates)({
      from: from, to: to, fromBlock: fromBlock, toBlock: toBlock, limit: limit
    });
    for (var denom in ret) {
      ret[denom] = [{
        name: '_',
        data: ret[denom].map(function (val) {
          return {
            x: val.height,
            y: val.amount
          };
        })
      }, {
        name: 'swu',
        data: ret[denom].map(function (val) {
          return {
            x: val.height,
            y: val.swu_amount
          };
        })
      }];
    }
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

exports.default = {
  getStatus: getStatus,
  getHealthChecks: getHealthChecks,
  getMissesChart: getMissesChart,
  getExchangeRateCharts: getExchangeRateCharts
};
//# sourceMappingURL=index.js.map
