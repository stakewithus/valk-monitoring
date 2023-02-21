import {
  assert,
} from 'chai';
import Bluebird from 'bluebird';
import fs from 'fs';
import nock from 'nock';
import sinon from 'sinon';
import moment from 'moment';
import TestUtil from '../common/test-util';
import NockConsulAPI from '../plugins/backends/consul2/nocks/api';
import NockNomadAPI from '../plugins/schedulers/nomad2/nocks/api';
import NockTendermintAPI from '../plugins/chains/tendermint/nocks';

import {
  parse,
} from '../plugins/influxdb-client/line-protocol';
import Monit from './index';
import Notification from '../notification';
import Twilio from '../notification/twilio';
import Constant from './constant';

Bluebird.promisifyAll(fs);
const time = Math.floor(Date.now() / 1000) - 1565928376;
const nockMoreConsulAPI = async (host, port) => {
  const baseUri = `http://${host}:${port}`;
  const MockContents = await TestUtil.getFolderContent('monit/fixtures');
  nock(baseUri)
    .put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/block-height')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/block-time')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-total')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-inbound')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-outbound')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/catching-up')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/block-height')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/block-time')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/peers-total')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/peers-inbound')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/peers-outbound')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/status/catching-up')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/kv/projects/global/bcl-commit-hub/unknown/commits/958445/EA741AD0F8A3B579781243D15A79E99B51F3B60E')
    .query({
      cas: 0,
    })
    .reply(200, true);
  nock(baseUri)
    .delete('/v1/kv/projects/global/bcl-commit-hub/unknown/commits/958245/EA741AD0F8A3B579781243D15A79E99B51F3B60E')
    .reply(200, true);
  nock(baseUri)
    .put('/v1/agent/check/pass/service:bcl-commit-hub:3')
    .query({
      note: '',
    })
    .reply(200, '');
  nock(baseUri)
    .put('/v1/agent/check/fail/service:bcl-commit-hub:4')
    .query({
      note: `${time}s`,
    })
    .reply(200, '');
  nock(baseUri)
    .put('/v1/agent/check/fail/service:bcl-commit-hub:5')
    .query({
      note: '3peers',
    })
    .reply(200, '');
  nock(baseUri)
    .get('/v1/kv/projects/global/bcl-commit-hub/unknown/status/block-height')
    .reply(200, MockContents.BlockHeight);
  nock(baseUri)
    .put('/v1/txn')
    .times(10)
    .reply(200, '');
  nock(baseUri)
    .get('/v1/kv/apm/settings/muted-nodes')
    .times(2)
    .reply(200, '');
  nock(baseUri)
    .get('/v1/kv/apm/settings/threshold/default')
    .times(2)
    .reply(200, '');
  nock(baseUri)
    .get('/v1/kv/apm/settings/threshold/custom')
    .times(2)
    .reply(200, '');
  nock(baseUri)
    .get('/v1/kv/apm/settings/validator-addresses')
    .times(2)
    .reply(200, '');
  nock(baseUri)
    .get('/v1/kv/projects/global/bcl-commit-hub/unknown/commits?keys=true')
    .reply(200, [
      'projects/global/bcl-commit-hub/unknown/commits/958214/EA741AD0F8A3B579781243D15A79E99B51F3B60E',
      'projects/global/bcl-commit-hub/unknown/commits/958215/EA741AD0F8A3B579781243D15A79E99B51F3B60E',
    ]);
};

const nockMoreTendermintApi = async (host, port) => {
  const baseUri = `http://${host}:${port}`;
  const MockContents = await TestUtil.getFolderContent('monit/fixtures');
  nock(baseUri)
    .get('/block')
    .query({
      height: 958445,
    })
    .reply(200, MockContents.Block958445);
};

const nockSlackCall = async () => {
  nock('https://hooks.slack.com')
    .post('/')
    .times(2)
    .reply(200, true);
};

