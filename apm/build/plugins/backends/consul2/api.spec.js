'use strict';

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _chai = require('chai');

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _mock_input = require('./fixtures/mock_input');

var _mock_input2 = _interopRequireDefault(_mock_input);

var _api3 = require('./nocks/api');

var _api4 = _interopRequireDefault(_api3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);
var persistToFile = async function persistToFile(fName, output) {
  // eslint-disable-line
  await _fs2.default.writeFileAsync(fName, (0, _stringify2.default)(output, null, 2));
};

describe('Consul Backend Tests', function () {
  var backend = (0, _api2.default)();
  describe('# Consul API', function () {
    before(async function () {
      await (0, _api4.default)('127.0.0.1', 8500);
    });
    var api = backend.Api;
    // const nodeID = '0aeb6c10-391e-ad19-fa61-5e28e61af5df';
    var nodeAddress = '127.0.0.1';
    describe('## Catalog', function () {
      it('should list all nodes', async function () {
        var res = await api.catalog.list();
        _chai.assert.equal(res.length, 1);

        var _res = (0, _slicedToArray3.default)(res, 1),
            node = _res[0];

        _chai.assert.property(node, 'Node');
        _chai.assert.property(node, 'ID');
        // assert.equal(node.ID, nodeID);
        _chai.assert.equal(node.Address, nodeAddress);
      });
    });
    describe('## Agent Pt 1', function () {
      describe('## Services Pt 1', function () {
        it('should list all services on agent', async function () {
          var res = await api.agent.service.list();
          var svcList = (0, _keys2.default)(res);
          var svcRunning = svcList.length > 0;
          _chai.assert.equal(svcRunning, true);
        });
        it('should register new service on agent', async function () {
          // This endpoint on success returns 200 and a blank body, ""
          var res = await api.agent.service.upsert(_mock_input2.default.svcDef);
          _chai.assert.equal(res, '');
        });
        it('should check that service is registered on agent', async function () {
          // This endpoint on success returns 200 and a blank body, ""
          var res = await api.agent.service.list();
          var svcList = (0, _keys2.default)(res);
          var svc = svcList.filter(function (svcName) {
            return res[svcName].Service === 'bcl-commit-hub';
          });
          _chai.assert.equal(typeof svc === 'undefined', false);
        });
      }); // End of Services Pt 1
      describe('## Checks Pt 1', function () {
        it('should list all checks on agent', async function () {
          var res = await api.agent.check.list();
          // Verify that we have 5 checks with serviceID bcl-commit-hub
          var chkList = (0, _keys2.default)(res);
          var svcChk = chkList.filter(function (chkName) {
            return res[chkName].ServiceID === 'bcl-commit-hub';
          });
          _chai.assert.equal(svcChk.length, 5);
          // await persistToFile('api_agent_check_list_1.json', res);
        });
        it('should ttl pass check []', async function () {
          // This endpoint on success returns 200 and a blank body, ""
          var res = await api.agent.check.ttlPass('service:bcl-commit-hub:3', '1 missed blocks in last 100');
          _chai.assert.equal(res, '');
          // await persistToFile('api_agent_check_ttl_pass_1.json', res);
        });
        it('should ttl warn check []', async function () {
          var res = await api.agent.check.ttlWarn('service:bcl-commit-hub:4', 'Last block time is 40s behind current time');
          _chai.assert.equal(res, '');
        });
        it('should ttl fail check []', async function () {
          var res = await api.agent.check.ttlFail('service:bcl-commit-hub:5', 'Peer count has dropped below 5');
          _chai.assert.equal(res, '');
        });
        it('should list all checks on agent again', async function () {
          var res = await api.agent.check.listByFilter('ServiceID == "bcl-commit-hub"');
          // Verify that we have 5 checks with serviceID bcl-commit-hub
          var chkList = (0, _keys2.default)(res);
          _chai.assert.equal(chkList.length, 5);
          _chai.assert.equal(res['service:bcl-commit-hub:3'].Status, 'passing');
          _chai.assert.equal(res['service:bcl-commit-hub:4'].Status, 'warning');
          _chai.assert.equal(res['service:bcl-commit-hub:5'].Status, 'critical');
          // await persistToFile('api_agent_check_list_3.json', res);
        });
      }); // End of Checks Pt 1
    }); // End of Agent Pt 1
    describe('## KV Store Pt 1', function () {
      // K/V Paths
      // projects/commit-hub/crust-2/
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/peers-total
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/peers-inbound
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/peers-outbound
      // projects/commit-hub/crust-2/nodes/ap-southeast-1/query-response-time
      // projects/commit-hub/crust-2/commits/100/swstest19
      it('should list k/v at path projects/commit-hub/crust-2/', async function () {
        // Expect 404 Error
        try {
          await api.kv.list('projects/commit-hub/crust-2/');
          _chai.assert.fail();
        } catch (e) {
          _chai.assert.equal(e instanceof Error, true);
          _chai.assert.equal(e.statusCode, 404);
        }
      });
      it('should set k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', async function () {
        // Returns a boolean: true | false
        // StatusCode 200
        var res = await api.kv.upsert('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', 100, { cas: 0 });
        _chai.assert.equal(res, true);
      });
      it('should get k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', async function () {
        var res = await api.kv.get('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height');
        _chai.assert.equal(res.length, 1);

        var _res2 = (0, _slicedToArray3.default)(res, 1),
            k = _res2[0];

        _chai.assert.equal(k.Key, 'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height');
        var b = Buffer.from(k.Value, 'base64');
        var v = JSON.parse(b.toString('utf-8'));
        _chai.assert.equal(v, '100');
        // await persistToFile('api_kv_node_block_height.json', res);
      });

      it('should set k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time', async function () {
        // Returns a boolean: true | false
        // StatusCode 200
        var res = await api.kv.upsert('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time', 1566884093, { cas: 0 });
        _chai.assert.equal(res, true);
      });
      it('should get k/v at path projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time', async function () {
        var res = await api.kv.get('projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time');
        _chai.assert.equal(res.length, 1);

        var _res3 = (0, _slicedToArray3.default)(res, 1),
            k = _res3[0];

        _chai.assert.equal(k.Key, 'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time');
        var b = Buffer.from(k.Value, 'base64');
        var v = JSON.parse(b.toString('utf-8'));
        _chai.assert.equal(v, '1566884093');
        // await persistToFile('api_kv_node_block_time.json', res);
      });

      it('should set k/v at path projects/commit-hub/crust-2/commits/1000/<stakewithus address>', async function () {
        // Returns a boolean: true | false
        // StatusCode 200
        var res = await api.kv.upsert('projects/commit-hub/crust-2/commits/1000/swstest19', true, { cas: 0 });
        _chai.assert.equal(res, true);
      });
      it('should get k/v at path projects/commit-hub/crust-2/commits/1000/<stakewithus address>', async function () {
        var res = await api.kv.get('projects/commit-hub/crust-2/commits/1000/swstest19');
        _chai.assert.equal(res.length, 1);

        var _res4 = (0, _slicedToArray3.default)(res, 1),
            k = _res4[0];

        _chai.assert.equal(k.Key, 'projects/commit-hub/crust-2/commits/1000/swstest19');
        var b = Buffer.from(k.Value, 'base64');
        var v = JSON.parse(b.toString('utf-8'));
        _chai.assert.equal(v, 'true');
        // await persistToFile('api_kv_commit_block_validator.json', res);
      });
      it('should list k/v at path projects/commit-hub/crust-2/', async function () {
        var res = await api.kv.list('projects/commit-hub/crust-2/');
        var expected = ['projects/commit-hub/crust-2/commits/1000/swstest19', 'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-height', 'projects/commit-hub/crust-2/nodes/ap-southeast-1/block-time'];
        _chai.assert.deepEqual(res, expected);
        // await persistToFile('api_kv_project_level.json', res);
      });
      it('should delete k/v at path projects/commit-hub/crust-2/', async function () {
        // Returns a boolean: true | false
        // StatusCode 200
        var res = await api.kv.del('projects/commit-hub/crust-2/', { recurse: true });
        _chai.assert.equal(res, true);
      });
    }); // End of Agent Pt 1
    describe('## Agent Pt 2', function () {
      describe('## Services Pt 2', function () {
        /*
        it('should get health of service on agent', async () => {
          assert.throws('Not implemented');
        });
        */
        it('should deregister service on agent', async function () {
          // Returns a blank string on success
          // StatusCode 200
          var res = await api.agent.service.destroy('bcl-commit-hub');
          _chai.assert.equal(res, '');
        });
      }); // End of Services Pt 2
    }); // End of Agent Pt 2
  }); // End of Consul API
});
//# sourceMappingURL=api.spec.js.map
