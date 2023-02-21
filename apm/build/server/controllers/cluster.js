'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _core = require('../../core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var get = function get(req, res) {
  return async function (_ref) {
    var nodeIp = _ref.node,
        nomadPort = _ref.nomadPort,
        consulPort = _ref.consulPort,
        production = _ref.production,
        prodConfigFile = _ref.prodConfigFile;

    var _ref2 = await _core2.default.getNodeInfos({
      nodeIp: nodeIp, nomadPort: nomadPort, consulPort: consulPort, production: production, prodConfigFile: prodConfigFile
    }),
        nodeList = _ref2.nodeList;

    var result = nodeList.map(function (node) {
      var nodeInfo = {
        name: node.nodeName,
        id: node.nodeId,
        address: node.nodeAddress,
        meta: node.nodeMeta,
        region: node.nodeRegion
      };
      var services = node.nodeServiceList.filter(function (service) {
        return service.includes('bcl-');
      }).map(function (service) {
        return node.nodeServices[service];
      }).map(function (service) {
        return {
          id: service.ID,
          name: service.Service,
          tags: service.Tags,
          port: service.Port,
          address: service.Address
        };
      });
      var checks = node.nodeCheckList.filter(function (check) {
        return check.includes('bcl-');
      }).map(function (check) {
        return node.nodeChecks[check];
      }).map(function (check) {
        return {
          checkId: check.CheckID,
          status: check.Status,
          notes: check.Notes,
          output: check.Output,
          serviceId: check.ServiceID,
          serviceName: check.ServiceName
        };
      });
      return (0, _extends3.default)({}, nodeInfo, {
        services: services,
        checks: checks
      });
    });
    res.write((0, _stringify2.default)(result));
    return res;
  };
};

exports.default = {
  get: get
};
//# sourceMappingURL=cluster.js.map
