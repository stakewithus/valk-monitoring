import nock from 'nock';
import TestUtil from '../../../common/test-util';


const nockConsulApi = async (host, port) => {
  const MockContents = await TestUtil.getFolderContent('monit/terra/nock/fixtures');
  const baseUri = `http://${host}:${port}`;
  nock(baseUri)
    .put('/v1/txn')
    .reply(200, MockContents.GetOracleMisses);
  nock(baseUri).get('/v1/agent/checks').reply(200, MockContents.GetOracleAgentChecks);
  nock(baseUri).put('/v1/kv/backend/terra/oracle/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz/miss/100').reply(200, '');
  nock(baseUri).put('/v1/agent/check/warn/oracle-terra-missing-vote?note=2').reply(200, '');
};

const TerraApi = async (host, port) => {
  const MockContents = await TestUtil.getFolderContent('monit/terra/nock/fixtures');
  const baseUri = `http://${host}:${port}`;
  nock(baseUri)
    .get('/oracle/voters/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz/miss')
    .reply(200, { height: '500', result: '10' });
  nock(baseUri)
    .get('/oracle/denoms/actives')
    .reply(200, MockContents.GetDenomActives);
  nock(baseUri)
    .get('/oracle/denoms/exchange_rates')
    .reply(200, MockContents.GetExchangeRates);
  nock(baseUri)
    .get('/oracle/denoms/umnt/votes/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz')
    .reply(200, MockContents.GetExchangeRateUmnt);
  nock(baseUri)
    .get('/oracle/denoms/usdr/votes/terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz')
    .reply(200, MockContents.GetExchangeRateUsdr);
  await nockConsulApi(host, 8500);
};

export default TerraApi;
