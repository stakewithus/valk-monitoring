'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _tendermint = require('../plugins/chains/tendermint');

var _tendermint2 = _interopRequireDefault(_tendermint);

var _healthChecks = require('./health-checks');

var _healthChecks2 = _interopRequireDefault(_healthChecks);

var _kvStore = require('./kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _core = require('../core');

var _core2 = _interopRequireDefault(_core);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

var _api = require('../plugins/backends/consul2/api');

var _api2 = _interopRequireDefault(_api);

var _github = require('../server/controllers/github');

var _github2 = _interopRequireDefault(_github);

var _alerting = require('./alerting');

var _alerting2 = _interopRequireDefault(_alerting);

var _terra = require('./terra');

var _terra2 = _interopRequireDefault(_terra);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);
var logger = (0, _pino2.default)().child({ module: 'cmd/monit' });

var parseJobFile = function parseJobFile(nodeList, schd) {
  return async function (jobHCL) {
    var rawHCL = await _fs2.default.readFileAsync(jobHCL, 'utf-8');
    var normHCL = schd.stripNewLine(rawHCL);
    var jobDef = await schd.job.parse('' + normHCL);
    var jobLayout = schd.Job.layoutFromDef(jobDef);
    return nodeList.map(function (n) {
      return {
        nodeId: n.nodeID,
        projectName: jobLayout.name,
        networkName: jobLayout.network || 'unknown',
        port: jobLayout.ports.http_rpc,
        host: n.nodeAddress,
        region: n.nodeRegion,
        nodeChecks: n.nodeChecks,
        nodeServiceList: n.nodeServiceList
      };
    });
  };
};

var getAllJobs = function getAllJobs(nodeList, Schedule) {
  return async function (configDir) {
    var fileList = await _fs2.default.readdirAsync(configDir);
    var jobFileList = fileList.filter(function (f) {
      return f.endsWith('.hcl');
    }).map(function (f) {
      return _path2.default.join(configDir, f);
    });
    var jobParser = parseJobFile(nodeList, Schedule);
    var jobTasks = await _promise2.default.all(jobFileList.map(jobParser));
    return jobTasks.reduce(function (acc, job) {
      return acc.concat(job);
    }, []);
  };
};

var updateKVStore = function updateKVStore(Backend) {
  return async function (_ref) {
    var nodeState = _ref.nodeState,
        nodeMeta = _ref.nodeMeta,
        validatorSettings = _ref.validatorSettings;

    if (!nodeState) {
      return null;
    }
    nodeMeta.validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, nodeMeta.projectName, nodeMeta.networkName); // eslint-disable-line
    return _kvStore2.default.update(Backend)({ nodeState: nodeState, nodeMeta: nodeMeta });
  };
};

var updateHealthChecks = function updateHealthChecks(Backend) {
  return async function (_ref2) {
    var nodeState = _ref2.nodeState,
        nodeMeta = _ref2.nodeMeta,
        healthCheckConfigs = _ref2.healthCheckConfigs,
        production = _ref2.production,
        validatorSettings = _ref2.validatorSettings;

    var customConfig = healthCheckConfigs.customSettings[nodeMeta.projectName];
    var customHealthCheckConfigs = healthCheckConfigs.defaultSettings;
    if (customConfig) {
      customHealthCheckConfigs = (0, _assign2.default)({}, healthCheckConfigs.defaultSettings, customConfig); // eslint-disable-line
    }
    nodeMeta.validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, nodeMeta.projectName, nodeMeta.networkName); // eslint-disable-line
    return _healthChecks2.default.update(Backend)({
      nodeState: nodeState, nodeMeta: nodeMeta, production: production, healthCheckConfigs: customHealthCheckConfigs
    });
  };
};

var getNodes = async function getNodes(_ref3) {
  var nodeIp = _ref3.nodeIp,
      production = _ref3.production,
      consulPort = _ref3.consulPort,
      nomadPort = _ref3.nomadPort,
      prodConfigFile = _ref3.prodConfigFile,
      config = _ref3.config;

  if (production) {
    var serverConfig = await _util2.default.getProductionFileConfig(prodConfigFile);

    var _ref4 = await _core2.default.getClusterProd(nodeIp, consulPort, serverConfig),
        nodeInfos = _ref4.nodeList;

    return nodeInfos.reduce(function (acc, n) {
      return acc.concat(n.projects.map(function (prj) {
        return {
          nodeId: n.nodeID,
          projectName: prj.name,
          networkName: prj.network || 'unknown',
          port: prj.ports.http_rpc,
          host: n.nodeAddress,
          region: n.nodeRegion,
          nodeChecks: n.nodeChecks,
          nodeServiceList: n.nodeServiceList
        };
      }));
    }, []);
  }

  var _ref5 = await _core2.default.getCluster(nodeIp, nomadPort, consulPort),
      nodeList = _ref5.nodeList,
      Schedule = _ref5.schd;

  return getAllJobs(nodeList, Schedule)(config);
};

var getHighestBlockHeightByProject = function getHighestBlockHeightByProject(projectStates) {
  return projectStates.reduce(function (acc, state) {
    if (!state) {
      return acc;
    }
    var pid = state.projectName + '-' + state.networkName;
    if (!acc[pid]) {
      acc[pid] = state.block_height;
    } else {
      acc[pid] = Math.max(acc[pid], state.block_height);
    }
    return acc;
  }, {});
};

