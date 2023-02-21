'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _service = require('./service');

var _service2 = _interopRequireDefault(_service);

var _influxStore = require('../influx-store');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var persistData = async function persistData() {
  var blockHeight = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var denoms = arguments[1];
  var exchangeRates = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  var votingRates = await _service2.default.getVotingRates();
  if (!votingRates || votingRates.length === 0) {
    return null;
  }
  denoms.map(function (denom) {
    var votingRate = votingRates.find(function (rate) {
      return rate.denom === denom;
    });
    var networkRate = exchangeRates.find(function (r) {
      return r.denom === denom;
    });
    if (networkRate) {
      networkRate.swu_amount = votingRate && votingRate.exchange_rate;
    }
  });
  exchangeRates = exchangeRates.filter(function (er) {
    return er.amount && er.swu_amount;
  });
  return (0, _influxStore.saveTerraOracleExchangeRates)({ height: blockHeight, result: exchangeRates });
};

var start = async function start(denoms) {
  var _ref = await _service2.default.getExchangeRates(),
      blockHeight = _ref.blockHeight,
      networkExchangeRates = _ref.result;

  return persistData(blockHeight, denoms, networkExchangeRates);
};

var runEverySec = async function runEverySec(denoms) {
  try {
    await start(denoms);
    setTimeout(function () {
      runEverySec(denoms);
    }, 1000);
  } catch (error) {
    console.log('Error saving exchange rate');
    console.log(error);
    setTimeout(function () {
      runEverySec(denoms);
    }, 10000);
  }
};

exports.default = {
  start: start,
  runEverySec: runEverySec
};
//# sourceMappingURL=exchange-rates.js.map
