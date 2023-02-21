'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _http_client = require('../../common/http_client');

var _http_client2 = _interopRequireDefault(_http_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getLcdDetail = function getLcdDetail() {
  var endpoint = process.env.TERRA_LCD;

  var _endpoint$split$0$spl = endpoint.split(',')[0].split(':'),
      _endpoint$split$0$spl2 = (0, _slicedToArray3.default)(_endpoint$split$0$spl, 2),
      host = _endpoint$split$0$spl2[0],
      port = _endpoint$split$0$spl2[1];

  return { host: host, port: port };
};

var getMissingVote = async function getMissingVote() {
  var _getLcdDetail = getLcdDetail(),
      host = _getLcdDetail.host,
      port = _getLcdDetail.port;

  return (0, _http_client2.default)(host, port, {})('/oracle/voters/' + process.env.TERRA_ORACLE_VALIDATOR_ADDRESS + '/miss', 'GET')({});
};

var getExchangeRates = async function getExchangeRates() {
  var _getLcdDetail2 = getLcdDetail(),
      host = _getLcdDetail2.host,
      port = _getLcdDetail2.port;

  var response = await (0, _http_client2.default)(host, port, {})('/oracle/denoms/exchange_rates', 'GET')({});
  return {
    blockHeight: response.height || 0,
    result: response.result || response
  };
};

var getActiveDenoms = async function getActiveDenoms() {
  var _getLcdDetail3 = getLcdDetail(),
      host = _getLcdDetail3.host,
      port = _getLcdDetail3.port;

  var response = await (0, _http_client2.default)(host, port, {})('/oracle/denoms/actives', 'GET')({});
  return response && response.result ? response.result : response;
};

var getVotingRates = async function getVotingRates() {
  var _getLcdDetail4 = getLcdDetail(),
      host = _getLcdDetail4.host,
      port = _getLcdDetail4.port;

  try {
    var response = await (0, _http_client2.default)(host, port, {})('/oracle/voters/' + process.env.TERRA_ORACLE_VALIDATOR_ADDRESS + '/aggregate_vote', 'GET')({});
    var exchangeRates = response && response.result && response.result.exchange_rate_tuples;
    return exchangeRates;
  } catch (err) {
    return [];
  }
};

exports.default = {
  getMissingVote: getMissingVote,
  getExchangeRates: getExchangeRates,
  getActiveDenoms: getActiveDenoms,
  getVotingRates: getVotingRates
};
//# sourceMappingURL=service.js.map
