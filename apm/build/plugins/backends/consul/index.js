'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mesh = exports.Client = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _http_client = require('../../../common/http_client');

var _http_client2 = _interopRequireDefault(_http_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'plugin/backend/consul' });

var tendermintServiceMapper = function tendermintServiceMapper(nodeIP) {
  return function (job) {
    var projectName = job.projectName,
        nodeResourceAlloc = job.nodeResourceAlloc;
    var _nodeResourceAlloc$de = nodeResourceAlloc.desiredPorts,
        httpP2P = _nodeResourceAlloc$de.http_p2p,
        httpRPC = _nodeResourceAlloc$de.http_rpc;
    // Register all the checks

    var svcName = 'bcl-' + projectName;
    // Basic Checks
    var httpRPCAlive = {
      Name: 'http-rpc-alive',
      Notes: 'Checks that Tendermint RPC Server is running',
      HTTP: 'http://' + nodeIP + ':' + httpRPC + '/status',
      Method: 'GET',
      Interval: '3s',
      ServiceID: svcName,
      Status: 'critical'
    };

    var httpP2PAlive = {
      Name: 'http-p2p-alive',
      Notes: 'Checks that Tendermint P2P Server is running',
      TCP: nodeIP + ':' + httpP2P,
      Interval: '3s',
      ServiceID: svcName,
      Status: 'critical'
    };
    // Advanced Checks
    var tmMissedBlocks = {
      Name: 'tm-missed-blocks',
      Notes: 'Tally for monitoring missed blocks threshold',
      TTL: '5s',
      ServiceID: svcName,
      Status: 'critical'
    };
    var tmLateBlock = {
      Name: 'tm-late-block-time',
      Notes: 'Tally for late block time threshold',
      TTL: '5s',
      ServiceID: svcName,
      Status: 'critical'
    };
    var tmPeerCount = {
      Name: 'tm-peer-count',
      Notes: 'Tally for peer count threshold',
      TTL: '5s',
      ServiceID: svcName,
      Status: 'critical'
    };
    // Sample Service Definition / Payload
    var svcDef = {
      ID: svcName,
      Name: svcName,
      Address: nodeIP, // Set to the local agent's address
      Port: httpP2P,
      Meta: {
        'node-project': 'blockchain-client'
      },
      Checks: [httpRPCAlive, httpP2PAlive, tmMissedBlocks, tmLateBlock, tmPeerCount]
    };
    return svcDef;
  };
};

var AgentServiceAPI = function AgentServiceAPI(reqPartial) {
  var list = function list(async) {
    return reqPartial('/v1/agent/services', 'GET')({});
  };

  var upsert = async function upsert(serviceDef) {
    return reqPartial('/v1/agent/service/register', 'PUT')({ body: serviceDef });
  };

  var health = async function health(serviceId) {
    return reqPartial('/v1/agent/health/service/id/' + serviceId, 'GET')({});
  };

  var destroy = async function destroy(serviceId) {
    return reqPartial('/v1/agent/service/deregister/' + serviceId, 'PUT')({});
  };
  return {
    list: list,
    upsert: upsert,
    health: health,
    destroy: destroy
  };
};

var AgentCheckAPI = function AgentCheckAPI(reqPartial) {
  var list = function list(async) {
    return reqPartial('/v1/agent/checks', 'GET')({});
  };

  var destroy = async function destroy(checkId) {
    return reqPartial('/v1/agent/check/deregister/' + checkId, 'PUT')({});
  };

  var ttlPass = async function ttlPass(checkId) {
    return reqPartial('/v1/agent/check/pass/' + checkId, 'PUT')({});
  };

  var ttlWarn = async function ttlWarn(checkId) {
    return reqPartial('/v1/agent/check/warn/' + checkId, 'PUT')({});
  };

  var ttlFail = async function ttlFail(checkId) {
    return reqPartial('/v1/agent/check/fail/' + checkId, 'PUT')({});
  };

  return {
    list: list,
    destroy: destroy,
    ttlPass: ttlPass,
    ttlWarn: ttlWarn,
    ttlFail: ttlFail
  };
};

