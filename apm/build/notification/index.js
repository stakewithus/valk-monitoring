'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slack = require('./slack');

var _slack2 = _interopRequireDefault(_slack);

var _twilio = require('./twilio');

var _twilio2 = _interopRequireDefault(_twilio);

var _constant = require('../monit/constant');

var _constant2 = _interopRequireDefault(_constant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sendToSlack = function sendToSlack(data) {
  var slackMessage = _slack2.default.generateMessage(data);
  return _slack2.default.postToChannel(process.env.SLACK_INCOMING_WEBHOOK, slackMessage);
};

var sendToTwilio = function sendToTwilio(data) {
  var criticalServer = data.find(function (e) {
    return e.status === _constant2.default.HEALTH_CHECK_STATUS.CRITICAL;
  });
  if (criticalServer) {
    var callMessage = 'apm-project-' + criticalServer.project;
    var phones = process.env.TWILIO_TO_PHONE || '';
    var listPhone = phones.split(',');
    return _promise2.default.all(listPhone.filter(function (phone) {
      return phone;
    }).map(function (phone) {
      return _twilio2.default.sendCall(callMessage, phone);
    }));
  }
  return criticalServer;
};

exports.default = {
  sendToSlack: sendToSlack,
  sendToTwilio: sendToTwilio
};
//# sourceMappingURL=index.js.map
