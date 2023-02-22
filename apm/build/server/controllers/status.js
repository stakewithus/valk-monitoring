'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _kvStore = require('../../monit/kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _influxStore = require('../../monit/influx-store');

var _influxStore2 = _interopRequireDefault(_influxStore);

var _util = require('../../common/util');

var _util2 = _interopRequireDefault(_util);

var _dev = require('../../config/dev');

var _dev2 = _interopRequireDefault(_dev);

var _core = require('../../core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({
  module: 'controllers/status'
}); /* eslint-disable import/no-named-as-default-member */


var getProjectAndNetworkList = function getProjectAndNetworkList(keys) {
  var list = keys.reduce(function (acc, key) {
    var _key$split = key.split('/'),
        _key$split2 = (0, _slicedToArray3.default)(_key$split, 4),
        project = _key$split2[2],
        network = _key$split2[3];

    var isExist = acc.find(function (e) {
      return e.project === project && e.network === network;
    });
    if (!isExist) {
      acc.push({
        project: project,
        network: network
      });
    }
    return acc;
  }, []);
  return list;
};

var getProjectNetworkAndRegionList = function getProjectNetworkAndRegionList(keys) {
  // projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-total'
  var list = keys.reduce(function (acc, key) {
    var _key$split3 = key.split('/'),
        _key$split4 = (0, _slicedToArray3.default)(_key$split3, 5),
        project = _key$split4[2],
        network = _key$split4[3],
        region = _key$split4[4];

    var isExist = acc.find(function (e) {
      return e.project === project && e.network === network && e.region === region;
    });
    if (!isExist) {
      acc.push({
        project: project,
        network: network,
        region: region
      });
    }
    return acc;
  }, []);
  return list;
};

var getLastBlockCommits = function getLastBlockCommits(Backend) {
  return async function (_ref) {
    var latestBlockHeight = _ref.latestBlockHeight,
        metaData = _ref.metaData;

    if (latestBlockHeight < 2) {
      return [];
    }
    var from = latestBlockHeight > _dev2.default.numberOfLastCommits ? latestBlockHeight - _dev2.default.numberOfLastCommits - 1 : 1;
    var blockCommitsValues = await _kvStore2.default.getBlockCommitKeys(Backend)({
      from: from,
      to: latestBlockHeight - 1,
      metaData: metaData
    });
    return blockCommitsValues.map(function (c) {
      return !!+c.value;
    });
  };
};

var getTotalChecks = function getTotalChecks(healthChecks) {
  return healthChecks.reduce(function (acc, health) {
    var metric = health.checks.reduce(function (acc2, check) {
      var tmpAcc = (0, _assign2.default)(acc2);
      if (check.Status === 'passing') {
        tmpAcc.passing = acc2.passing + 1;
      } else if (check.Status === 'warning') {
        tmpAcc.warning = acc2.warning + 1;
      } else if (check.Status === 'critical') {
        tmpAcc.critical = acc2.critical + 1;
      }
      return tmpAcc;
    }, {
      passing: 0,
      critical: 0,
      warning: 0
    });
    acc.passing += metric.passing;
    acc.critical += metric.critical;
    acc.warning += metric.warning;
    return acc;
  }, {
    passing: 0,
    critical: 0,
    warning: 0
  });
};

var nodeStatusMap = {
  passing: 0,
  warning: 1,
  critical: 2
};

var getTotalChecksByWorstStatus = function getTotalChecksByWorstStatus(healthChecks) {
  var out = {
    passing: 0,
    warning: 0,
    critical: 0
  };
  healthChecks.forEach(function (health) {
    out[health.checks.sort(function (a, b) {
      return nodeStatusMap[b.Status] - nodeStatusMap[a.Status];
    })[0].Status] += 1;
  });
  return out;
};

var getRegionChecks = function getRegionChecks(healthChecks, region) {
  return healthChecks.filter(function (check) {
    return check.region === region;
  }).map(function (hc) {
    var checks = hc.checks.map(function (c) {
      return {
        checkId: c.CheckID,
        name: c.Name,
        status: c.Status,
        output: c.Output
      };
    });
    return checks;
  }).reduce(function (acc, e) {
    return acc.concat(e);
  }, []);
};

