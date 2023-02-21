'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _chai = require('chai');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _api = require('./nock/api');

var _api2 = _interopRequireDefault(_api);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _twilio = require('../../notification/twilio');

var _twilio2 = _interopRequireDefault(_twilio);

var _notification = require('../../notification');

var _notification2 = _interopRequireDefault(_notification);

var _service = require('./service');

var _service2 = _interopRequireDefault(_service);

var _exchangeRates = require('./exchange-rates');

var _exchangeRates2 = _interopRequireDefault(_exchangeRates);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var nockSlackCall = async function nockSlackCall() {
  (0, _nock2.default)('https://hooks.slack.com').post('/').reply(200, true);
};

describe('# Monitoring Terra', function () {
  before(async function () {
    process.env.TERRA_LCD = '127.0.0.1:1321';
    process.env.TERRA_ORACLE_VALIDATOR_ADDRESS = 'terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz';
    process.env.SLACK_INCOMING_WEBHOOK = 'https://hooks.slack.com';

    var _process$env$TERRA_LC = process.env.TERRA_LCD.split(':'),
        _process$env$TERRA_LC2 = (0, _slicedToArray3.default)(_process$env$TERRA_LC, 2),
        host = _process$env$TERRA_LC2[0],
        port = _process$env$TERRA_LC2[1];

    await (0, _api2.default)(host, port);
    await nockSlackCall();
    _sinon2.default.stub(_twilio2.default, 'sendSMS').returns(_promise2.default.resolve());
    _sinon2.default.stub(_twilio2.default, 'sendCall').returns(_promise2.default.resolve());
  });
  it('Should run successfully', async function () {
    var slackSpy = _sinon2.default.spy(_notification2.default, 'sendToSlack');
    var twilioSpy = _sinon2.default.spy(_notification2.default, 'sendToTwilio');
    await _index2.default.run({
      node: '127.0.0.1',
      consulPort: 8500
    });
    _chai.assert.equal(slackSpy.calledOnce, true);
    _chai.assert.equal(twilioSpy.calledOnce, true);
  });
  it('Should fetch exchange rate without error', async function () {
    var activeDenoms = await _service2.default.getActiveDenoms();
    await _exchangeRates2.default.start(activeDenoms);
  });
});
//# sourceMappingURL=index.spec.js.map
