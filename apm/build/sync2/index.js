'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _kvStore = require('../monit/kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _constant = require('../monit/constant');

var _constant2 = _interopRequireDefault(_constant);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

var _core = require('../core');

var _core2 = _interopRequireDefault(_core);

var _api = require('../plugins/backends/consul2/api');

var _api2 = _interopRequireDefault(_api);

var _lcdBackend = require('../monit/lcd-backend');

var _lcdBackend2 = _interopRequireDefault(_lcdBackend);

var _oracleBackend = require('../monit/terra/oracle-backend');

var _oracleBackend2 = _interopRequireDefault(_oracleBackend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CHECK_NAMES = _constant2.default.CHECK_NAMES;


_bluebird2.default.promisifyAll(_fs2.default);
var logger = (0, _pino2.default)().child({ module: 'cmd/sync' });

var parseJobFile = function parseJobFile(schd) {
  return async function (jobHCL) {
    var change = 'None';
    var changeErr = null;
    var rawHCL = await _fs2.default.readFileAsync(jobHCL, 'utf-8');
    var normHCL = schd.stripNewLine(rawHCL);
    try {
      var jobDef = await schd.job.parse('' + normHCL);
      var jobPlan = await schd.job.plan(jobDef.ID, jobDef, { diff: true });
      var Type = jobPlan.Diff.Type;

      change = Type;
      return {
        change: change,
        changeErr: changeErr,
        jobDef: jobDef
      };
    } catch (e) {
      changeErr = e;
      return {
        change: change,
        changeErr: changeErr
      };
    }
  };
};

var addTendermintService = function addTendermintService(jobLayout, isSingleHost, validatorSettings) {
  return async function (n) {
    var name = jobLayout.name,
        cat = jobLayout.cat,
        network = jobLayout.network,
        _jobLayout$ports = jobLayout.ports,
        httpP2P = _jobLayout$ports.http_p2p,
        httpRPC = _jobLayout$ports.http_rpc;
    var nodeRegion = n.nodeRegion,
        nodeAddress = n.nodeAddress;

    var validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, name, network);
    var svcName = _util2.default.getServiceName(name, isSingleHost, nodeRegion);
    // Basic Checks
    var httpRPCAlive = {
      Name: 'http-rpc-alive',
      Notes: 'Checks that Tendermint RPC Server is running',
      HTTP: 'http://' + nodeAddress + ':' + httpRPC + '/status',
      Method: 'GET',
      Interval: '300s',
      ServiceID: svcName,
      Status: 'critical'
    };

    var httpP2PAlive = {
      Name: 'http-p2p-alive',
      Notes: 'Checks that Tendermint P2P Server is running',
      TCP: nodeAddress + ':' + httpP2P,
      Interval: '300s',
      ServiceID: svcName,
      Status: 'critical'
    };
    // Advanced Checks
    var tmMissedBlocks = isSingleHost ? validatorAddresses.map(function (v) {
      return {
        Name: _util2.default.getMissedBlockName(v.name),
        CheckID: _util2.default.getMissedBlockCheckId(svcName, v.name),
        Notes: 'Tally for monitoring missed blocks threshold ' + v.address,
        TTL: '300s',
        ServiceID: svcName,
        Status: 'critical'
      };
    }) : {
      Name: CHECK_NAMES.TM_MISSED_BLOCK,
      Notes: 'Tally for monitoring missed blocks threshold',
      TTL: '300s',
      ServiceID: svcName,
      Status: 'critical'
    };
    var tmLateBlock = {
      Name: CHECK_NAMES.TM_LATE_BLOCK_TIME,
      Notes: 'Tally for late block time threshold',
      TTL: '300s',
      ServiceID: svcName,
      Status: 'critical'
    };
    var tmPeerCount = {
      Name: CHECK_NAMES.TM_PEER_COUNT,
      Notes: 'Tally for peer count threshold',
      TTL: '300s',
      ServiceID: svcName,
      Status: 'critical'
    };
    // Sample Service Definition / Payload
    var svcDef = {
      ID: svcName,
      Name: svcName,
      Address: nodeAddress, // Set to the local agent's address
      Port: httpP2P,
      Meta: {
        'node-project': 'blockchain-client',
        'node-project-cat': cat,
        'node-project-name': name,
        'node-project-network': network
      },
      Checks: [httpRPCAlive, httpP2PAlive].concat((0, _toConsumableArray3.default)(tmMissedBlocks), [tmLateBlock, tmPeerCount])
    };
    await n.createService(svcDef);
  };
};

