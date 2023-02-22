'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _api = require('../plugins/schedulers/nomad2/api');

var _api2 = _interopRequireDefault(_api);

var _api3 = require('../plugins/backends/consul2/api');

var _api4 = _interopRequireDefault(_api3);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var Node = function Node(schd, bend, _ref) {
  var nodeID = _ref.nodeID,
      nodeDetail = _ref.nodeDetail,
      nodeServices = _ref.nodeServices,
      nodeChecks = _ref.nodeChecks,
      nodeAddress = _ref.nodeAddress;
  var nodeName = nodeDetail.Name,
      nodeMeta = nodeDetail.Meta;
  var nodeRegion = nodeMeta.region,
      nodeMetaRest = (0, _objectWithoutProperties3.default)(nodeMeta, ['region']);


  var nodeServiceList = (0, _keys2.default)(nodeServices);
  var nodeCheckList = (0, _keys2.default)(nodeChecks);

  var createService = async function createService(svcDef) {
    var res = await bend.agent.service.upsert(svcDef);
    return res;
  };

  var destroyService = async function destroyService(svcName) {
    var res = await bend.agent.service.destroy(svcName);
    return res;
  };

  return {
    createService: createService,
    destroyService: destroyService,

    nodeName: nodeName,
    nodeID: nodeID,
    nodeAddress: nodeAddress,
    nodeMeta: nodeMetaRest,
    nodeRegion: nodeRegion,
    nodeServices: nodeServices,
    nodeChecks: nodeChecks,
    nodeServiceList: nodeServiceList,
    nodeCheckList: nodeCheckList
  };
};

Node.create = function (nomadPort, consulPort) {
  return async function (_ref2) {
    var nodeID = _ref2.nodeID,
        nodeAddress = _ref2.nodeAddress;

    try {
      var schd = (0, _api2.default)(nodeAddress, nomadPort);
      var bend = (0, _api4.default)(nodeAddress, consulPort);
      var nodeDetail = await schd.Api.node.read(nodeID);
      var nodeServices = await bend.Api.agent.service.list();
      var nodeChecks = await bend.Api.agent.check.list();

      return Node(schd.Api, bend.Api, {
        nodeID: nodeID,
        nodeDetail: nodeDetail,
        nodeServices: nodeServices,
        nodeChecks: nodeChecks,
        nodeAddress: nodeAddress
      });
    } catch (e) {
      console.log(e);
      return 0;
    }
  };
};

var getCluster = async function getCluster(nodeHost, nomadPort, consulPort) {
  var schd = (0, _api2.default)(nodeHost, nomadPort);
  var nomadNodeList = await schd.Api.node.list();
  var bend = (0, _api4.default)(nodeHost, consulPort);
  var consulNodeList = await bend.Api.catalog.list();
  var rawNodeList = nomadNodeList.reduce(function (acc, nomadRow) {
    var ID = nomadRow.ID,
        docker = nomadRow.Drivers.docker,
        Address = nomadRow.Address,
        Name = nomadRow.Name,
        Status = nomadRow.Status;

    var consulRow = consulNodeList.filter(function (cRow) {
      return cRow.ID === ID;
    });
    var consulMeta = consulRow.Meta;

    var nodeRow = {
      nodeID: ID,
      driverDocker: docker,
      nodeAddress: Address,
      nodeStatus: Status,
      nodeName: Name,
      consulMeta: consulMeta
    };
    return acc.concat(nodeRow);
  }, []);
  var nodeMaker = Node.create(nomadPort, consulPort);
  var nodeList = await _promise2.default.all(rawNodeList.map(nodeMaker));
  return {
    nodeList: nodeList,
    schd: (0, _extends3.default)({}, schd.Api, { stripNewLine: schd.stripNewLine, Job: schd.Job }),
    bend: bend.Api
  };
};
var getClusterProd = async function getClusterProd(nodeHost, consulPort, Config) {
  var bend = (0, _api4.default)(nodeHost, consulPort);
  var nodeServices = await bend.Api.agent.service.list();
  var nodeChecks = await bend.Api.agent.check.list();
  var nodeServiceList = (0, _keys2.default)(nodeServices);
  var nodeCheckList = (0, _keys2.default)(nodeChecks);
  var createService = async function createService(svcDef) {
    var res = await bend.Api.agent.service.upsert(svcDef);
    return res;
  };

  var destroyService = async function destroyService(svcName) {
    var res = await bend.Api.agent.service.destroy(svcName);
    return res;
  };
  return {
    nodeList: Config.nodes.map(function (node) {
      return {
        nodeID: node.id,
        nodeAddress: node.address,
        nodeRegion: node.region,
        nodeServices: nodeServices,
        nodeChecks: nodeChecks,
        nodeServiceList: nodeServiceList,
        nodeCheckList: nodeCheckList,
        projects: node.projects,
        createService: createService,
        destroyService: destroyService
      };
    }),
    bend: bend.Api,
    serverConfig: Config
  };
};

var getNodeInfos = async function getNodeInfos(_ref3) {
  var production = _ref3.production,
      nodeIp = _ref3.nodeIp,
      consulPort = _ref3.consulPort,
      nomadPort = _ref3.nomadPort,
      prodConfigFile = _ref3.prodConfigFile;

  if (production) {
    var serverConfig = await _util2.default.getProductionFileConfig(prodConfigFile);
    return getClusterProd(nodeIp, consulPort, serverConfig);
  }
  return getCluster(nodeIp, nomadPort, consulPort);
};

exports.default = {
  getCluster: getCluster,
  getClusterProd: getClusterProd,
  getNodeInfos: getNodeInfos
};
//# sourceMappingURL=index.js.map
