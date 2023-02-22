'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _index = require('../../schedulers/nomad/index');

var _index2 = require('./index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var nomadClient = (0, _index.Client)('127.0.0.1', 4646, {});
// const consulClient = Client('127.0.0.1', 8500, {});

describe('# Consul Backend Plugin', function () {
  var jobLayout = {};
  describe('# Register Node Health System', function () {
    before(function (done) {
      var syncAndCreateJob = async function syncAndCreateJob() {
        var nomadHCL = await _fs2.default.readFileAsync(_path2.default.join(__dirname, '../../schedulers/nomad/fixtures', 'socat-new.hcl'), 'utf-8');
        var job = await _index.Job.fromHCL(nomadClient)(nomadHCL);
        // Sync
        await job.sync();
        await job.getDetail();
        // Node Allocation Info
        await job.getAllocations();
        return job;
      };
      syncAndCreateJob().then(function (result) {
        // console.log(JSON.stringify(result, null, 2));
        console.log('Nomad Describe');
        jobLayout = result.describe();
        console.log((0, _stringify2.default)(jobLayout, null, 2));
        done();
      }).catch(done);
    });
    it('should register the health system', function (done) {
      var initMesh = async function initMesh() {
        var mesh = (0, _index2.Mesh)('127.0.0.1')(jobLayout);
        await mesh.sync();
      };
      initMesh().then(function (res) {
        done();
      }).catch(done);
    });
    it('should register the health system', function (done) {
      var initMesh = async function initMesh() {
        var mesh = (0, _index2.Mesh)('127.0.0.1')(jobLayout);
        await mesh.sync();
        var health = await mesh.health();
        console.log((0, _stringify2.default)(health, null, 2));
      };
      initMesh().then(function (res) {
        done();
      }).catch(done);
    });
  });
});
//# sourceMappingURL=index.spec.js.map