var addService = function addService(jobLayout, isSingleHost, validatorSettings) {
  return async function (n) {
    var nodeName = n.nodeName,
        nodeRegion = n.nodeRegion,
        nodeAddress = n.nodeAddress,
        nodeServiceList = n.nodeServiceList;

    logger.info('Current service list: ' + (0, _stringify2.default)(nodeServiceList));
    var name = jobLayout.name;

    var exclRegions = jobLayout.region.excl;
    var svcName = _util2.default.getServiceName(name, isSingleHost, nodeRegion);
    if (exclRegions.includes(nodeRegion) || nodeServiceList.indexOf(svcName) > -1) return 0;
    logger.info('Attempting to register service ' + jobLayout.canonKey + ' on ' + nodeName + ' - ' + nodeRegion + ' [' + nodeAddress + ']');
    var cat = jobLayout.cat;

    if (cat === 'tendermint') {
      await addTendermintService(jobLayout, isSingleHost, validatorSettings)(n);
      logger.info('Service ' + jobLayout.canonKey + ' registered successfully on ' + nodeName + ' - ' + nodeRegion + ' [' + nodeAddress + ']');
      return 0;
    }
    return 1;
  };
};

var removeService = function removeService(jobLayout, isSingleHost) {
  return async function (n) {
    var nodeName = n.nodeName,
        nodeRegion = n.nodeRegion,
        nodeAddress = n.nodeAddress,
        nodeServiceList = n.nodeServiceList;
    var name = jobLayout.name;

    var svcName = _util2.default.getServiceName(name, isSingleHost, nodeRegion);
    if (nodeServiceList.indexOf(svcName) === -1) return 0;
    logger.info('Attempting to de-register service ' + jobLayout.canonKey + ' on ' + nodeName + ' - ' + nodeRegion + ' [' + nodeAddress + ']');
    await n.destroyService(svcName);
    logger.info('Service ' + jobLayout.canonKey + ' de-registered successfully on ' + nodeName + ' - ' + nodeRegion + ' [' + nodeAddress + ']');
    return 0;
  };
};

var updateServices = async function updateServices(nodeList, jobLayout, isSingleHost, validatorSettings) {
  var _jobLayout$region = jobLayout.region,
      inclFilter = _jobLayout$region.incl,
      exclFilter = _jobLayout$region.excl;
  // Register Services on qualifed nodes

  var inclNodeList = nodeList.filter(function (n) {
    return inclFilter.indexOf(n.nodeRegion) > -1;
  });
  var serviceAdder = addService(jobLayout, isSingleHost, validatorSettings);
  logger.info('[u] Add services on ' + inclNodeList.length + ' nodes');
  await _promise2.default.all(inclNodeList.map(serviceAdder));
  // De-register Services on un-qualifed nodes
  var exclNodeList = nodeList.filter(function (n) {
    return exclFilter.indexOf(n.nodeRegion) > -1;
  });
  var serviceRemover = removeService(jobLayout, isSingleHost);
  logger.info('[u] Remove services on ' + exclNodeList.length + ' nodes');
  await _promise2.default.all(exclNodeList.map(serviceRemover));
};

var addJob = function addJob(nodeList, schd, bend) {
  return async function (task) {
    var jobDef = task.jobDef;

    try {
      // Create Job
      await schd.job.create(jobDef.ID, jobDef, {});
    } catch (e) {
      logger.error('Caught error when creating job ' + jobDef.ID);
      console.log(e);
      return 1;
    }
    // Get Job Affinity, to get list of qualified nodes for allocation
    // After Job Create Success
    var jobLayout = schd.Job.layoutFromDef(jobDef);
    // Update Service Mesh
    await updateServices(nodeList, jobLayout);
    return 0;
  };
};

