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


const NomadAPI = async (host, port) => {
  const fPath = path.join(__dirname, '../', 'fixtures');
  const fileList = await fs.readdirAsync(fPath);
  const pList = await Promise.all(fileList.filter((f) => f.indexOf('.hcl') === -1)
    .map(getFileContent(fPath)));
  const nomadApi = pList.reduce((acc, row) => ({ ...acc, ...row }), {});

  const baseUri = `http://${host}:${port}`;
  nock(baseUri).get('/v1/nodes').times(3).reply(200, nomadApi.NodeList1);
  nock(baseUri).get('/v1/node/7314889b-0aeb-00e1-8b67-98de3ef8e4db').times(3).reply(200, nomadApi.NodeRead1);
  nock(baseUri).get('/v1/node/de888c16-29b1-4d35-221e-332b5b9097f4').reply(404, {});
  nock(baseUri).get('/v1/node/7314889b-0aeb-00e1-8b67-98de3ef8e4db/allocations').reply(200, []);

  nock(baseUri).get('/v1/jobs').reply(200, []);

  nock(baseUri)
    .post('/v1/jobs/parse', (body) => {
      const { JobHCL: jobHCL } = body;
      if (typeof jobHCL === 'undefined') return false;
      return true;
    })
    .times(3)
    .reply(200, nomadApi.JobParse1);

  nock(baseUri)
    .post('/v1/job/blockchain-client/plan', (body) => {
      const { Job: jobDef } = body;
      if (typeof jobDef === 'undefined') return false;
      const {
        ID: jobId,
      } = jobDef;
      if (typeof jobId !== 'undefined') return true;
      return false;
    })
    .reply(200, nomadApi.JobPlan1);

  nock(baseUri)
    .post('/v1/jobs', (body) => {
      const { Job: jobDef } = body;
      if (typeof jobDef === 'undefined') return false;
      const {
        ID: jobId,
      } = jobDef;
      if (typeof jobId !== 'undefined') return true;
      return false;
    })
    .reply(200, nomadApi.JobCreate1);

  nock(baseUri)
    .get('/v1/job/blockchain-client')
    .reply(200, nomadApi.JobRead1);

  nock(baseUri)
    .post('/v1/jobs/parse', (body) => {
      const { JobHCL: jobHCL } = body;
      if (typeof jobHCL === 'undefined') return false;
      return true;
    })
    .times(3)
    .reply(200, nomadApi.JobParse2);

  nock(baseUri)
    .post('/v1/job/blockchain-client/plan', (body) => {
      const { Job: jobDef } = body;
      if (typeof jobDef === 'undefined') return false;
      const {
        ID: jobId,
      } = jobDef;
      if (typeof jobId !== 'undefined') return true;
      return false;
    })
    .reply(200, nomadApi.JobPlan2);

  nock(baseUri)
    .post('/v1/job/blockchain-client', (body) => {
      const { Job: jobDef } = body;
      if (typeof jobDef === 'undefined') return false;
      const {
        ID: jobId,
      } = jobDef;
      if (typeof jobId !== 'undefined') return true;
      return false;
    })
    .reply(200, nomadApi.JobUpdate1);

  nock(baseUri)
    .get('/v1/job/blockchain-client/allocations')
    .reply(200, nomadApi.JobAllocations1);

  console.log('Nocks done');
  return {};
};

export default NomadAPI;
