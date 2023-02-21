'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _chai = require('chai');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _testUtil = require('../common/test-util');

var _testUtil2 = _interopRequireDefault(_testUtil);

var _api = require('../plugins/backends/consul2/nocks/api');

var _api2 = _interopRequireDefault(_api);

var _api3 = require('../plugins/schedulers/nomad2/nocks/api');

var _api4 = _interopRequireDefault(_api3);

var _nocks = require('../plugins/chains/tendermint/nocks');

var _nocks2 = _interopRequireDefault(_nocks);

var _lineProtocol = require('../plugins/influxdb-client/line-protocol');

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _notification = require('../notification');

var _notification2 = _interopRequireDefault(_notification);

var _twilio = require('../notification/twilio');

var _twilio2 = _interopRequireDefault(_twilio);

var _constant = require('./constant');

var _constant2 = _interopRequireDefault(_constant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);
var time = Math.floor(Date.now() / 1000) - 1565928376;
var nockMoreConsulAPI = async function nockMoreConsulAPI(host, port) {
  var baseUri = 'http://' + host + ':' + port;
  var MockContents = await _testUtil2.default.getFolderContent('monit/fixtures');
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/block-height').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/block-time').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-total').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-inbound').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-outbound').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/catching-up').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/block-height').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/block-time').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/peers-total').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/peers-inbound').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/peers-outbound').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/catching-up').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/kv/projects/global/bcl-commit-hub/unknown/commits/958445/EA741AD0F8A3B579781243D15A79E99B51F3B60E').query({
    cas: 0
  }).reply(200, true);
  (0, _nock2.default)(baseUri).delete('/v1/kv/projects/global/bcl-commit-hub/unknown/commits/958245/EA741AD0F8A3B579781243D15A79E99B51F3B60E').reply(200, true);
  (0, _nock2.default)(baseUri).put('/v1/agent/check/pass/service:bcl-commit-hub:3').query({
    note: ''
  }).reply(200, '');
  (0, _nock2.default)(baseUri).put('/v1/agent/check/fail/service:bcl-commit-hub:4').query({
    note: time + 's'
  }).reply(200, '');
  (0, _nock2.default)(baseUri).put('/v1/agent/check/fail/service:bcl-commit-hub:5').query({
    note: '3peers'
  }).reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/kv/projects/global/bcl-commit-hub/unknown/status/block-height').reply(200, MockContents.BlockHeight);
  (0, _nock2.default)(baseUri).put('/v1/txn').times(10).reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/muted-nodes').times(2).reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/threshold/default').times(2).reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/threshold/custom').times(2).reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/validator-addresses').times(2).reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/kv/projects/global/bcl-commit-hub/unknown/commits?keys=true').reply(200, ['projects/global/bcl-commit-hub/unknown/commits/958214/EA741AD0F8A3B579781243D15A79E99B51F3B60E', 'projects/global/bcl-commit-hub/unknown/commits/958215/EA741AD0F8A3B579781243D15A79E99B51F3B60E']);
};

var nockMoreTendermintApi = async function nockMoreTendermintApi(host, port) {
  var baseUri = 'http://' + host + ':' + port;
  var MockContents = await _testUtil2.default.getFolderContent('monit/fixtures');
  (0, _nock2.default)(baseUri).get('/block').query({
    height: 958445
  }).reply(200, MockContents.Block958445);
};

var nockSlackCall = async function nockSlackCall() {
  (0, _nock2.default)('https://hooks.slack.com').post('/').times(2).reply(200, true);
};

