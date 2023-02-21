'use strict';

var _chai = require('chai');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _api3 = require('./nocks/api');

var _api4 = _interopRequireDefault(_api3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

describe('Nomad Scheduler Tests', function () {
  var scheduler = (0, _api2.default)();
  describe('# Nomad API', function () {
    before(async function () {
      await (0, _api4.default)('127.0.0.1', 4646);
    });
    var api = scheduler.Api;
    // const nodeID = 'de888c16-29b1-4d35-221e-332b5b9097f4';
    var nodeID = '7314889b-0aeb-00e1-8b67-98de3ef8e4db';
    describe('## Nodes', function () {
      it('should list all nodes', async function () {
        var res = await api.node.list();
        _chai.assert.equal(res.length, 1);
        var ID = res[0].ID;
        // assert.equal(ID, nodeID);

        _chai.assert.equal(ID, '7314889b-0aeb-00e1-8b67-98de3ef8e4db');
      });

      it('should read a single node', async function () {
        var res = await api.node.read(nodeID);
        _chai.assert.equal(res.ID, nodeID);
        _chai.assert.equal(res.Datacenter, 'dc1');
        _chai.assert.equal(res.Meta.region, 'ap-southeast-1');
        _chai.assert.equal(res.Meta.chain_role, 'sentry');
      });

      it('should throw if nodeID is not found for read', async function () {
        // TODO should throw if node is not found
        var missingNode = 'de888c16-29b1-4d35-221e-332b5b9097f4';
        try {
          await api.node.read(missingNode);
        } catch (e) {
          _chai.assert.equal(e.statusCode, 404);
        }
      });

      it('should get a single node\'s allocations', async function () {
        // TODO should throw if node is not found
        var res = await api.node.allocations(nodeID);
        _chai.assert.equal(res.length, 0);
      });
    });
    describe('## Jobs', function () {
      var normHCL1 = '';
      var normHCL2 = '';
      before(async function () {
        //
        var rawHCL1 = await _fs2.default.readFileAsync(_path2.default.join(__dirname, 'fixtures', 'blockchain-client.hcl'), 'utf-8');
        normHCL1 = scheduler.stripNewLine(rawHCL1);
        var rawHCL2 = await _fs2.default.readFileAsync(_path2.default.join(__dirname, 'fixtures', 'blockchain-client-new.hcl'), 'utf-8');
        normHCL2 = scheduler.stripNewLine(rawHCL2);
      });
      it('should list all jobs #1', async function () {
        var res = await api.job.list();
        _chai.assert.equal(res.length, 0);
      });

      it('should parse a single job', async function () {
        var res = await api.job.parse('' + normHCL1);
        _chai.assert.equal(res.TaskGroups.length, 1);
        _chai.assert.equal(res.Meta['node-project'], 'blockchain-client');
      });

      it('should plan a single job', async function () {
        var jobDef = await api.job.parse('' + normHCL1);
        var res = await api.job.plan(jobDef.ID, jobDef, { diff: true });
        _chai.assert.equal(res.Diff.Type, 'Added');
        _chai.assert.equal(res.FailedTGAllocs, null);
        _chai.assert.equal(res.Index, 0);
        _chai.assert.equal(res.JobModifyIndex, 0);
      });

      it('should create a single job', async function () {
        var jobDef = await api.job.parse('' + normHCL1);
        var res = await api.job.create(jobDef.ID, jobDef, {});
        _chai.assert.property(res, 'EvalCreateIndex');
        _chai.assert.property(res, 'EvalID');
      });

      it('should read a single job', async function () {
        var jobId = 'blockchain-client';
        var res = await api.job.read(jobId);
        _chai.assert.property(res, 'JobModifyIndex');
        _chai.assert.equal(res.ID, 'blockchain-client');
      });

      it('should plan an update for a single job', async function () {
        var jobDef = await api.job.parse('' + normHCL2);
        var res = await api.job.plan(jobDef.ID, jobDef, { diff: true });
        _chai.assert.equal(res.Diff.Type, 'Edited');
        _chai.assert.equal(res.Diff.TaskGroups[0].Type, 'Edited');
        _chai.assert.equal(res.Diff.TaskGroups[0].Tasks[0].Type, 'Edited');
        _chai.assert.equal(res.Diff.TaskGroups[0].Tasks[0].Fields[0].Type, 'Edited');
        _chai.assert.equal(res.Diff.TaskGroups[0].Tasks[0].Fields[0].Old, 'commit-hub');
        _chai.assert.equal(res.Diff.TaskGroups[0].Tasks[0].Fields[0].New, 'commit-hub-prod');
      });

      it('should update a single job', async function () {
        var jobDef = await api.job.parse('' + normHCL2);
        var res = await api.job.update(jobDef.ID, jobDef, {});
        _chai.assert.property(res, 'EvalCreateIndex');
        _chai.assert.property(res, 'EvalID');
        _chai.assert.property(res, 'JobModifyIndex');
      });

      it('should get a single job\'s allocations', async function () {
        var jobDef = await api.job.parse('' + normHCL2);
        var res = await api.job.allocations(jobDef.ID);
        _chai.assert.equal(res.length, 2);
        _chai.assert.equal(res[1].DesiredStatus, 'run');
        _chai.assert.equal(res[1].JobVersion, 1);
        _chai.assert.equal(res[1].JobID, 'blockchain-client');
        _chai.assert.equal(res[1].JobType, 'service');
        _chai.assert.equal(res[1].TaskGroup, 'commit-hub');
      });
    });
  }); // End of Nomad API
  describe('# Nomad Job', function () {
    it('should be able to read it\'s own configuration', function (done) {
      done(-1);
    });

    it('should get a summary', function (done) {
      done(-1);
    });

    it('should get it\'s own allocations', function (done) {
      done(-1);
    });
  }); // End of Nomad API
});
//# sourceMappingURL=api.spec.js.map