const nockInfluxDbRequest = async (host, port) => {
  const baseUri = `http://${host}:${port}`;
  const dbName = 'apm';
  const precision = 'ms';
  const blockCommits = [{
    measurement: 'block_commits',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub',
    },
    fields: {
      block_height: '"958444"',
      missed: '"false"',
    },
    timestamp: 1565873240694,
  },
  {
    measurement: 'block_commits',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub',
    },
    fields: {
      block_height: '"958445"',
      missed: '"true"',
    },
    timestamp: 1565928376000,
  },
  ];
  const healthChecks = [
    [{
      measurement: 'health_checks',
      tags: {
        nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
        region: 'ap-southeast-1a',
        network: 'unknown',
        project: 'bcl-commit-hub',
        type: Constant.CHECK_NAMES.TM_PEER_COUNT,
        status: 'CRITICAL',
      },
      fields: {
        host: '"127.0.0.1"',
        note: '"3peers"',
        check_id: '"service:bcl-commit-hub:5"',
        block_height: '"958446"',
        block_time: '"1565928376"',
      },
    }],
    [{
      measurement: 'health_checks',
      tags: {
        nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
        region: 'ap-southeast-1a',
        network: 'unknown',
        project: 'bcl-commit-hub',
        type: Constant.CHECK_NAMES.TM_LATE_BLOCK_TIME,
        status: 'CRITICAL',
      },
      fields: {
        host: '"127.0.0.1"',
        note: `"${time}s"`,
        check_id: '"service:bcl-commit-hub:4"',
        block_height: '"958446"',
        block_time: '"1565928376"',
      },
    }],
    [{
      measurement: 'health_checks',
      tags: {
        nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
        region: 'ap-southeast-1a',
        network: 'unknown',
        project: 'bcl-commit-hub',
        type: Constant.CHECK_NAMES.TM_MISSED_BLOCK,
        status: 'CRITICAL',
      },
      fields: {
        host: '"127.0.0.1"',
        note: '"5"',
        check_id: '"service:bcl-commit-hub:3"',
        block_height: '"958446"',
        block_time: '"1565928376"',
      },
    }],
  ];
  const peerCounts = [{
    measurement: 'peer_counts',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub',
      region: 'ap-southeast-1a',
    },
    fields: {
      inbound: '"3"',
      outbound: '"0"',
      total: '"3"',
    },
    timestamp: moment().startOf('h').valueOf(),
  }];

  const blockHeights = [{
    measurement: 'block_heights',
    tags: {
      network: 'unknown',
      project: 'bcl-commit-hub',
      region: 'ap-southeast-1a',
    },
    fields: {
      height: 958446,
    },
    timestamp: 1565928376000,
  }];

  // block commits
  nock(baseUri)
    .post('/write', parse(blockCommits))
    .query({
      db: dbName,
      precision,
    })
    .reply(204, '');

  // health checks
  healthChecks.forEach((hc) => {
    nock(baseUri)
      .post('/write', parse(hc))
      .query({
        db: dbName,
        precision,
      })
      .reply(204, '');
  });

  // peer counts
  nock(baseUri)
    .post('/write', parse(peerCounts))
    .query({
      db: dbName,
      precision,
    })
    .reply(204, '');

  // block heights
  nock(baseUri)
    .post('/write', parse(blockHeights))
    .query({
      db: dbName,
      precision,
    })
    .reply(204, '');
};

describe('# Monit Command', () => {
  before(() => {
    process.env.SLACK_INCOMING_WEBHOOK = 'https://hooks.slack.com';
    sinon.stub(Twilio, 'sendSMS').returns(Promise.resolve());
    sinon.stub(Twilio, 'sendCall').returns(Promise.resolve());
  });
  beforeEach(async () => {
    await NockConsulAPI('127.0.0.1', 8500);
    await NockTendermintAPI('127.0.0.1', 46657);
    await nockMoreConsulAPI('127.0.0.1', 8500);
    await nockMoreTendermintApi('127.0.0.1', 46657);
    await nockSlackCall();
    await nockInfluxDbRequest('127.0.0.1', 8086);
  });
  describe('# Should run monit command with config file correctly', async () => {
    const slackSpy = sinon.spy(Notification, 'sendToSlack');
    const twilioSpy = sinon.spy(Notification, 'sendToTwilio');
    const expected = [{
      network: 'unknown',
      project: 'commit-hub',
      region: 'ap-southeast-1a',
      ip: '127.0.0.1',
      nodeId: '7314889b-0aeb-00e1-8b67-98de3ef8e4db',
      healthChecks: {
        'tm-late-block-time': {
          checkId: 'service:bcl-commit-hub:4',
          time,
          note: `${time}s`,
          status: 'CRITICAL',
          prevStatus: 'WARNING',
          response: '',
        },
        'tm-missed-blocks-StakeWithUs': {
          checkId: 'service:bcl-commit-hub:3',
          status: 'PASSING',
          prevStatus: 'PASSING',
          response: '',
          note: '',
        },
        'tm-peer-count': {
          peers: 3,
          checkId: 'service:bcl-commit-hub:5',
          status: 'CRITICAL',
          prevStatus: 'CRITICAL',
          note: '3peers',
          response: '',
        },
      },
    }];
    it('should have correct response', async () => {
      await NockNomadAPI('127.0.0.1', 4646);
      const response = await Monit.run({
        node: '127.0.0.1',
        consulPort: 8500,
        nomadPort: 4646,
        config: 'config',
        prodConfigFile: 'prod-config/config.json',
      });
      // console.dir(response, { depth: null });
      assert.deepEqual(response, expected);
      assert.equal(slackSpy.calledOnce, true);
      assert.equal(twilioSpy.calledOnce, true);
    });
    it('should run command with production config file correctly', async () => {
      const response = await Monit.run({
        node: '127.0.0.1',
        consulPort: 8500,
        production: true,
        prodConfigFile: 'prod-config/config.json',
      });
      assert.isNull(response);
    });
  });
});