// TODO Reserved for future agent interactions
var AgentAPI = function AgentAPI(reqPartial) {
  return {
    service: AgentServiceAPI(reqPartial),
    check: AgentCheckAPI(reqPartial)
  };
};
var CatalogAPI = function CatalogAPI(reqPartial) {
  var listNode = function listNode(async) {
    return reqPartial('/v1/catalog/nodes', 'GET')({});
  };

  return {
    listNode: listNode
  };
};

var KVAPI = function KVAPI(reqPartial) {
  var list = async function list(keyPath) {
    return reqPartial('/v1/kv/' + keyPath, 'GET')({});
  };

  var get = async function get(keyPath) {
    return reqPartial('/v1/kv/' + keyPath, 'GET')({});
  };

  var upsert = async function upsert(keyPath, value, keyOpts) {
    var kOpts = (0, _extends3.default)({
      cas: 1
    }, keyOpts);
    return reqPartial('/v1/kv/' + keyPath, 'PUT')({ qs: kOpts });
  };

  var remove = async function remove(keyPath) {
    return reqPartial('/v1/kv/' + keyPath, 'DELETE')({});
  };
  return {
    list: list,
    get: get,
    upsert: upsert,
    remove: remove
  };
};
// Update K/V
// await client.kv.upsert('bcl-commit-hub/crust-2/ap-southeast-1/900000/B1927',1, {});

var Client = function Client(nodeIP, nodePort) {
  var reqArgs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var reqPartial = (0, _http_client2.default)(nodeIP, nodePort, reqArgs);
  return {
    agent: (0, _extends3.default)({}, AgentAPI(reqPartial)),
    catalog: (0, _extends3.default)({}, CatalogAPI(reqPartial)),
    kv: (0, _extends3.default)({}, KVAPI(reqPartial))
  };
};

