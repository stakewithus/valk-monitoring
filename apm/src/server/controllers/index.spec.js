import { assert } from 'chai';
import request from 'supertest';
import nock from 'nock';
import NockNomadAPI from '../../plugins/schedulers/nomad2/nocks/api';
import NockTendermintAPI from '../../plugins/chains/tendermint/nocks';
import NockConsulAPI from '../../plugins/backends/consul2/nocks/api';
import Server from '../server';
import TestUtil from '../../common/test-util';
import NockTerraApi from '../../monit/terra/nock/api';

const nockMoreConsulAPI = async (host, port) => {
  const baseUri = `http://${host}:${port}`;
  const MockContents = await TestUtil.getFolderContent('server/controllers/fixtures');
  nock(baseUri)
    .get('/v1/kv/projects/global?keys=true')
    .reply(200, MockContents.ListKeys);
  nock(baseUri)
    .get('/v1/kv/projects/nodes/bcl-commit-hub?keys=true')
    .reply(200, MockContents.ListKeys);
  nock(baseUri)
    .put('/v1/txn')
    .reply(200, MockContents.GetAllStatusKeys);
  nock(baseUri)
    .put('/v1/txn')
    .reply(200, MockContents.GetGlobalCommitsKeys);
  nock(baseUri)
    .put('/v1/txn')
    .reply(200, MockContents.GetNodeStatusKeys);
  nock(baseUri)
    .get('/v1/kv/apm/settings/threshold/default')
    .reply(200, MockContents.GetThresholdDefaultSetting);
  nock(baseUri)
    .get('/v1/kv/apm/settings/threshold/custom')
    .reply(200, MockContents.GetThresholdCustomSetting);
  nock(baseUri)
    .get('/v1/kv/apm/settings/validator-addresses/bcl-commit-hub/unknown')
    .times(2)
    .reply(200, '');
};

describe('# Server API', () => {
  let server = {};

  before(async () => {
    server = Server({
      node: '127.0.0.1',
      consulPort: 8500,
      production: true,
      prodConfigFile: 'prod-config/config.json',
    });
    await NockNomadAPI('127.0.0.1', 4646);
    await NockConsulAPI('127.0.0.1', 8500);
    await nockMoreConsulAPI('127.0.0.1', 8500);
    await NockTendermintAPI('127.0.0.1', 46657);
    await NockTerraApi('127.0.0.1', 1321);
  });
  describe('# Status Controller', () => {
    it('should get global status Tendermint RPC for all nodes', async () => {
      request(server)
        .get('/api/v1/status')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          assert.equal(replyBody.length, 1);
          const { 0: firstStatus } = replyBody;
          assert.equal(firstStatus.projectName, 'bcl-commit-hub');
          assert.equal(firstStatus.networkName, 'unknown');
          assert.equal(firstStatus.blockHeight, '1000');
          assert.equal(firstStatus.peersInbound, '10');
          assert.equal(firstStatus.peersOutbound, '5');
          assert.equal(firstStatus.peersTotal, '15');
          assert.deepEqual(firstStatus.commits,
            [{
              name: 'StakeWithUs',
              values: [],
            }]);
        });
    });

    it('should get global status Tendermint RPC for 1 node', async () => {
      request(server)
        .get('/api/v1/node-status/commit-hub?network=unknown&region=ap-southeast-1a')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          assert.equal(replyBody.length, 1);
          const { 0: firstStatus } = replyBody;
          assert.equal(firstStatus.projectName, 'bcl-commit-hub');
          assert.equal(firstStatus.networkName, 'unknown');
          assert.equal(firstStatus.blockHeight, '1000');
          assert.equal(firstStatus.peersInbound, '10');
          assert.equal(firstStatus.peersOutbound, '5');
          assert.equal(firstStatus.peersTotal, '15');
        });
    });
  });
  describe('# KVStore Controller', () => {
    it('should get threshold settings', async () => {
      request(server)
        .get('/api/v1/threshold-settings')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            console.log(err);
            throw err;
          }
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          const expected = {
            customSettings: {
              kava: {
                lastBlockTime: {
                  critical: 60,
                  warning: 30,
                },
                peerCounts: {
                  critical: 10,
                  warning: 5,
                },
              },
            },
            defaultSettings: {
              lastBlockTime: {
                critical: 20,
                warning: 10,
              },
              missedBlocks: {
                critical: 2,
                warning: 1,
              },
              peerCounts: {
                critical: 2,
                warning: 1,
              },
            },
          };
          assert.deepEqual(replyBody, expected);
        });
    });
    it('should get validator addresses settings', async () => {
      request(server)
        .get('/api/v1/validator-addresses')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          const expected = [{
            project: 'bcl-commit-hub',
            network: 'unknown',
            validators:
              [{
                name: 'StakeWithUs',
                address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E',
              }],
          }];
          assert.deepEqual(replyBody, expected);
        });
    });
  });
  describe('# Oracle Controller', () => {
    process.env.TERRA_LCD = '127.0.0.1:1321';
    process.env.TERRA_ORACLE_VALIDATOR_ADDRESS = 'terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz';
    it('should get oracle status', async () => {
      request(server)
        .get('/api/v1/terra/oracle/status')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) throw err;
          const expected = { misses: '10', uptime: 83.33, blockHeight: '500' };
          assert.deepEqual(res.body, expected);
        });
    });
    it('should get oracle health check', async () => {
      request(server)
        .get('/api/v1/terra/oracle/health-checks')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) throw err;
          const expected = [
            {
              name: 'Terra-LCD-Backend',
              notes: '',
              project: 'terra',
              status: 'critical',
            },
            {
              name: 'Terra-Oracle-Backend',
              notes: '',
              project: 'terra',
              status: 'passing',
            }];
          assert.deepEqual(res.body, expected);
        });
    });
  });
});
