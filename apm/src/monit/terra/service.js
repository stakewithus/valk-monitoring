import httpClient from '../../common/http_client';

const getLcdDetail = () => {
  const endpoint = process.env.TERRA_LCD;
  const [host, port] = endpoint.split(',')[0].split(':');
  return { host, port };
};

const getMissingVote = async () => {
  const { host, port } = getLcdDetail();
  return httpClient(host, port, {})(`/oracle/voters/${process.env.TERRA_ORACLE_VALIDATOR_ADDRESS}/miss`, 'GET')({});
};

const getExchangeRates = async () => {
  const { host, port } = getLcdDetail();
  const response = await httpClient(host, port, {})('/oracle/denoms/exchange_rates', 'GET')({});
  return {
    blockHeight: response.height || 0,
    result: response.result || response,
  };
};

const getActiveDenoms = async () => {
  const { host, port } = getLcdDetail();
  const response = await httpClient(host, port, {})('/oracle/denoms/actives', 'GET')({});
  return response && response.result ? response.result : response;
};

const getVotingRates = async () => {
  const { host, port } = getLcdDetail();
  try {
    const response = await httpClient(host, port, {})(`/oracle/voters/${process.env.TERRA_ORACLE_VALIDATOR_ADDRESS}/aggregate_vote`, 'GET')({});
    const exchangeRates = response && response.result && response.result.exchange_rate_tuples;
    return exchangeRates;
  } catch (err) {
    return [];
  }
};

export default {
  getMissingVote,
  getExchangeRates,
  getActiveDenoms,
  getVotingRates,
};