var getNetworkStatus = function getNetworkStatus(Backend) {
  return async function (_ref2) {
    var projectName = _ref2.projectName,
        networkName = _ref2.networkName,
        region = _ref2.region,
        keyPrefix = _ref2.keyPrefix,
        showCommits = _ref2.showCommits,
        healthChecks = _ref2.healthChecks,
        _ref2$host = _ref2.host,
        host = _ref2$host === undefined ? '' : _ref2$host,
        validatorSettings = _ref2.validatorSettings;

    var statusKeyValues = await _kvStore2.default.getAllByKeyPrefix(Backend)(keyPrefix);
    if (statusKeyValues && statusKeyValues.length === 0) {
      return null;
    }
    var result = statusKeyValues.reduce(function (acc, status) {
      var type = status.key.split('/').pop();
      var typeCamelCase = _util2.default.convertKebabToCamelCase(type);
      acc[typeCamelCase] = status.value;
      return acc;
    }, {});
    result.host = host;
    result.projectName = projectName;
    result.networkName = networkName;
    result.catchingUp = !!+result.catchingUp;
    if (region) {
      result.region = region;
      if (healthChecks) {
        result.healthChecks = getRegionChecks(healthChecks, region);
      }
    } else if (healthChecks) {
      result.healthChecks = getTotalChecks(healthChecks);
      result.healthChecksBySentry = getTotalChecksByWorstStatus(healthChecks);
    }
    if (showCommits) {
      var validatorAddresses = await _util2.default.getValidatorAddress(validatorSettings, projectName, networkName);
      var commits = await _promise2.default.all(validatorAddresses.map(function (v) {
        return getLastBlockCommits(Backend)({
          latestBlockHeight: result.blockHeight,
          metaData: {
            projectName: projectName,
            networkName: networkName,
            region: region,
            validatorAddress: v.address
          }
        });
      }));
      result.commits = commits.reduce(function (acc, c, index) {
        return acc.concat({
          name: validatorAddresses[index].name,
          values: c
        });
      }, []);
    }
    return result;
  };
};

var getAllProjectStatus = async function getAllProjectStatus(_ref3) {
  var Backend = _ref3.Backend,
      nodeIp = _ref3.node,
      nomadPort = _ref3.nomadPort,
      consulPort = _ref3.consulPort,
      production = _ref3.production,
      prodConfigFile = _ref3.prodConfigFile;

  var _ref4 = await _core2.default.getNodeInfos({
    nodeIp: nodeIp,
    nomadPort: nomadPort,
    consulPort: consulPort,
    production: production,
    prodConfigFile: prodConfigFile
  }),
      nodeList = _ref4.nodeList;

  var keys = await Backend.kv.list('projects/global');
  var validatorSettings = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
  var prjList = getProjectAndNetworkList(keys);
  var result = await _promise2.default.all(prjList.map(function (row) {
    var keyPrefix = 'projects/global/' + row.project + '/' + row.network + '/status/';
    var checks = nodeList.filter(function (n) {
      return n.nodeServiceList.includes(_util2.default.getServiceName(row.project, production, n.nodeRegion));
    }).map(function (n) {
      return {
        region: n.nodeRegion,
        checks: n.nodeCheckList.filter(function (c) {
          return c.includes(_util2.default.getServiceName(row.project, production, n.nodeRegion));
        }).map(function (checkId) {
          return n.nodeChecks[checkId];
        })
      };
    });
    return getNetworkStatus(Backend)({
      projectName: row.project,
      networkName: row.network,
      keyPrefix: keyPrefix,
      showCommits: true,
      healthChecks: checks,
      validatorSettings: validatorSettings
    });
  }));
  return result;
};

