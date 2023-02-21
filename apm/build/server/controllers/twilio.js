'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var get = function get(_ref, res) {
  var capture = _ref.capture;
  return async function (args) {
    var _capture = (0, _slicedToArray3.default)(capture, 2),
        message = _capture[1];

    res.writeHead(200, { 'content-type': 'text/xml' });
    res.write('<?xml version="1.0" encoding="UTF-8"?><Response><Say>' + message + '</Say></Response>');
    return res;
  };
};

exports.default = {
  get: get
};
//# sourceMappingURL=twilio.js.map
