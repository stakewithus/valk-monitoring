import Bluebird from 'bluebird';
import fs from 'fs';
import path from 'path';
import nock from 'nock';

Bluebird.promisifyAll(fs);

const getFileContent = (fPath) => async (fName) => {
  const rawData = await fs.readFileAsync(path.join(fPath, fName));
  const fData = JSON.parse(rawData);
  const { 0: kName } = fName.split('.json');
  return { [kName]: fData };
};

const TendermintApi = async (host, port) => {
  const fPath = path.join(__dirname, '../', 'fixtures');
  const fileList = await fs.readdirAsync(fPath);
  const pList = await Promise.all(fileList.map(getFileContent(fPath)));
  const tendermintApi = pList.reduce((acc, row) => ({ ...row, ...acc }), {});
  const {
    apm_block: apmBlock,
    apm_status: apmStatus,
    apm_net_info: apmNetInfo,
  } = tendermintApi;
  const baseUrl = `http://${host}:${port}`;
  nock(baseUrl).get('/status').reply(200, apmStatus);
  nock(baseUrl).get('/net_info').reply(200, apmNetInfo);
  nock(baseUrl).get('/block?height=958446').reply(200, apmBlock);
};

export default TendermintApi;