var filterProjectByRegion = function filterProjectByRegion(_ref5) {
  var Backend = _ref5.Backend,
      nodeIp = _ref5.node,
      nomadPort = _ref5.nomadPort,
      consulPort = _ref5.consulPort,
      production = _ref5.production,
      prodConfigFile = _ref5.prodConfigFile;
  return async function (project, network, region) {
    var _ref6 = await _core2.default.getNodeInfos({
      nodeIp: nodeIp,
      nomadPort: nomadPort,
      consulPort: consulPort,
      production: production,
      prodConfigFile: prodConfigFile
    }),
        nodeList = _ref6.nodeList;

    var validatorSettings = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
    var nodeProjects = nodeList.filter(function (n) {
      return n.nodeServiceList.includes(_util2.default.getServiceName(project, production, n.nodeRegion));
    });
    var keys = await Backend.kv.list('projects/nodes/' + _util2.default.getProjectName(project));
    var prjAndNetworkList = getProjectNetworkAndRegionList(keys);
    var filteredNetworkList = prjAndNetworkList.filter(function (e) {
      return !network || network === e.network;
    });
    var filteredRegionList = filteredNetworkList.filter(function (e) {
      return !region || region === e.region;
    });
    var checks = nodeProjects.map(function (n) {
      return {
        region: n.nodeRegion,
        checks: n.nodeCheckList.filter(function (c) {
          return c.includes(_util2.default.getServiceName(project, production, n.nodeRegion));
        }).map(function (checkId) {
          return n.nodeChecks[checkId];
        })
      };
    });
    return _promise2.default.all(filteredRegionList.map(function (e) {
      var keyPrefix = 'projects/nodes/' + e.project + '/' + e.network + '/' + e.region + '/status/';
      var nodeByRegion = nodeProjects.find(function (node) {
        return node.nodeRegion === e.region;
      }) || {};
      return getNetworkStatus(Backend)({
        projectName: e.project,
        networkName: e.network,
        region: e.region,
        keyPrefix: keyPrefix,
        healthChecks: checks,
        host: nodeByRegion.nodeAddress,
        validatorSettings: validatorSettings
      });
    }));
  };
};

var filterProjectByHost = function filterProjectByHost(_ref7) {
  var Backend = _ref7.Backend,
      nodeIp = _ref7.node,
      nomadPort = _ref7.nomadPort,
      consulPort = _ref7.consulPort,
      production = _ref7.production,
      prodConfigFile = _ref7.prodConfigFile;
  return async function (host) {
    var _ref8 = await _core2.default.getNodeInfos({
      nodeIp: nodeIp,
      nomadPort: nomadPort,
      consulPort: consulPort,
      production: production,
      prodConfigFile: prodConfigFile
    }),
        nodeList = _ref8.nodeList;

    var nodeByHost = nodeList.find(function (n) {
      return n.nodeAddress === host;
    });
    if (!nodeByHost) return [];
    if (!nodeByHost.projects) return [];
    return _promise2.default.all(nodeByHost.projects.map(function (e) {
      var keyPrefix = 'projects/nodes/' + _util2.default.getProjectName(e.name) + '/' + e.network + '/' + nodeByHost.nodeRegion + '/status/';
      return getNetworkStatus(Backend)({
        projectName: _util2.default.getProjectName(e.name),
        networkName: e.network,
        region: nodeByHost.nodeRegion,
        keyPrefix: keyPrefix,
        healthChecks: [{
          region: nodeByHost.nodeRegion,
          checks: nodeByHost.nodeCheckList.filter(function (c) {
            return c.includes(_util2.default.getServiceName(e.name, production, nodeByHost.nodeRegion));
          }).map(function (checkId) {
            return nodeByHost.nodeChecks[checkId];
          })
        }],
        host: nodeByHost.nodeAddress
      });
    }));
  };
};

var modifyChainId = function modifyChainId(projects) {
  var networkMapping = {
    'bcl-band': 'band-guanyu-mainnet',
    'bcl-terra': 'columbus-4',
    'bcl-kava': 'kava-6',
    'bcl-cosmos': 'cosmoshub-4'
  };
  return projects.map(function (project) {
    if (networkMapping[project.projectName]) {
      project.networkName = networkMapping[project.projectName];
    }
    return project;
  });
};

