'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _index = require('../plugins/schedulers/nomad/index');

var _index2 = require('../plugins/backends/consul/index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var logger = (0, _pino2.default)().child({ module: 'sync/index.js' });

var syncJob = function syncJob(configDir, nomadClient) {
  return async function (fileName) {
    logger.info('Attempting to sync job file ' + fileName);
    var nomadHCL = await _fs2.default.readFileAsync(_path2.default.join(configDir, fileName), 'utf-8');
    var job = await _index.Job.fromHCL(nomadClient)(nomadHCL);
    await job.sync(null, true);
    await job.getDetail();
    await job.getAllocations();
    return job;
  };
};

var syncMesh = function syncMesh(nodeIP, consulPort) {
  return async function (job) {
    //
    logger.info('Attempting to sync servics for job');
    var jobLayout = job.describe();
    var mesh = (0, _index2.Mesh)(nodeIP, consulPort)(jobLayout);
    await mesh.sync();
    return mesh;
  };
};

var syncTasks = function syncTasks(argv) {
  return async function (fileName) {
    var configDir = argv.config,
        nodeIP = argv.node,
        nomadPort = argv.nomadPort,
        consulPort = argv.consulPort;

    var nomadClient = (0, _index.Client)(nodeIP, nomadPort, {});
    var job = await syncJob(configDir, nomadClient)(fileName);
    var mesh = await syncMesh(nodeIP, consulPort)(job);
    var health = await mesh.health();
    console.log((0, _stringify2.default)(health, null, 2));
    logger.info('Completed all sync tasks');
  };
};

var loadLocalConfig = async function loadLocalConfig(argv) {
  var configDir = argv.config;

  var rawFileList = await _fs2.default.readdirAsync(configDir);
  var hclFileList = rawFileList.filter(function (f) {
    return f.endsWith('.hcl');
  });
  if (hclFileList.length > 0) {
    var syncPartial = syncTasks(argv);
    var syncRes = await _promise2.default.all(hclFileList.map(syncPartial));
    return syncRes;
  }
  return 0;
};

var sync = async function sync(argv) {
  var configDir = argv.config;

  if (configDir !== 'github') {
    await loadLocalConfig(argv);
    return 1;
  }
  return 1;
};

exports.default = sync;
//# sourceMappingURL=index.js.map
