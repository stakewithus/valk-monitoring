'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_request2.default);

var execQuery = async function execQuery(_ref) {
  var host = _ref.host,
      db = _ref.db,
      query = _ref.query,
      params = _ref.params;

  var rhost = host;
  if (!rhost) {
    rhost = process.env.INFLUXDB_HOST && process.env.INFLUXDB_PORT ? process.env.INFLUXDB_HOST + ':' + process.env.INFLUXDB_PORT : 'http://127.0.0.1:8086';
  }
  var response = await _request2.default.postAsync({
    uri: rhost + '/query',
    qs: {
      db: db,
      q: query,
      params: (0, _stringify2.default)(params)
    }
  });
  var data = JSON.parse(response.body);
  if (data.error) throw new Error(data.error);
  return data.results;
};

exports.default = function (_ref2) {
  var host = _ref2.host;
  return function (db) {
    return {
      exec: function exec(_ref3) {
        var query = _ref3.query,
            params = _ref3.params;
        return execQuery({
          host: host,
          db: db,
          query: query,
          params: params
        });
      }
    };
  };
};
//# sourceMappingURL=query.js.map
