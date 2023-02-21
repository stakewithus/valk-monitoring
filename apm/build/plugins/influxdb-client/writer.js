'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _lineProtocol = require('./line-protocol');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_request2.default);

var write = async function write(host, db, points) {
  var rhost = host;
  if (!rhost) {
    rhost = process.env.INFLUXDB_HOST && process.env.INFLUXDB_PORT ? process.env.INFLUXDB_HOST + ':' + process.env.INFLUXDB_PORT : 'http://127.0.0.1:8086';
  }
  var lineMsg = (0, _lineProtocol.parse)(points);
  var res = await _request2.default.postAsync({
    uri: rhost + '/write',
    qs: {
      db: db,
      precision: 'ms'
    },
    body: lineMsg
  });

  var _res$toJSON = res.toJSON(),
      statusCode = _res$toJSON.statusCode,
      body = _res$toJSON.body;

  if (statusCode === 204 && body === '') {
    return true;
  }
  console.log('Influxdb writer response:', statusCode, body);
  return false;
};

exports.default = function (_ref) {
  var host = _ref.host;
  return {
    writePoints: function writePoints(db) {
      return function (points) {
        return write(host, db, points);
      };
    }
  };
};
//# sourceMappingURL=writer.js.map
