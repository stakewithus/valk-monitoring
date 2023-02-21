import { assert } from 'chai';
import Tendermint from './index';
import NockTendermintApi from './nocks';

describe('# Tendermint Chain Plugin', () => {
  before(async () => {
    await NockTendermintApi('127.0.0.1', 8888);
  });
  describe('# Tendermint RPC Node Info', () => {
    const validatorSettings = [{
      project: 'bcl-kava',
      network: 'kava-testnet-2000',
      validators: [{
        name: 'kava',
        address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E',
      }],
    }];
    it('should get correct data from the Tendermint RPC node', async () => {
      const result = await Tendermint.getNodeState('127.0.0.1', 8888, 'bcl-kava', 'kava-testnet-2000', 2000, validatorSettings);
      assert.equal(result.meta.id, '168d2769c783c314ccd909a80b3610653202135f');
      assert.equal(result.block_height, 958446);
      assert.equal(result.catching_up, false);
      assert.deepEqual(result.validator_commits, [{
        name: 'kava',
        address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E',
        commit: false,
      }]);
      assert.equal(result.block_time, 1565928376);
      assert.equal(result.total_peers, 3);
      assert.equal(result.inbound_peers, 3);
      assert.equal(result.outbound_peers, 0);
      assert.property(result, 'query_response_time_ms');
    });
  });
});
