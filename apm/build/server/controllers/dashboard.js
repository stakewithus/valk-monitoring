'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _query = require('../../plugins/prometheus-client/query');

var _query2 = _interopRequireDefault(_query);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getCpuUsageMetrics = function getCpuUsageMetrics(_ref, res) {
  var query = _ref.query,
      capture = _ref.capture;
  return async function (args) {
    var start = query.get('start');
    var end = query.get('end');
    var step = query.get('step');
    var data = await (0, _query2.default)({
      query: '100 - (avg by (instance) (irate(node_cpu_seconds_total{job="node",mode="idle"}[5m])) * 100)',
      start: start,
      end: end,
      step: step
    });
    var ret = data;
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getMemoryUsageMetrics = function getMemoryUsageMetrics(_ref2, res) {
  var query = _ref2.query,
      capture = _ref2.capture;
  return async function (args) {
    var start = query.get('start');
    var end = query.get('end');
    var step = query.get('step');
    var data = await (0, _query2.default)({
      query: '100 * (1 - ((avg_over_time(node_memory_MemFree_bytes[5m]) + avg_over_time(node_memory_Cached_bytes[5m]) + avg_over_time(node_memory_Buffers_bytes[5m])) / avg_over_time(node_memory_MemTotal_bytes[5m])))',
      start: start,
      end: end,
      step: step
    });
    var ret = data;
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getDiskUsageMetrics = function getDiskUsageMetrics(_ref3, res) {
  var query = _ref3.query,
      capture = _ref3.capture;
  return async function (args) {
    var start = query.get('start');
    var end = query.get('end');
    var step = query.get('step');
    var data = await (0, _query2.default)({
      query: '100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} * 100) / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"})',
      start: start,
      end: end,
      step: step
    });
    var ret = data;
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getNetworkIOMetrics = function getNetworkIOMetrics(_ref4, res) {
  var query = _ref4.query,
      capture = _ref4.capture;
  return async function (args) {
    var start = query.get('start');
    var end = query.get('end');
    var step = query.get('step');
    var data = await _promise2.default.all([(0, _query2.default)({
      query: 'irate(node_network_receive_bytes_total[5m])/1024/1024',
      start: start,
      end: end,
      step: step
    }), (0, _query2.default)({
      query: 'irate(node_network_transmit_bytes_total[5m])/1024/1024',
      start: start,
      end: end,
      step: step
    })]);
    var ret = data;
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

exports.default = {
  getCpuUsageMetrics: getCpuUsageMetrics,
  getMemoryUsageMetrics: getMemoryUsageMetrics,
  getDiskUsageMetrics: getDiskUsageMetrics,
  getNetworkIOMetrics: getNetworkIOMetrics
};
//# sourceMappingURL=dashboard.js.map
