import service from './service';
import { saveTerraOracleExchangeRates } from '../influx-store';

const persistData = async (blockHeight = 0, denoms, exchangeRates = []) => {
  const votingRates = await service.getVotingRates();
  if (!votingRates || votingRates.length === 0) {
    return null;
  }
  denoms.map((denom) => {
    const votingRate = votingRates.find((rate) => rate.denom === denom);
    const networkRate = exchangeRates.find((r) => r.denom === denom);
    if (networkRate) {
      networkRate.swu_amount = votingRate && votingRate.exchange_rate;
    }
  });
  exchangeRates = exchangeRates.filter((er) => er.amount && er.swu_amount);
  return saveTerraOracleExchangeRates({ height: blockHeight, result: exchangeRates });
};

const start = async (denoms) => {
  const { blockHeight, result: networkExchangeRates } = await service.getExchangeRates();
  return persistData(blockHeight, denoms, networkExchangeRates);
};

const runEverySec = async (denoms) => {
  try {
    await start(denoms);
    setTimeout(() => {
      runEverySec(denoms);
    }, 1000);
  } catch (error) {
    console.log('Error saving exchange rate');
    console.log(error);
    setTimeout(() => {
      runEverySec(denoms);
    }, 10000);
  }
};

export default {
  start,
  runEverySec,
};
