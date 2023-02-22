import nock from 'nock';
import {
  assert,
} from 'chai';
import {
  parse,
} from './line-protocol';

import {
  Writer,
} from './index';

describe('InfluxDB Writer', () => {
  const host = 'http://127.0.0.1:8086';
  const writer = Writer({
    host,
  });
  describe('writePoint', () => {
    it('it should write to the InfluxDB endpoint with a given host and payload', async () => {
      const linePoints = [{
        measurement: 'weather',
        tags: {
          location: 'us-midwest',
        },
        fields: {
          temperature: 82,
        },
        timestamp: '1465839830100400200',
      }];
      const dbName = 'loom_tendermint_stats';
      const lineMsg = 'weather,location=us-midwest temperature=82 1465839830100400200';
      nock(host)
        .post('/write', lineMsg)
        .query({
          db: dbName,
          precision: 'ms',
        })
        .reply(200, {});
      const res = await writer.writePoints(dbName)(linePoints);
      assert.equal(lineMsg, parse(linePoints));
      assert.equal(res, false);
    });
    it('it should write to the InfluxDB endpoint a real new block measurement', async () => {
      const linePoints = [{
        measurement: 'loom_tendermint_stats',
        tags: {
          node_id: '1739225062b349fa0805ba823dd0155165f40be3',
          node_ip: '18.216.200.134',
          node_pub_key: 'tjiLc0c2cbcDFjz/aW1j+r39sNsDwMLP1aO6UQhXvuk=',
          node_address: 'F825EEB10F9CF76012FB155751B3A0437FC31442',
          block_height: '2603315',
        },
        fields: {
          version_block: 7,
          version_app: 0,
          msg_timestamp: '1550124342509575487',
          num_txs: 0,
          evidence_hash: '"nil"',
          proposer_address: '"C4BB2DA41B404044099DFBCD1F2537925D069EDC"',
        },
        timestamp: '1550124344',
      }];
      const dbName = 'loom_tendermint_stats';
      const lineMsg = 'loom_tendermint_stats,node_id=1739225062b349fa0805ba823dd0155165f40be3,node_ip=18.216.200.134,node_pub_key=tjiLc0c2cbcDFjz/aW1j+r39sNsDwMLP1aO6UQhXvuk\\=,node_address=F825EEB10F9CF76012FB155751B3A0437FC31442,block_height=2603315 version_block=7,version_app=0,msg_timestamp=1550124342509575487,num_txs=0,evidence_hash="nil",proposer_address="C4BB2DA41B404044099DFBCD1F2537925D069EDC" 1550124344';
      nock(host)
        .post('/write', lineMsg)
        .query({
          db: dbName,
          precision: 'ms',
        })
        .reply(204, '');
      const res = await writer.writePoints(dbName)(linePoints);
      assert.equal(lineMsg, parse(linePoints));
      assert.equal(res, true);
    });
  });
});