var updateJob = function updateJob(nodeList, schd, bend) {
  return async function (task) {
    var jobDef = task.jobDef;

    try {
      // Create Job
      await schd.job.update(jobDef.ID, jobDef, {});
    } catch (e) {
      logger.error('Caught error when updating job ' + jobDef.ID);
      console.log(e);
      return 1;
    }
    // After Job Create Success
    var jobLayout = schd.Job.layoutFromDef(jobDef);
    // Update Service Mesh
    await updateServices(nodeList, jobLayout);
    return 0;
  };
};

// var addTerraBackend = async function addTerraBackend(nodeHost, consulPort) {
//   var bend = (0, _api2.default)(nodeHost, consulPort).Api;
//   var lcdList = process.env.TERRA_LCD.split(',');
//   await _promise2.default.all(lcdList.map(async function (lcd) {
//     var _lcd$split = lcd.split(':'),
//         _lcd$split2 = (0, _slicedToArray3.default)(_lcd$split, 2),
//         host = _lcd$split2[0],
//         port = _lcd$split2[1];

//     await _lcdBackend2.default.addService(bend)('terra', host, port);
//     return _lcdBackend2.default.addCheck(bend)('terra', host, port);
//   }));
//   return _oracleBackend2.default.addCheck(bend);
// };

var syncProd = async function syncProd(nodeHost, consulPort, prodConfigFile) {
  await addTerraBackend(nodeHost, consulPort);
  logger.info('Retrieving cluster info...');
  var serverConfig = await _util2.default.getProductionFileConfig(prodConfigFile);

  var _ref = await _core2.default.getClusterProd(nodeHost, consulPort, serverConfig),
      nodeList = _ref.nodeList,
      bend = _ref.bend;

  var validatorSettings = await _kvStore2.default.getValidatorAddressSettings(bend)(prodConfigFile);
  var projects = serverConfig.nodes.reduce(function (acc, node) {
    node.projects.forEach(function (proj) {
      var existingProj = acc.find(function (e) {
        return e.name === proj.name && e.network === proj.network && proj.ports.http_p2p === e.ports.http_p2p && proj.ports.http_rpc === e.ports.http_rpc;
      });
      if (existingProj) {
        existingProj.region.incl.push(node.region);
      } else {
        acc.push({
          name: proj.name,
          network: proj.network,
          cat: 'tendermint',
          region: {
            incl: [node.region],
            excl: serverConfig.deRegisterServices[proj.name] || []
          },
          ports: proj.ports
        });
      }
    });
    return acc;
  }, []);
  var isSingleHost = true;
  return _promise2.default.all(projects.map(function (p) {
    return updateServices(nodeList, p, isSingleHost, validatorSettings);
  }));
};

var sync = async function sync(nodeHost, nomadPort, consulPort, configDir, _ref2, production, prodConfigFile) {
  var nomadToken = _ref2.nomadToken,
      consulToken = _ref2.consulToken;

  if (production) {
    return syncProd(nodeHost, consulPort, prodConfigFile);
  }
  logger.info('Retrieving cluster info...');

  var _ref3 = await _core2.default.getCluster(nodeHost, nomadPort, consulPort),
      nodeList = _ref3.nodeList,
      schd = _ref3.schd,
      bend = _ref3.bend;

  logger.info('Start Syncing Jobs');
  var fileList = await _fs2.default.readdirAsync(configDir);
  var jobFileList = fileList.filter(function (f) {
    return f.endsWith('.hcl');
  }).map(function (f) {
    return _path2.default.join(configDir, f);
  });
  var jobParser = parseJobFile(schd);
  var jobTasks = await _promise2.default.all(jobFileList.map(jobParser));
  var addJobTasks = jobTasks.filter(function (j) {
    return j.change === 'Added';
  });
  logger.info('Jobs to Add: ' + addJobTasks.length);
  var adder = addJob(nodeList, schd, bend);
  await _promise2.default.all(addJobTasks.map(adder));

  var updateJobTasks = jobTasks.filter(function (j) {
    return j.change === 'Edited';
  });
  logger.info('Jobs to Update: ' + updateJobTasks.length);
  var updater = updateJob(nodeList, schd, bend);
  await _promise2.default.all(updateJobTasks.map(updater));

  var failedJobTasks = jobTasks.filter(function (j) {
    return j.changeErr !== null;
  });
  return logger.info('Jobs that failed to parse: ' + failedJobTasks.length);
};

exports.default = sync;
//# sourceMappingURL=index.js.map