var Mesh = function Mesh(nodeIP) {
  var nodePort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8500;
  return function (jobLayout) {
    var client = Client(nodeIP, nodePort, {});

    var serviceLayouts = jobLayout.map(function (job) {
      var nodeProjectCategory = job.nodeProjectCategory,
          nodeProject = job.nodeProject,
          details = (0, _objectWithoutProperties3.default)(job, ['nodeProjectCategory', 'nodeProject']);

      if (nodeProject === 'blockchain-client') {
        //
        if (nodeProjectCategory === 'tendermint') {
          //
          return tendermintServiceMapper(nodeIP)(details);
        }
      }
      return [];
    });

    var createService = async function createService(svcLayout) {
      try {
        logger.info('Attempting to create new service...');
        console.log((0, _stringify2.default)(svcLayout, null, 2));
        var res = await client.agent.service.upsert(svcLayout);
        return res;
      } catch (httpErr) {
        logger.error('Http Error when creating new service');
        return 0;
      }
    };
    var destroyCheck = async function destroyCheck(chkId) {
      try {
        //
        var destroyRes = await client.agent.check.destroy(chkId);
        return destroyRes;
      } catch (httpErr) {
        logger.error('destroyCheck caught exception');
        console.log(httpErr);
        return 0;
      }
    };

    var destroyService = async function destroyService(svcId) {
      // Destroy the service itself
      var destroyRes = {};
      try {
        destroyRes = await client.agent.service.destroy(svcId);
      } catch (httpErr) {
        logger.error('destroyRes caught exception');
        console.log(httpErr);
        return 0;
      }
      // Destroy related checks
      var allChecks = await client.agent.check.list();
      var serviceChecks = (0, _keys2.default)(allChecks).reduce(function (acc, chkID) {
        var chk = allChecks[chkID];
        var ServiceID = chk.ServiceID;

        if (ServiceID !== svcId) return acc;
        return acc.concat(chkID);
      }, []);
      var destroyCheckRes = await _promise2.default.all(serviceChecks.map(destroyCheck));
      return {
        destroyRes: destroyRes,
        destroyCheckRes: destroyCheckRes
      };
    };

    var sync = async function sync() {
      var updateNow = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      logger.info('Syncing Service Mesh');
      // Based on the jobLayout, produce a desired service definition
      var rawSvc = await client.agent.service.list();
      var currentSvcList = (0, _keys2.default)(rawSvc);
      var newServiceList = serviceLayouts.reduce(function (acc, layout) {
        var ID = layout.ID;

        if (currentSvcList.indexOf(ID) === -1) return acc.concat(layout);
        return acc;
      }, []);
      var layoutIDs = serviceLayouts.reduce(function (acc, _ref) {
        var ID = _ref.ID;
        return acc.concat(ID);
      }, []);
      var destroyServiceList = currentSvcList.reduce(function (acc, currentSvcID) {
        var currentSvc = rawSvc[currentSvcID];
        var ID = currentSvc.ID,
            nodeProject = currentSvc.Meta['node-project'];

        if (typeof nodeProject === 'undefined') return acc;
        if (nodeProject !== 'blockchain-client') return acc;
        if (layoutIDs.indexOf(ID) !== -1) return acc;
        return acc.concat(ID);
      }, []);
      logger.info('New Service Length: ' + newServiceList.length);
      if (newServiceList.length > 0) {
        // Find the service definition and create it
        var createRes = await _promise2.default.all(newServiceList.map(createService));
        console.log('createRes');
        console.log(createRes);
      }
      logger.info('Destroy Service Length: ' + destroyServiceList.length);
      // TODO Write logic for deleting old services as well
      if (destroyServiceList.length > 0) {
        var destroyRes = await _promise2.default.all(destroyServiceList.map(destroyService));
        console.log('destroyRes');
        console.log(destroyRes);
      }
    };

    var procHealthStatus = function procHealthStatus(rawHealth) {
      var AggregatedStatus = rawHealth.AggregatedStatus,
          _rawHealth$Service = rawHealth.Service,
          svcID = _rawHealth$Service.ID,
          region = _rawHealth$Service.Meta.region,
          Address = _rawHealth$Service.Address,
          Checks = rawHealth.Checks;

      var checkList = Checks.reduce(function (acc, chk) {
        var CheckID = chk.CheckID,
            Name = chk.Name,
            Status = chk.Status,
            Output = chk.Output;

        return acc.concat({
          svcStatus: AggregatedStatus,
          svcID: svcID,
          chkID: CheckID,
          chkName: Name,
          chkStatus: Status,
          chkOutput: Output,
          svcRegion: region,
          svcAddress: Address
        });
      }, []);
      return checkList;
    };
    var getHealthStatus = async function getHealthStatus(svcID) {
      try {
        var rawHealth = await client.agent.service.health(svcID);
        var healthRes = procHealthStatus(rawHealth);
        return healthRes;
      } catch (httpErr) {
        logger.error('getHealthStatus got HttpError');
        console.log(httpErr);
        return [];
      }
    };
    var health = async function health() {
      var rawSvc = await client.agent.service.list();
      var currentSvcList = (0, _keys2.default)(rawSvc);
      // Filter out those without the Meta:node-project tag
      var filterSvc = currentSvcList.reduce(function (acc, svcID) {
        var nodeProject = rawSvc[svcID].Meta['node-project'];

        if (typeof nodeProject === 'undefined') return acc;
        if (nodeProject !== 'blockchain-client') return acc;
        return acc.concat(svcID);
      }, []);
      var healthResList = await _promise2.default.all(filterSvc.map(getHealthStatus));
      var healthRes = healthResList.reduce(function (acc, healthRow) {
        return acc.concat([].concat((0, _toConsumableArray3.default)(healthRow)));
      }, []);
      return healthRes;
    };
    return {
      sync: sync,
      health: health
    };
  };
};

exports.Client = Client;
exports.Mesh = Mesh;
//# sourceMappingURL=index.js.map
