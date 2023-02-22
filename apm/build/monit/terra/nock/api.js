'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

var _testUtil = require('../../../common/test-util');

var _testUtil2 = _interopRequireDefault(_testUtil);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var nockConsulApi = async function nockConsulApi(host, port) {
  var MockContents = await _testUtil2.default.getFolderContent('monit/terra/nock/fixtures');
  var baseUri = 'http://' + host + ':' + port;
  (0, _nock2.default)(baseUri).put('/v1/txn').reply(200, MockContents.GetOracleMisses);
  (0, _nock2.default)(baseUri).get('/v1/agent/checks').reply(200, MockContents.GetOracleAgentChecks);
  (0, _nock2.default)(baseUri).put('/v1/kv/backend/terra/oracle/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz/miss/100').reply(200, '');
  (0, _nock2.default)(baseUri).put('/v1/agent/check/warn/oracle-terra-missing-vote?note=2').reply(200, '');
};

var TerraApi = async function TerraApi(host, port) {
  var MockContents = await _testUtil2.default.getFolderContent('monit/terra/nock/fixtures');
  var baseUri = 'http://' + host + ':' + port;
  (0, _nock2.default)(baseUri).get('/oracle/voters/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz/miss').reply(200, { height: '500', result: '10' });
  (0, _nock2.default)(baseUri).get('/oracle/denoms/actives').reply(200, MockContents.GetDenomActives);
  (0, _nock2.default)(baseUri).get('/oracle/denoms/exchange_rates').reply(200, MockContents.GetExchangeRates);
  (0, _nock2.default)(baseUri).get('/oracle/denoms/umnt/votes/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz').reply(200, MockContents.GetExchangeRateUmnt);
  (0, _nock2.default)(baseUri).get('/oracle/denoms/usdr/votes/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz').reply(200, MockContents.GetExchangeRateUsdr);
  await nockConsulApi(host, 8500);
};

exports.default = TerraApi;
//# sourceMappingURL=api.js.map
