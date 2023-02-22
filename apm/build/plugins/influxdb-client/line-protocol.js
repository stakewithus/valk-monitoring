'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/prefer-default-export */
var commaSeperator = function commaSeperator(body, wrapper) {
  return (0, _keys2.default)(body).reduce(function (acc, key, idx) {
    var valStr = String(body[key]);
    var val = valStr.replace(/[=${}()|[\]\\]/g, '\\$&');
    if (idx !== 0) {
      return acc + ',' + key + '=' + val;
    }
    return key + '=' + val;
  }, '');
};

var parsePoint = function parsePoint(_ref) {
  var measurement = _ref.measurement,
      tags = _ref.tags,
      fields = _ref.fields,
      timestamp = _ref.timestamp;

  var tagStr = commaSeperator(tags);
  var fieldStr = commaSeperator(fields);
  var lineMsg = measurement + ',' + tagStr + ' ' + fieldStr + (timestamp ? ' ' + timestamp : '');
  return lineMsg;
};

var parse = function parse(points) {
  return points.reduce(function (acc, point, idx) {
    var msg = parsePoint(point);
    if (idx !== 0) {
      return acc + '\n' + msg;
    }
    return msg;
  }, '');
};

exports.parse = parse;
//# sourceMappingURL=line-protocol.js.map