var nockInfluxDbRequest = async function nockInfluxDbRequest(host, port) {
  var baseUri = 'http://' + host + ':' + port;
  var dbName = 'apm';
  var precision = 'ms';
  var blockCommits = [{
    measurement: 'block_commits',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub'
    },
    fields: {
      block_height: '"958444"',
      missed: '"false"'
    },
    timestamp: 1565873240694
  }, {
    measurement: 'block_commits',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub'
    },
    fields: {
      block_height: '"958445"',
      missed: '"true"'
    },
    timestamp: 1565928376000
  }];
  var healthChecks = [[{
    measurement: 'health_checks',
    tags: {
      nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
      region: 'ap-southeast-1a',
      network: 'unknown',
      project: 'bcl-commit-hub',
      type: _constant2.default.CHECK_NAMES.TM_PEER_COUNT,
      status: 'CRITICAL'
    },
    fields: {
      host: '"127.0.0.1"',
      note: '"3peers"',
      check_id: '"service:bcl-commit-hub:5"',
      block_height: '"958446"',
      block_time: '"1565928376"'
    }
  }], [{
    measurement: 'health_checks',
    tags: {
      nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
      region: 'ap-southeast-1a',
      network: 'unknown',
      project: 'bcl-commit-hub',
      type: _constant2.default.CHECK_NAMES.TM_LATE_BLOCK_TIME,
      status: 'CRITICAL'
    },
    fields: {
      host: '"127.0.0.1"',
      note: '"' + time + 's"',
      check_id: '"service:bcl-commit-hub:4"',
      block_height: '"958446"',
      block_time: '"1565928376"'
    }
  }], [{
    measurement: 'health_checks',
    tags: {
      nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
      region: 'ap-southeast-1a',
      network: 'unknown',
      project: 'bcl-commit-hub',
      type: _constant2.default.CHECK_NAMES.TM_MISSED_BLOCK,
      status: 'CRITICAL'
    },
    fields: {
      host: '"127.0.0.1"',
      note: '"5"',
      check_id: '"service:bcl-commit-hub:3"',
      block_height: '"958446"',
      block_time: '"1565928376"'
    }
  }]];
  var peerCounts = [{
    measurement: 'peer_counts',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub',
      region: 'ap-southeast-1a'
    },
    fields: {
      inbound: '"3"',
      outbound: '"0"',
      total: '"3"'
    },
    timestamp: (0, _moment2.default)().startOf('h').valueOf()
  }];

  var blockHeights = [{
    measurement: 'block_heights',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub',
      region: 'ap-southeast-1a'
    },
    fields: {
      height: 958446
    },
    timestamp: 1565928376000
  }];

  // block commits
  (0, _nock2.default)(baseUri).post('/write', (0, _lineProtocol.parse)(blockCommits)).query({
    db: dbName,
    precision: precision
  }).reply(204, '');

  // health checks
  healthChecks.forEach(function (hc) {
    (0, _nock2.default)(baseUri).post('/write', (0, _lineProtocol.parse)(hc)).query({
      db: dbName,
      precision: precision
    }).reply(204, '');
  });

  // peer counts
  (0, _nock2.default)(baseUri).post('/write', (0, _lineProtocol.parse)(peerCounts)).query({
    db: dbName,
    precision: precision
  }).reply(204, '');

  // block heights
  (0, _nock2.default)(baseUri).post('/write', (0, _lineProtocol.parse)(blockHeights)).query({
    db: dbName,
    precision: precision
  }).reply(204, '');
};

describe('# Monit Command', function () {
  before(function () {
    process.env.SLACK_INCOMING_WEBHOOK = 'https://hooks.slack.com';
    _sinon2.default.stub(_twilio2.default, 'sendSMS').returns(_promise2.default.resolve());
    _sinon2.default.stub(_twilio2.default, 'sendCall').returns(_promise2.default.resolve());
  });
  beforeEach(async function () {
    await (0, _api2.default)('127.0.0.1', 8500);
    await (0, _nocks2.default)('127.0.0.1', 46657);
    await nockMoreConsulAPI('127.0.0.1', 8500);
    await nockMoreTendermintApi('127.0.0.1', 46657);
    await nockSlackCall();
    await nockInfluxDbRequest('127.0.0.1', 8086);
  });
  describe('# Should run monit command with config file correctly', async function () {
    var slackSpy = _sinon2.default.spy(_notification2.default, 'sendToSlack');
    var twilioSpy = _sinon2.default.spy(_notification2.default, 'sendToTwilio');
    var expected = [{
      network: 'unknown',
      project: 'commit-hub',
      region: 'ap-southeast-1a',
      ip: '127.0.0.1',
      nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
      healthChecks: {
        'tm-late-block-time': {
          checkId: 'service:bcl-commit-hub:4',
          time: time,
          note: time + 's',
          status: 'CRITICAL',
          prevStatus: 'WARNING',
          response: ''
        },
        'tm-missed-blocks-StakeWithUs': {
          checkId: 'service:bcl-commit-hub:3',
          status: 'PASSING',
          prevStatus: 'PASSING',
          response: '',
          note: ''
        },
        'tm-peer-count': {
          peers: 3,
          checkId: 'service:bcl-commit-hub:5',
          status: 'CRITICAL',
          prevStatus: 'CRITICAL',
          note: '3peers',
          response: ''
        }
      }
    }];
    it('should have correct response', async function () {
      await (0, _api4.default)('127.0.0.1', 4646);
      var response = await _index2.default.run({
        node: '127.0.0.1',
        consulPort: 8500,
        nomadPort: 4646,
        config: 'config',
        prodConfigFile: 'prod-config/config.json'
      });
      // console.dir(response, { depth: null });
      _chai.assert.deepEqual(response, expected);
      _chai.assert.equal(slackSpy.calledOnce, true);
      _chai.assert.equal(twilioSpy.calledOnce, true);
    });
    it('should run command with production config file correctly', async function () {
      var response = await _index2.default.run({
        node: '127.0.0.1',
        consulPort: 8500,
        production: true,
        prodConfigFile: 'prod-config/config.json'
      });
      _chai.assert.isNull(response);
    });
  });
});
//# sourceMappingURL=index.spec.js.map
