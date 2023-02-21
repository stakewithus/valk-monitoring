'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'notification/slack' });

var generateMessage = function generateMessage(obj) {
  var keys = (0, _keys2.default)(obj);
  return keys.reduce(function (acc, key) {
    var value = obj[key] !== undefined ? obj[key] : '';
    if (key === 'type' || key === 'status' || key === 'project' || key === 'region') {
      value = '*' + value + '*';
    }
    var text = '' + key.slice(0, 1).toUpperCase() + key.slice(1, key.length) + ': ' + value + '\n';
    return '' + acc + text;
  }, '');
};

var postToChannel = function postToChannel(webhookUrl, message) {
  var body = {
    text: message
  };
  return new _promise2.default(function (resolve, reject) {
    return (0, _request2.default)({
      uri: webhookUrl, method: 'POST', json: body
    }, function (err, res) {
      if (err) {
        logger.error('Slack send error', err && err.toString());
        return reject(err);
      }
      return resolve(res);
    });
  });
};

exports.default = {
  postToChannel: postToChannel,
  generateMessage: generateMessage
};
//# sourceMappingURL=slack.js.map