var getMutedNodes = async function getMutedNodes(Backend) {
  var mutedConfig = await Backend.kv.getValue(_config2.default.mutedNodesKey);
  if (!mutedConfig) {
    return [];
  }
  var nodes = mutedConfig.split(',');
  return nodes.map(function (node) {
    var _node$split = node.split(':'),
        _node$split2 = (0, _slicedToArray3.default)(_node$split, 2),
        region = _node$split2[0],
        projectName = _node$split2[1];

    if (!region) {
      return null;
    }
    return {
      region: region,
      projectName: projectName
    };
  }).filter(function (n) {
    return n;
  });
};

var getConfigs = function getConfigs(Backend) {
  return async function (_ref6) {
    var production = _ref6.production,
        prodConfigFile = _ref6.prodConfigFile;

    var _ref7 = await _promise2.default.all([_kvStore2.default.getThresholdSettings(Backend)({ production: production, prodConfigFile: prodConfigFile }), getMutedNodes(Backend), _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile)]),
        _ref8 = (0, _slicedToArray3.default)(_ref7, 3),
        healthCheckConfigs = _ref8[0],
        mutedNodes = _ref8[1],
        validatorSettings = _ref8[2];

    return {
      healthCheckConfigs: healthCheckConfigs,
      mutedNodes: mutedNodes,
      validatorSettings: validatorSettings
    };
  };
};

var run = async function run(_ref9) {
  var nodeIp = _ref9.node,
      consulPort = _ref9.consulPort,
      nomadPort = _ref9.nomadPort,
      prodConfigFile = _ref9.prodConfigFile,
      production = _ref9.production,
      config = _ref9.config;

  try {
    var nodes = await getNodes({
      nodeIp: nodeIp, production: production, consulPort: consulPort, nomadPort: nomadPort, prodConfigFile: prodConfigFile, config: config
    });
    var runningNodes = nodes.filter(function (n) {
      return n.nodeServiceList && n.nodeServiceList.includes(_util2.default.getServiceName(n.projectName, production, n.region));
    });
    if (runningNodes.length === 0) {
      logger.info('Service is not registered on nodes');
      return null;
    }

    var _ref10 = await getConfigs((0, _api2.default)(nodeIp, consulPort).Api)({
      production: production, prodConfigFile: prodConfigFile
    }),
        healthCheckConfigs = _ref10.healthCheckConfigs,
        mutedNodes = _ref10.mutedNodes,
        validatorSettings = _ref10.validatorSettings;

    var requestPromises = runningNodes.map(function (n) {
      return _tendermint2.default.getNodeState(n.host, n.port, _util2.default.getProjectName(n.projectName), n.networkName, _config2.default.requestTimeoutMs, validatorSettings);
    });
    var nodeStates = await _promise2.default.all(requestPromises);
    var highestBlockHeights = getHighestBlockHeightByProject(nodeStates);
    var nodeForUpdatingGlobal = nodeStates.reduce(function (acc, node) {
      if (!node) return acc;
      var pid = node.projectName + '-' + node.networkName;
      if (!acc[pid] && +node.block_height === +highestBlockHeights[pid]) {
        acc[pid] = node.meta.id;
      }
      return acc;
    }, {});
    var nodeStatesForUpdating = nodeStates.map(function (node) {
      if (!node) return node;
      if (node.meta.id === nodeForUpdatingGlobal[node.projectName + '-' + node.networkName]) {
        return (0, _assign2.default)(node, { updateGlobal: true });
      }
      return node;
    });
    var ConsulClient = (0, _api2.default)(nodeIp, consulPort).Api;
    var updateKVStorePromises = nodeStatesForUpdating.map(function (nodeState, index) {
      var consulClient = production ? ConsulClient : (0, _api2.default)(runningNodes[index].host, consulPort).Api;
      return updateKVStore(consulClient)({
        nodeState: nodeState,
        nodeMeta: runningNodes[index],
        validatorSettings: validatorSettings
      });
    });
    await _promise2.default.all(updateKVStorePromises);
    var updateHealthCheckPromises = nodeStatesForUpdating.map(function (nodeState, index) {
      var consulClient = production ? ConsulClient : (0, _api2.default)(runningNodes[index].host, consulPort).Api;
      return updateHealthChecks(consulClient)({
        nodeState: nodeState,
        nodeMeta: runningNodes[index],
        healthCheckConfigs: healthCheckConfigs,
        validatorSettings: validatorSettings,
        production: production
      });
    });
    var healthCheckResult = await _promise2.default.all(updateHealthCheckPromises);
    await _alerting2.default.handleAlerting(mutedNodes, healthCheckResult, validatorSettings);
    return healthCheckResult;
  } catch (e) {
    console.log(e);
    logger.error('Error while executing the command');
    logger.info(e && e.toString());
    return null;
  }
};

var getConfigDir = async function getConfigDir() {
  var commands = null;
  try {
    commands = await _github2.default.getCommands(process.env.GITHUB_REPO);
    await _github2.default.runCommand(commands.remove);
    await _github2.default.runCommand(commands.fetch);
    return commands.configDir;
  } catch (e) {
    logger.error('Error fetching config');
    logger.info(e && e.toString());
    return null;
  }
};

var runEvery5s = async function runEvery5s(args) {
  var result = await run(args);
  await _terra2.default.run(args);
  if (args.v) {
    console.dir(result, { depth: null });
  }
  setTimeout(function () {
    runEvery5s(args);
  }, 5000);
};

var start = async function start(args) {
  if (!args.config && !args.production) {
    args.config = await getConfigDir(); // eslint-disable-line no-param-reassign
    logger.info('Using config dir', args.config);
  }
  _terra2.default.fetchExchangeRate();
  runEvery5s(args);
};
exports.default = {
  start: start,
  run: run
};
//# sourceMappingURL=index.js.map
