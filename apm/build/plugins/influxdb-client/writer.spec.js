'use strict';

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

var _chai = require('chai');

var _lineProtocol = require('./line-protocol');

var _index = require('./index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('InfluxDB Writer', function () {
  var host = 'http://127.0.0.1:8086';
  var writer = (0, _index.Writer)({
    host: host
  });
  describe('writePoint', function () {
    it('it should write to the InfluxDB endpoint with a given host and payload', async function () {
      var linePoints = [{
        measurement: 'weather',
        tags: {
          location: 'us-midwest'
        },
        fields: {
          temperature: 82
        },
        timestamp: '1465839830100400200'
      }];
      var dbName = 'loom_tendermint_stats';
      var lineMsg = 'weather,location=us-midwest temperature=82 1465839830100400200';
      (0, _nock2.default)(host).post('/write', lineMsg).query({
        db: dbName,
        precision: 'ms'
      }).reply(200, {});
      var res = await writer.writePoints(dbName)(linePoints);
      _chai.assert.equal(lineMsg, (0, _lineProtocol.parse)(linePoints));
      _chai.assert.equal(res, false);
    });
    it('it should write to the InfluxDB endpoint a real new block measurement', async function () {
      var linePoints = [{
        measurement: 'loom_tendermint_stats',
        tags: {
          node_id: '1739225062b349fa0805ba823dd0155165f40be3',
          node_ip: '18.216.200.134',
          node_pub_key: 'tjiLc0c2cbcDFjz/aW1j+r39sNsDwMLP1aO6UQhXvuk=',
          node_address: 'F825EEB10F9CF76012FB155751B3A0437FC31442',
          block_height: '2603315'
        },
        fields: {
          version_block: 7,
          version_app: 0,
          msg_timestamp: '1550124342509575487',
          num_txs: 0,
          evidence_hash: '"nil"',
          proposer_address: '"C4BB2DA41B404044099DFBCD1F2537925D069EDC"'
        },
        timestamp: '1550124344'
      }];
      var dbName = 'loom_tendermint_stats';
      var lineMsg = 'loom_tendermint_stats,node_id=1739225062b349fa0805ba823dd0155165f40be3,node_ip=18.216.200.134,node_pub_key=tjiLc0c2cbcDFjz/aW1j+r39sNsDwMLP1aO6UQhXvuk\\=,node_address=F825EEB10F9CF76012FB155751B3A0437FC31442,block_height=2603315 version_block=7,version_app=0,msg_timestamp=1550124342509575487,num_txs=0,evidence_hash="nil",proposer_address="C4BB2DA41B404044099DFBCD1F2537925D069EDC" 1550124344';
      (0, _nock2.default)(host).post('/write', lineMsg).query({
        db: dbName,
        precision: 'ms'
      }).reply(204, '');
      var res = await writer.writePoints(dbName)(linePoints);
      _chai.assert.equal(lineMsg, (0, _lineProtocol.parse)(linePoints));
      _chai.assert.equal(res, true);
    });
  });
});
//# sourceMappingURL=writer.spec.js.map
