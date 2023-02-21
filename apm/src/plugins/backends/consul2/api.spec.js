import fs from 'fs';
import Bluebird from 'bluebird';

import { assert } from 'chai';
import Backend from './api';
import MockInput from './fixtures/mock_input';
import NockConsulAPI from './nocks/api';

Bluebird.promisifyAll(fs);
const persistToFile = async (fName, output) => { // eslint-disable-line
  await fs.writeFileAsync(fName, JSON.stringify(output, null, 2));
};

describe('Consul Backend Tests', () => {
  const backend = Backend();
  describe('# Consul API', () => {
    before(async () => {
      await NockConsulAPI('127.0.0.1', 8500);
    });
    const api = backend.Api;
    // const nodeID = '0aeb6c10-391e-ad19-fa61-5e28e61af5df';
    const nodeAddress = '127.0.0.1';
    describe('## Catalog', () => {
      it('should list all nodes', async () => {
        const res = await api.catalog.list();
        assert.equal(res.length, 1);
        const [node] = res;
        assert.property(node, 'Node');
        assert.property(node, 'ID');
        // assert.equal(node.ID, nodeID);
        assert.equal(node.Address, nodeAddress);
      });
    });
    describe('## Agent Pt 1', () => {
      describe('## Services Pt 1', () => {
        it('should list all services on agent', async () => {
          const res = await api.agent.service.list();
          const svcList = Object.keys(res);
          const svcRunning = svcList.length > 0;
          assert.equal(svcRunning, true);
        });
        it('should register new service on agent', async () => {
          // This endpoint on success returns 200 and a blank body, ""
          const res = await api.agent.service.upsert(MockInput.svcDef);
          assert.equal(res, '');
        });
        it('should check that service is registered on agent', async () => {
          // This endpoint on success returns 200 and a blank body, ""
          const res = await api.agent.service.list();
          const svcList = Object.keys(res);
          const svc = svcList.filter((svcName) => res[svcName].Service === 'bcl-commit-hub');
          assert.equal(typeof svc === 'undefined', false);
        });
      }); // End of Services Pt 1
      describe('## Checks Pt 1', () => {
        it('should list all checks on agent', async () => {
          const res = await api.agent.check.list();
          // Verify that we have 5 checks with serviceID bcl-commit-hub
          const chkList = Object.keys(res);
          const svcChk = chkList.filter((chkName) => res[chkName].ServiceID === 'bcl-commit-hub');
          assert.equal(svcChk.length, 5);
          // await persistToFile('api_agent_check_list_1.json', res);
        });
        it('should ttl pass check []', async () => {
          // This endpoint on success returns 200 and a blank body, ""
          const res = await api.agent.check.ttlPass('service:bcl-commit-hub:3', '1 missed blocks in last 100');
          assert.equal(res, '');
          // await persistToFile('api_agent_check_ttl_pass_1.json', res);
        });
        it('should ttl warn check []', async () => {
          const res = await api.agent.check.ttlWarn('service:bcl-commit-hub:4', 'Last block time is 40s behind current time');
          assert.equal(res, '');
        });
        it('should ttl fail check []', async () => {
          const res = await api.agent.check.ttlFail('service:bcl-commit-hub:5', 'Peer count has dropped below 5');
          assert.equal(res, '');
        });
        it('should list all checks on agent again', async () => {
          const res = await api.agent.check.listByFilter('ServiceID == "bcl-commit-hub"');
          // Verify that we have 5 checks with serviceID bcl-commit-hub
          const chkList = Object.keys(res);
          assert.equal(chkList.length, 5);
          assert.equal(res['service:bcl-commit-hub:3'].Status, 'passing');
          assert.equal(res['service:bcl-commit-hub:4'].Status, 'warning');
          assert.equal(res['service:bcl-commit-hub:5'].Status, 'critical');
          // await persistToFile('api_agent_check_list_3.json', res);
        });
      }); // End of Checks Pt 1
    }); // End of Agent Pt 1
    describe('## KV Store Pt 1', () => {
      // K/V Paths
      // projects/commit-hub/crust-2/
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/peers-total
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/peers-inbound
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/peers-outbound
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/query-response-time
      // projects/commit-hub/crust-2/commits/100/swstest19
      it('should list k/v at path projects/commit-hub/crust-2/', async () => {
        // Expect 404 Error
        try {
          await api.kv.list('projects/commit-hub/crust-2/');
          assert.fail();
        } catch (e) {
          assert.equal(e instanceof Error, true);
          assert.equal(e.statusCode, 404);
        }
      });
      it('should set k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', async () => {
        // Returns a boolean: true | false
        // StatusCode 200
        const res = await api.kv.upsert('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', 100, { cas: 0 });
        assert.equal(res, true);
      });
      it('should get k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', async () => {
        const res = await api.kv.get('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height');
        assert.equal(res.length, 1);
        const [k] = res;
        assert.equal(k.Key, 'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height');
        const b = Buffer.from(k.Value, 'base64');
        const v = JSON.parse(b.toString('utf-8'));
        assert.equal(v, '100');
        // await persistToFile('api_kv_node_block_height.json', res);
      });

      it('should set k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time', async () => {
        // Returns a boolean: true | false
        // StatusCode 200
        const res = await api.kv.upsert('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time', 1566884093, { cas: 0 });
        assert.equal(res, true);
      });
      it('should get k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time', async () => {
        const res = await api.kv.get('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time');
        assert.equal(res.length, 1);
        const [k] = res;
        assert.equal(k.Key, 'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time');
        const b = Buffer.from(k.Value, 'base64');
        const v = JSON.parse(b.toString('utf-8'));
        assert.equal(v, '1566884093');
        // await persistToFile('api_kv_node_block_time.json', res);
      });

      it('should set k/v at path projects/commit-hub/crust-2/commits/1000/<stakewithus address>', async () => {
        // Returns a boolean: true | false
        // StatusCode 200
        const res = await api.kv.upsert('projects/commit-hub/crust-2/commits/1000/swstest19', true, { cas: 0 });
        assert.equal(res, true);
      });
      it('should get k/v at path projects/commit-hub/crust-2/commits/1000/<stakewithus address>', async () => {
        const res = await api.kv.get('projects/commit-hub/crust-2/commits/1000/swstest19');
        assert.equal(res.length, 1);
        const [k] = res;
        assert.equal(k.Key, 'projects/commit-hub/crust-2/commits/1000/swstest19');
        const b = Buffer.from(k.Value, 'base64');
        const v = JSON.parse(b.toString('utf-8'));
        assert.equal(v, 'true');
        // await persistToFile('api_kv_commit_block_validator.json', res);
      });
      it('should list k/v at path projects/commit-hub/crust-2/', async () => {
        const res = await api.kv.list('projects/commit-hub/crust-2/');
        const expected = [
          'projects/commit-hub/crust-2/commits/1000/swstest19',
          'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height',
          'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time',
        ];
        assert.deepEqual(res, expected);
        // await persistToFile('api_kv_project_level.json', res);
      });
      it('should delete k/v at path projects/commit-hub/crust-2/', async () => {
        // Returns a boolean: true | false
        // StatusCode 200
        const res = await api.kv.del('projects/commit-hub/crust-2/', { recurse: true });
        assert.equal(res, true);
      });
    }); // End of Agent Pt 1
    describe('## Agent Pt 2', () => {
      describe('## Services Pt 2', () => {
        /*
        it('should get health of service on agent', async () => {
          assert.throws('Not implemented');
        });
        */
        it('should deregister service on agent', async () => {
        // Returns a blank string on success
        // StatusCode 200
          const res = await api.agent.service.destroy('bcl-commit-hub');
          assert.equal(res, '');
        });
      }); // End of Services Pt 2
    }); // End of Agent Pt 2
  }); // End of Consul API
});
