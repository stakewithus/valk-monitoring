'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

var _core = require('../core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default); /* eslint-disable max-len */

var logger = (0, _pino2.default)().child({ module: 'cmd/health' });

var getDistinctServices = function getDistinctServices(nodeList, isSingleHost) {
  var svcPrefix = 'bcl-';
  var services = nodeList.reduce(function (acc, n) {
    var nodeServiceList = n.nodeServiceList;

    var critMet = nodeServiceList.filter(function (svc) {
      return svc.startsWith(svcPrefix);
    });
    var critNew = critMet.filter(function (svc) {
      return acc.indexOf(svc) === -1;
    });
    if (isSingleHost) {
      critNew = critNew.map(function (svc) {
        return svc.split(':')[0];
      });
    }
    return acc.concat(critNew);
  }, []);
  services.sort();
  return [].concat((0, _toConsumableArray3.default)(new _set2.default(services)));
};

var getHealthMainRow = function getHealthMainRow(distSvc, showRawData, isSingleHost) {
  return function (acc, n) {
    var nodeID = n.nodeID,
        nodeAddress = n.nodeAddress,
        nodeRegion = n.nodeRegion,
        nodeServiceList = n.nodeServiceList,
        nodeCheckList = n.nodeCheckList,
        nodeChecks = n.nodeChecks;

    var nid = showRawData ? nodeID.slice(0, 8) + '..' : nodeID;
    var initRow = [nid, nodeAddress, nodeRegion];
    var svcRow = distSvc.reduce(function (aacc, prjName) {
      var serviceName = _util2.default.getServiceName(prjName, isSingleHost, nodeRegion);
      var svcIdx = nodeServiceList.indexOf(serviceName);
      if (svcIdx === -1) return aacc.concat('-');
      var svcPrefix = 'service:' + serviceName;
      var svcChecks = nodeCheckList.filter(function (c) {
        return c.startsWith(svcPrefix);
      });
      var checkStatus = svcChecks.map(function (chkName) {
        return nodeChecks[chkName].Status;
      });
      var numPass = checkStatus.filter(function (s) {
        return s === 'passing';
      }).length;
      var numWarn = checkStatus.filter(function (s) {
        return s === 'warning';
      }).length;
      var numFail = checkStatus.filter(function (s) {
        return s === 'critical';
      }).length;
      var svcStatus = showRawData ? numPass + ' (pass), ' + numWarn + ' (warn), ' + numFail + ' (critical)' : '(' + _chalk2.default.green(numPass) + ', ' + _chalk2.default.yellow(numWarn) + ', ' + _chalk2.default.red(numFail) + ')';
      return aacc.concat(svcStatus);
    }, []);
    var fullRow = initRow.concat(svcRow);
    return acc.concat([fullRow]);
  };
};

var getTableDataByNode = function getTableDataByNode(node, service, showOutput, production) {
  if (!node) {
    console.log('Node check is empty!');
    return {};
  }
  var checkRecords = (0, _values2.default)(node.nodeChecks).filter(function (check) {
    return check.ServiceID === _util2.default.getServiceName(service, production, node.nodeRegion);
  });
  var checkStatus = checkRecords.reduce(function (acc, check) {
    var content = check.Status;
    if (showOutput) {
      if (check.Name === showOutput) {
        acc[check.Name] = check.CheckID + ' ' + content + ' (' + check.Output + ')';
      }
    } else {
      acc[check.Name] = content;
    }
    return acc;
  }, {});
  var header = ['NodeID', 'IP', 'Region'].concat((0, _keys2.default)(checkStatus));
  var row = [node.nodeID.slice(0, 8) + '..', node.nodeAddress, node.nodeRegion].concat((0, _values2.default)(checkStatus));
  return {
    header: header,
    row: row
  };
};
var showHealthService = async function showHealthService(service, distSvc, nodeList, showOutput, production, serverConfig) {
  var svcPrefix = 'bcl-';
  var serviceId = '' + svcPrefix + service;
  if (!distSvc.find(function (s) {
    return s.startsWith(serviceId);
  })) {
    return console.log('Service not found!');
  }
  var nodes = nodeList.filter(function (n) {
    if (!n) {
      return null;
    }
    var offlineNodes = serverConfig && serverConfig.deRegisterServices[service] || [];
    return production ? n.projects.find(function (p) {
      return p.name === service;
    }) && !offlineNodes.includes(n.nodeRegion) : (0, _values2.default)(n.nodeChecks).find(function (check) {
      return check.ServiceID === _util2.default.getServiceName(service, production, n.nodeRegion);
    });
  });

  var _nodes = (0, _slicedToArray3.default)(nodes, 1),
      firstNode = _nodes[0];

  var tableData = getTableDataByNode(firstNode, service, showOutput, production);
  var table = new _cliTable2.default({
    head: tableData.header
  });
  var tableBody = [];
  tableBody.push(tableData.row);
  nodes.slice(1, nodes.length).map(function (node) {
    var data = getTableDataByNode(node, service, showOutput, production);
    return tableBody.push(data.row);
  });
  tableBody.map(function (t) {
    return table.push(t);
  });
  console.log(table.toString());
  return {
    header: tableData.header,
    body: tableBody
  };
};

var health = async function health(_ref) {
  var nodeIp = _ref.node,
      nomadPort = _ref.nomadPort,
      consulPort = _ref.consulPort,
      service = _ref.service,
      configDir = _ref.config,
      showOutput = _ref.output,
      showRawData = _ref.showRawData,
      nomadToken = _ref.nomadToken,
      consulToken = _ref.consulToken,
      production = _ref.production,
      prodConfigFile = _ref.prodConfigFile;

  logger.info('Retrieving cluster info...');

  var _ref2 = await _core2.default.getNodeInfos({
    nodeIp: nodeIp, nomadPort: nomadPort, consulPort: consulPort, production: production, prodConfigFile: prodConfigFile
  }),
      nodeList = _ref2.nodeList,
      serverConfig = _ref2.serverConfig;

  var distSvc = getDistinctServices(nodeList, production);
  if (service) {
    return showHealthService(service, distSvc, nodeList, showOutput, production, serverConfig);
  }
  var tableHeaders = ['NodeID', 'IP', 'Region'].concat(distSvc);
  var tableBody = nodeList.reduce(getHealthMainRow(distSvc, showRawData, production), []);
  var table = new _cliTable2.default({
    head: tableHeaders
  });
  tableBody.map(function (t) {
    return table.push(t);
  });
  console.log(table.toString());

  return {
    header: tableHeaders,
    body: tableBody
  };
};

exports.default = health;
//# sourceMappingURL=index.js.map
