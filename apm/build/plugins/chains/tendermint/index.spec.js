'use strict';

var _chai = require('chai');

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _nocks = require('./nocks');

var _nocks2 = _interopRequireDefault(_nocks);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('# Tendermint Chain Plugin', function () {
  before(async function () {
    await (0, _nocks2.default)('127.0.0.1', 8888);
  });
  describe('# Tendermint RPC Node Info', function () {
    var validatorSettings = [{
      project: 'bcl-kava',
      network: 'kava-testnet-2000',
      validators: [{
        name: 'kava',
        address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E'
      }]
    }];
    it('should get correct data from the Tendermint RPC node', async function () {
      var result = await _index2.default.getNodeState('127.0.0.1', 8888, 'bcl-kava', 'kava-testnet-2000', 2000, validatorSettings);
      _chai.assert.equal(result.meta.id, '168d2769c783c314ccd909a80b3610653202135f');
      _chai.assert.equal(result.block_height, 958446);
      _chai.assert.equal(result.catching_up, false);
      _chai.assert.deepEqual(result.validator_commits, [{
        name: 'kava',
        address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E',
        commit: false
      }]);
      _chai.assert.equal(result.block_time, 1565928376);
      _chai.assert.equal(result.total_peers, 3);
      _chai.assert.equal(result.inbound_peers, 3);
      _chai.assert.equal(result.outbound_peers, 0);
      _chai.assert.property(result, 'query_response_time_ms');
    });
  });
});
//# sourceMappingURL=index.spec.js.map
