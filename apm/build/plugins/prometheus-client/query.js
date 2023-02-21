'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_request2.default);

var query = async function query(_ref) {
  var query = _ref.query,
      start = _ref.start,
      end = _ref.end,
      _ref$step = _ref.step,
      step = _ref$step === undefined ? '15s' : _ref$step;

  var response = await _request2.default.getAsync(process.env.PROMETHEUS_API_URL + '/query_range', {
    qs: {
      query: query, start: start, end: end, step: step
    }
  });
  var data = JSON.parse(response.body);
  return data;
};

exports.default = query;
//# sourceMappingURL=query.js.map
