'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _influxStore = require('../../monit/influx-store');

var _influxStore2 = _interopRequireDefault(_influxStore);

var _util = require('../../common/util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var statusMap = {
  WARNING: 1,
  CRITICAL: 2
}; /* eslint-disable import/no-named-as-default-member */
/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */


var getMissedBlocksChart = function getMissedBlocksChart(_ref, res) {
  var query = _ref.query,
      capture = _ref.capture;
  return async function (args) {
    var _capture = (0, _slicedToArray3.default)(capture, 2),
        project = _capture[1];

    var network = query.get('network');
    var from = (query.get('from') || 0) * 1e6;
    var to = (query.get('to') || 0) * 1e6;

    var _ref2 = await _promise2.default.all([_influxStore2.default.getBlocksByTimeOfDay({
      project: project,
      network: network,
      from: from,
      to: to
    }), _influxStore2.default.getMissedBlocksByTimeOfDay({
      project: project,
      network: network,
      from: from,
      to: to
    })]),
        _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
        totalBlocks = _ref3[0],
        missedBlocks = _ref3[1];

    var ret = [{
      data: totalBlocks.map(function (block) {
        return {
          x: (0, _moment2.default)(block[0]).valueOf(),
          y: 0
        };
      })
    }, {
      data: totalBlocks.map(function (block) {
        return {
          x: (0, _moment2.default)(block[0]).valueOf(),
          y: 100,
          meta: {
            total: block[1]
          }
        };
      })
    }];
    missedBlocks.forEach(function (block) {
      var idx = totalBlocks.findIndex(function (x) {
        return x[0] === block[0];
      });
      var totalCount = totalBlocks[idx][1];
      ret[0].data[idx].y = block[1];
      ret[1].data[idx].y = _util2.default.roundFloatNumber((totalCount - block[1]) / totalCount * 100, 2);
    });
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getMissedBlocksAlertChart = function getMissedBlocksAlertChart(_ref4, res) {
  var query = _ref4.query,
      capture = _ref4.capture;
  return async function (args) {
    var _capture2 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture2[1];

    var network = query.get('network');
    var from = (query.get('from') || 0) * 1e6;
    var to = (query.get('to') || 0) * 1e6;
    var weekDays = _moment2.default.weekdaysShort();
    var missedBlocks = await _influxStore2.default.getMissedBlocksAlert({
      project: project,
      network: network,
      from: from,
      to: to
    });
    var ret = weekDays.map(function (day) {
      var data = Array(24).fill().map(function (v, index) {
        return {
          x: '' + index,
          y: 0,
          meta: {
            WARNING: 0,
            CRITICAL: 0
          }
        };
      });
      return {
        name: day,
        data: data
      };
    });
    missedBlocks.forEach(function (block) {
      var d = (0, _moment2.default)(block[0]);
      if (Number(block[1])) {
        ret[d.weekday()].data[d.hour()].y = Math.max(ret[d.weekday()].data[d.hour()].y, statusMap[block[2]]);
        ret[d.weekday()].data[d.hour()].meta[block[2]] += block[1];
      }
    });
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret.reverse()));
    return res;
  };
};

var getPeerCountChart = function getPeerCountChart(_ref5, res) {
  var query = _ref5.query,
      capture = _ref5.capture;
  return async function (args) {
    var _capture3 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture3[1];

    var network = query.get('network');
    var from = (query.get('from') || 0) * 1e6;
    var to = (query.get('to') || 0) * 1e6;

    var ret = await _influxStore2.default.getPeerCount({
      project: project,
      network: network,
      from: from,
      to: to
    });
    ret = ret.map(function (item) {
      var data = [];
      item.values.forEach(function (val) {
        data.push({
          x: (0, _moment2.default)(val[0]).valueOf(),
          y: val.slice(-1)[0]
        });
      });
      return {
        name: item.name,
        data: data
      };
    });
    if (!ret.length) {
      ret = [{
        data: []
      }];
    }
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getBlockHeightsChart = function getBlockHeightsChart(_ref6, res) {
  var query = _ref6.query,
      capture = _ref6.capture;
  return async function (args) {
    var _capture4 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture4[1];

    var network = query.get('network');
    var from = (query.get('from') || 0) * 1e6;
    var to = (query.get('to') || 0) * 1e6;

    var ret = await _influxStore2.default.getBlockHeights({
      project: project,
      network: network,
      from: from,
      to: to
    });
    ret = ret.map(function (item) {
      var data = [];
      item.values.forEach(function (val) {
        data.push({
          x: (0, _moment2.default)(val[0]).valueOf(),
          y: val.slice(-1)[0]
        });
      });
      return {
        name: item.name,
        data: data
      };
    });
    if (!ret.length) {
      ret = [{
        data: []
      }];
    }
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getLateBlockTimeAlertChart = function getLateBlockTimeAlertChart(_ref7, res) {
  var query = _ref7.query,
      capture = _ref7.capture;
  return async function (args) {
    var _capture5 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture5[1];

    var network = query.get('network');
    var from = (query.get('from') || 0) * 1e6;
    var to = (query.get('to') || 0) * 1e6;
    var weekDays = _moment2.default.weekdaysShort();
    var missedBlocks = await _influxStore2.default.getLateBlockTimeAlert({
      project: project,
      network: network,
      from: from,
      to: to
    });
    var ret = weekDays.map(function (day) {
      var data = Array(24).fill().map(function (v, index) {
        return {
          x: '' + index,
          y: 0,
          meta: {
            WARNING: 0,
            CRITICAL: 0
          }
        };
      });
      return {
        name: day,
        data: data
      };
    });
    missedBlocks.forEach(function (block) {
      var d = (0, _moment2.default)(block[0]);
      if (Number(block[1])) {
        ret[d.weekday()].data[d.hour()].y = Math.max(ret[d.weekday()].data[d.hour()].y, statusMap[block[2]]);
        ret[d.weekday()].data[d.hour()].meta[block[2]] += block[1];
      }
    });
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret.reverse()));
    return res;
  };
};

exports.default = {
  getMissedBlocksChart: getMissedBlocksChart,
  getMissedBlocksAlertChart: getMissedBlocksAlertChart,
  getPeerCountChart: getPeerCountChart,
  getLateBlockTimeAlertChart: getLateBlockTimeAlertChart,
  getBlockHeightsChart: getBlockHeightsChart
};
//# sourceMappingURL=statistics.js.map
