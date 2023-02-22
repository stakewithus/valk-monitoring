'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _twilio = require('twilio');

var _twilio2 = _interopRequireDefault(_twilio);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'notification/twilio' });

var generateMessage = function generateMessage(rows) {
  return rows.reduce(function (acc, r) {
    var keys = (0, _keys2.default)(r);
    var line = keys.reduce(function (acc1, key) {
      var text = key + ': ' + r[key] + '\n';
      return '' + acc1 + text;
    }, '');
    return '' + acc + (acc ? '\n\n' : '') + line;
  }, '');
};

var sendSMS = async function sendSMS(message) {
  var Client = (0, _twilio2.default)(process.env.TWILIO_ACCOUNT_ID, process.env.TWILIO_SECRET_TOKEN);
  try {
    var res = await Client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_PHONE,
      to: process.env.TWILIO_TO_PHONE
    });
    if (res) {
      return res.sid;
    }
    return null;
  } catch (e) {
    logger.error('Twilio send SMS error', e && e.toString());
    return null;
  }
};

var sendCall = async function sendCall(message, toPhone) {
  if (!toPhone) {
    logger.error('Twilio phone is empty');
    return null;
  }
  var Client = (0, _twilio2.default)(process.env.TWILIO_ACCOUNT_ID, process.env.TWILIO_SECRET_TOKEN);
  try {
    var res = await Client.calls.create({
      url: process.env.API_DOMAIN + '/api/v1/twilio/' + message,
      from: process.env.TWILIO_FROM_PHONE,
      to: toPhone
    });
    if (res) {
      return res.sid;
    }
    return null;
  } catch (e) {
    logger.error('Twilio send call error', e && e.toString());
    return null;
  }
};

exports.default = {
  sendSMS: sendSMS,
  sendCall: sendCall,
  generateMessage: generateMessage
};
//# sourceMappingURL=twilio.js.map
