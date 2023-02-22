'use strict';

var _chai = require('chai');

var _supertest = require('supertest');

var _supertest2 = _interopRequireDefault(_supertest);

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

var _api = require('../../plugins/schedulers/nomad2/nocks/api');

var _api2 = _interopRequireDefault(_api);

var _nocks = require('../../plugins/chains/tendermint/nocks');

var _nocks2 = _interopRequireDefault(_nocks);

var _api3 = require('../../plugins/backends/consul2/nocks/api');

var _api4 = _interopRequireDefault(_api3);

var _server = require('../server');

var _server2 = _interopRequireDefault(_server);

var _testUtil = require('../../common/test-util');

var _testUtil2 = _interopRequireDefault(_testUtil);

var _api5 = require('../../monit/terra/nock/api');

var _api6 = _interopRequireDefault(_api5);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var nockMoreConsulAPI = async function nockMoreConsulAPI(host, port) {
  var baseUri = 'http://' + host + ':' + port;
  var MockContents = await _testUtil2.default.getFolderContent('server/controllers/fixtures');
  (0, _nock2.default)(baseUri).get('/v1/kv/projects/global?keys=true').reply(200, MockContents.ListKeys);
  (0, _nock2.default)(baseUri).get('/v1/kv/projects/nodes/bcl-commit-hub?keys=true').reply(200, MockContents.ListKeys);
  (0, _nock2.default)(baseUri).put('/v1/txn').reply(200, MockContents.GetAllStatusKeys);
  (0, _nock2.default)(baseUri).put('/v1/txn').reply(200, MockContents.GetGlobalCommitsKeys);
  (0, _nock2.default)(baseUri).put('/v1/txn').reply(200, MockContents.GetNodeStatusKeys);
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/threshold/default').reply(200, MockContents.GetThresholdDefaultSetting);
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/threshold/custom').reply(200, MockContents.GetThresholdCustomSetting);
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/validator-addresses/bcl-commit-hub/unknown').times(2).reply(200, '');
};

describe('# Server API', function () {
  var server = {};

  before(async function () {
    server = (0, _server2.default)({
      node: '127.0.0.1',
      consulPort: 8500,
      production: true,
      prodConfigFile: 'prod-config/config.json'
    });
    await (0, _api2.default)('127.0.0.1', 4646);
    await (0, _api4.default)('127.0.0.1', 8500);
    await nockMoreConsulAPI('127.0.0.1', 8500);
    await (0, _nocks2.default)('127.0.0.1', 46657);
    await (0, _api6.default)('127.0.0.1', 1321);
  });
  describe('# Status Controller', function () {
    it('should get global status Tendermint RPC for all nodes', async function () {
      (0, _supertest2.default)(server).get('/api/v1/status').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
        if (err) throw err;

        var _res$toJSON = res.toJSON(),
            text = _res$toJSON.text;

        var replyBody = JSON.parse(text);
        _chai.assert.equal(replyBody.length, 1);
        var firstStatus = replyBody[0];

        _chai.assert.equal(firstStatus.projectName, 'bcl-commit-hub');
        _chai.assert.equal(firstStatus.networkName, 'unknown');
        _chai.assert.equal(firstStatus.blockHeight, '1000');
        _chai.assert.equal(firstStatus.peersInbound, '10');
        _chai.assert.equal(firstStatus.peersOutbound, '5');
        _chai.assert.equal(firstStatus.peersTotal, '15');
        _chai.assert.deepEqual(firstStatus.commits, [{
          name: 'StakeWithUs',
          values: []
        }]);
      });
    });

    it('should get global status Tendermint RPC for 1 node', async function () {
      (0, _supertest2.default)(server).get('/api/v1/node-status/commit-hub?network=unknown&region=ap-southeast-1a').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
        if (err) throw err;

        var _res$toJSON2 = res.toJSON(),
            text = _res$toJSON2.text;

        var replyBody = JSON.parse(text);
        _chai.assert.equal(replyBody.length, 1);
        var firstStatus = replyBody[0];

        _chai.assert.equal(firstStatus.projectName, 'bcl-commit-hub');
        _chai.assert.equal(firstStatus.networkName, 'unknown');
        _chai.assert.equal(firstStatus.blockHeight, '1000');
        _chai.assert.equal(firstStatus.peersInbound, '10');
        _chai.assert.equal(firstStatus.peersOutbound, '5');
        _chai.assert.equal(firstStatus.peersTotal, '15');
      });
    });
  });
  describe('# KVStore Controller', function () {
    it('should get threshold settings', async function () {
      (0, _supertest2.default)(server).get('/api/v1/threshold-settings').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
        if (err) {
          console.log(err);
          throw err;
        }

        var _res$toJSON3 = res.toJSON(),
            text = _res$toJSON3.text;

        var replyBody = JSON.parse(text);
        var expected = {
          customSettings: {
            kava: {
              lastBlockTime: {
                critical: 60,
                warning: 30
              },
              peerCounts: {
                critical: 10,
                warning: 5
              }
            }
          },
          defaultSettings: {
            lastBlockTime: {
              critical: 20,
              warning: 10
            },
            missedBlocks: {
              critical: 2,
              warning: 1
            },
            peerCounts: {
              critical: 2,
              warning: 1
            }
          }
        };
        _chai.assert.deepEqual(replyBody, expected);
      });
    });
    it('should get validator addresses settings', async function () {
      (0, _supertest2.default)(server).get('/api/v1/validator-addresses').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
        if (err) throw err;

        var _res$toJSON4 = res.toJSON(),
            text = _res$toJSON4.text;

        var replyBody = JSON.parse(text);
        var expected = [{
          project: 'bcl-commit-hub',
          network: 'unknown',
          validators: [{
            name: 'StakeWithUs',
            address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E'
          }]
        }];
        _chai.assert.deepEqual(replyBody, expected);
      });
    });
  });
  describe('# Oracle Controller', function () {
    process.env.TERRA_LCD = '127.0.0.1:1321';
    process.env.TERRA_ORACLE_VALIDATOR_ADDRESS = 'terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz';
    it('should get oracle status', async function () {
      (0, _supertest2.default)(server).get('/api/v1/terra/oracle/status').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
        if (err) throw err;
        var expected = { misses: '10', uptime: 83.33, blockHeight: '500' };
        _chai.assert.deepEqual(res.body, expected);
      });
    });
    it('should get oracle health check', async function () {
      (0, _supertest2.default)(server).get('/api/v1/terra/oracle/health-checks').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
        if (err) throw err;
        var expected = [{
          name: 'Terra-LCD-Backend',
          notes: '',
          project: 'terra',
          status: 'critical'
        }, {
          name: 'Terra-Oracle-Backend',
          notes: '',
          project: 'terra',
          status: 'passing'
        }];
        _chai.assert.deepEqual(res.body, expected);
      });
    });
  });
});
//# sourceMappingURL=index.spec.js.map
