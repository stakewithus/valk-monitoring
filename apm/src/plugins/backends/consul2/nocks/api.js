import fs from 'fs';
import path from 'path';
import Bluebird from 'bluebird';
import nock from 'nock';

Bluebird.promisifyAll(fs);

const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Thanks Tan for this snippet
const getFileContent = (fPath) => async (fName) => {
  const rawData = await fs.readFileAsync(path.join(fPath, fName));
  const fData = JSON.parse(rawData);
  const { 0: kName } = fName.split('.json');
  const [, ...listName] = kName.split('_');
  const name = listName.map(upperFirst).join('');
  return { [name]: fData };
};


const ConsulAPI = async (host, port) => {
  const fPath = path.join(__dirname, '../', 'fixtures');
  const fileList = await fs.readdirAsync(fPath);
  const pList = await Promise.all(fileList.filter((f) => f.indexOf('.json') > -1)
    .map(getFileContent(fPath)));
  const consulApi = pList.reduce((acc, row) => ({ ...acc, ...row }), {});

  const baseUri = `http://${host}:${port}`;
  nock(baseUri).get('/v1/catalog/nodes').times(3).reply(200, consulApi.CatalogList1);
  nock(baseUri).get('/v1/agent/services').reply(200, consulApi.AgentServiceList1);

  nock(baseUri)
    .put('/v1/agent/service/register', (body) => {
      const {
        ID,
        Port,
        Checks,
      } = body;
      if (typeof ID === 'undefined') return false;
      if (typeof Port === 'undefined') return false;
      if (typeof Checks === 'undefined') return false;
      return true;
    })
    .reply(200, '');

  nock(baseUri).get('/v1/agent/services').times(2).reply(200, consulApi.AgentServiceList2);
  nock(baseUri).get('/v1/agent/checks').times(2).reply(200, consulApi.AgentCheckList2);
  nock(baseUri)
    .get('/v1/agent/checks')
    .query({ filter: 'ServiceID == "bcl-commit-hub"' })
    .reply(200, consulApi.AgentCheckList3);

  nock(baseUri)
    .put('/v1/agent/check/pass/service:bcl-commit-hub:3')
    .query({ note: '1 missed blocks in last 100' })
    .reply(200, '');

  nock(baseUri)
    .put('/v1/agent/check/warn/service:bcl-commit-hub:4')
    .query({ note: 'Last block time is 40s behind current time' })
    .reply(200, '');

  nock(baseUri)
    .put('/v1/agent/check/fail/service:bcl-commit-hub:5')
    .query({ note: 'Peer count has dropped below 5' })
    .reply(200, '');

  const kvPrefix = '/v1/kv/projects/commit-hub/crust-2/';
  nock(baseUri)
    .get(`${kvPrefix}`)
    .query({ keys: true })
    .reply(404, '');

  nock(baseUri)
    .put(`${kvPrefix}nodes/ap-southeast-1/block-height`, (body) => {
      if (body === JSON.stringify(100)) return true;
      return false;
    })
    .query({ cas: 0 })
    .reply(200, true);

  nock(baseUri)
    .get(`${kvPrefix}nodes/ap-southeast-1/block-height`)
    .reply(200, consulApi.KvNodeBlockHeight);

  nock(baseUri)
    .get('/v1/kv/apm/settings/validator-addresses/bcl-commit-hub/unknown')
    .reply(200, '');

  nock(baseUri)
    .put(`${kvPrefix}nodes/ap-southeast-1/block-time`, (body) => {
      if (body === JSON.stringify(1566884093)) return true;
      return false;
    })
    .query({ cas: 0 })
    .reply(200, true);

  nock(baseUri)
    .get(`${kvPrefix}nodes/ap-southeast-1/block-time`)
    .reply(200, consulApi.KvNodeBlockTime);

  nock(baseUri)
    .put(`${kvPrefix}commits/1000/swstest19`, (body) => {
      if (body === JSON.stringify(true)) return true;
      return false;
    })
    .query({ cas: 0 })
    .reply(200, true);

  nock(baseUri)
    .get(`${kvPrefix}commits/1000/swstest19`)
    .reply(200, consulApi.KvCommitBlockValidator);

  nock(baseUri)
    .get(`${kvPrefix}`)
    .query({ keys: true })
    .reply(200, consulApi.KvProjectLevel);

  nock(baseUri)
    .delete(`${kvPrefix}`)
    .query({ recurse: true })
    .reply(200, true);

  nock(baseUri)
    .put('/v1/agent/service/deregister/bcl-commit-hub')
    .reply(200, '');
};

export default ConsulAPI;