var get = function get(req, res) {
  return async function (args) {
    try {
      var result = await getAllProjectStatus(args);
      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.write((0, _stringify2.default)(modifyChainId(result)));
      return res;
    } catch (e) {
      logger.error('get', e && e.toString());
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var getAllProjects = function getAllProjects(req, res) {
  return async function (_ref9) {
    var Backend = _ref9.Backend;

    try {
      var keys = await Backend.kv.list('projects/global');
      var prjList = getProjectAndNetworkList(keys);
      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.write((0, _stringify2.default)(prjList));
      return res;
    } catch (e) {
      logger.error('get', e && e.toString());
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var getAllHosts = function getAllHosts(req, res) {
  return async function (_ref10) {
    var nodeIp = _ref10.node,
        nomadPort = _ref10.nomadPort,
        consulPort = _ref10.consulPort,
        production = _ref10.production,
        prodConfigFile = _ref10.prodConfigFile;

    try {
      var _ref11 = await _core2.default.getNodeInfos({
        nodeIp: nodeIp,
        nomadPort: nomadPort,
        consulPort: consulPort,
        production: production,
        prodConfigFile: prodConfigFile
      }),
          nodeList = _ref11.nodeList;

      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.write((0, _stringify2.default)(nodeList.map(function (n) {
        return n.nodeAddress;
      })));
      return res;
    } catch (e) {
      logger.error('get', e && e.toString());
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var getNodeStatus = function getNodeStatus(_ref12, res) {
  var query = _ref12.query,
      capture = _ref12.capture;
  return async function (args) {
    try {
      var _capture = (0, _slicedToArray3.default)(capture, 2),
          project = _capture[1];

      var projectName = _util2.default.getProjectName(project);
      var network = query.get('network');
      var region = query.get('region');
      var host = query.get('host');
      var result = void 0;
      if (host) {
        result = await filterProjectByHost(args)(host);
      } else {
        result = await filterProjectByRegion(args)(projectName, network, region);
      }
      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.write((0, _stringify2.default)(result));
      return res;
    } catch (e) {
      logger.error('getNodeStatus', e && e.toString());
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var getTotalMissedBlocks = function getTotalMissedBlocks(_ref13, res) {
  var query = _ref13.query,
      capture = _ref13.capture;
  return async function (args) {
    var _capture2 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture2[1];

    var network = query.get('network');
    var count = await _influxStore2.default.getTotalMissedBlockCount({
      network: network,
      project: project
    });
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)({
      count: count
    }));
    return res;
  };
};

var getMissedBlocksHistory = function getMissedBlocksHistory(_ref14, res) {
  var query = _ref14.query,
      capture = _ref14.capture;
  return async function (args) {
    var count = 14;
    var defaultRet = [];
    for (var i = 0; i < count; i += 1) {
      defaultRet.unshift({
        x: (0, _moment2.default)().subtract(i, 'd').format('MMM D'),
        y: 0
      });
    }

    var _capture3 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture3[1];

    var network = query.get('network');
    var ret = await _influxStore2.default.getMissedBlocksHistory({
      project: project,
      network: network,
      from: (0, _moment2.default)().subtract(13, 'd').valueOf() * 1e6,
      to: (0, _moment2.default)().valueOf() * 1e6
    });
    if (ret.length === 0) {
      ret = defaultRet;
    } else {
      ret = ret.map(function (row) {
        return {
          x: (0, _moment2.default)(row[0]).format('MMM D'),
          y: row[1]
        };
      });
    }
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret));
    return res;
  };
};

var getMissedBlocksByTimeOfDay = function getMissedBlocksByTimeOfDay(_ref15, res) {
  var query = _ref15.query,
      capture = _ref15.capture;
  return async function (args) {
    var _capture4 = (0, _slicedToArray3.default)(capture, 2),
        project = _capture4[1];

    var network = query.get('network');
    var weekDays = _moment2.default.weekdaysShort();
    var missedBlocks = await _influxStore2.default.getMissedBlocksByTimeOfDay({
      project: project,
      network: network,
      from: (0, _moment2.default)().subtract(13, 'd').startOf('d').valueOf() * 1e6,
      to: (0, _moment2.default)().endOf('d').valueOf() * 1e6
    });
    var ret = weekDays.map(function (day) {
      var data = Array(24).fill().map(function (v, index) {
        return {
          x: index,
          y: 0
        };
      });
      return {
        name: day,
        data: data
      };
    });
    missedBlocks.forEach(function (block) {
      var d = (0, _moment2.default)(block[0]);
      ret[d.weekday()].data[d.hour()].y += block[1];
    });
    res.writeHead(200, {
      'content-type': 'application/json'
    });
    res.write((0, _stringify2.default)(ret.reverse()));
    return res;
  };
};

exports.default = {
  get: get,
  getNodeStatus: getNodeStatus,
  getNetworkStatus: getNetworkStatus,
  getProjectAndNetworkList: getProjectAndNetworkList,
  getAllProjectStatus: getAllProjectStatus,
  filterProjectByRegion: filterProjectByRegion,
  getTotalMissedBlocks: getTotalMissedBlocks,
  getMissedBlocksHistory: getMissedBlocksHistory,
  getMissedBlocksByTimeOfDay: getMissedBlocksByTimeOfDay,
  getAllProjects: getAllProjects,
  getAllHosts: getAllHosts
};
//# sourceMappingURL=status.js.map
