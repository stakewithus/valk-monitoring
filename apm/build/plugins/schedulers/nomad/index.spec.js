'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _chai = require('chai');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _index = require('./index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var nomadClient = (0, _index.Client)('127.0.0.1', 4646, {});

describe('# Nomad Scheduler Plugin', function () {
  var job = {};
  describe('# Job Parsing, Configuration, Creating', function () {
    it('should parse job.hcl file into JSON', function (done) {
      var readAndParseJob = async function readAndParseJob() {
        var nomadHCL = await _fs2.default.readFileAsync(_path2.default.join(__dirname, 'fixtures', 'socat.hcl'), 'utf-8');
        await _index.Job.fromHCL(nomadClient)(nomadHCL);
      };
      readAndParseJob().then(function (result) {
        done();
      }).catch(done);
    }); // End of IT
  }); // End of Describe
  describe('# Job Sync', function () {
    it('should create new Job if it does not exist', function (done) {
      var syncAndCreateJob = async function syncAndCreateJob() {
        var nomadHCL = await _fs2.default.readFileAsync(_path2.default.join(__dirname, 'fixtures', 'socat.hcl'), 'utf-8');
        job = await _index.Job.fromHCL(nomadClient)(nomadHCL);
        // Sync
        await job.sync();
        var jobInfo = await job.getDetail();
        return jobInfo;
      };
      syncAndCreateJob().then(function (result) {
        // console.log(JSON.stringify(result, null, 2));
        _chai.assert.equal(result.ID, 'blockchain-client');
        done();
      }).catch(done);
    }); // End of IT
    it('should produce a job plan if it does exist with diff changes', function (done) {
      var planJob = async function planJob() {
        var nomadHCL = await _fs2.default.readFileAsync(_path2.default.join(__dirname, 'fixtures', 'socat-new.hcl'), 'utf-8');
        // Sync
        var planDetail = await job.sync(nomadHCL);
        return planDetail;
      };
      planJob().then(function (result) {
        // console.log(JSON.stringify(result, null, 2));
        _chai.assert.equal(result.Diff.Type, 'Edited');
        done();
      }).catch(done);
    }); // End of IT
    it('should update the job if sync is set to final', function (done) {
      var updateJob = async function updateJob() {
        var nomadHCL = await _fs2.default.readFileAsync(_path2.default.join(__dirname, 'fixtures', 'socat-new.hcl'), 'utf-8');
        // Sync
        var newJobInfo = await job.sync(nomadHCL, true);
        return newJobInfo;
      };
      updateJob().then(function (result) {
        // console.log(JSON.stringify(result, null, 2));
        _chai.assert.equal(result.ID, 'blockchain-client');
        done();
      }).catch(done);
    }); // End of IT
  }); // End of Describe
  describe('# Job Status, Node Allocation', function () {
    it('should get and set the job\'s node allocations', function (done) {
      var checkJob = async function checkJob() {
        var nodeAllocationInfo = await job.getAllocations();
        return nodeAllocationInfo;
      };
      checkJob().then(function (result) {
        // console.log(JSON.stringify(result, null, 2));
        console.log('finalNodes');
        console.log((0, _stringify2.default)(result, null, 2));
        done();
      }).catch(done);
    }); // End of IT
  }); // End of Describe
});
//# sourceMappingURL=index.spec.js.map
