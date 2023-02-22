'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _http_client = require('../../../common/http_client');

var _http_client2 = _interopRequireDefault(_http_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'plugins/backends/consul' });

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

  var listByFilter = async function listByFilter(f) {
    return reqPartial('/v1/agent/checks', 'GET')({ qs: { filter: f } });
  };

  var register = async function register(check) {
    return reqPartial('/v1/agent/check/register', 'PUT')({ body: check });
  };

  var destroy = async function destroy(checkId) {
    return reqPartial('/v1/agent/check/deregister/' + checkId, 'PUT')({});
  };

  var ttlPass = async function ttlPass(checkId, note) {
    return reqPartial('/v1/agent/check/pass/' + checkId, 'PUT')({ qs: { note: note } });
  };

  var ttlWarn = async function ttlWarn(checkId, note) {
    return reqPartial('/v1/agent/check/warn/' + checkId, 'PUT')({ qs: { note: note } });
  };

  var ttlFail = async function ttlFail(checkId, note) {
    return reqPartial('/v1/agent/check/fail/' + checkId, 'PUT')({ qs: { note: note } });
  };

  return {
    list: list,
    listByFilter: listByFilter,
    register: register,
    destroy: destroy,
    ttlPass: ttlPass,
    ttlWarn: ttlWarn,
    ttlFail: ttlFail
  };
};

var AgentAPI = function AgentAPI(reqPartial) {
  return {
    service: AgentServiceAPI(reqPartial),
    check: AgentCheckAPI(reqPartial)
  };
};

var CatalogAPI = function CatalogAPI(reqPartial) {
  var list = function list(async) {
    return reqPartial('/v1/catalog/nodes', 'GET')({});
  };

  return {
    list: list
  };
};

var KVAPI = function KVAPI(reqPartial) {
  var list = async function list(keyPath) {
    return reqPartial('/v1/kv/' + keyPath, 'GET')({ qs: { keys: true } });
  };

  var get = async function get(keyPath) {
    return reqPartial('/v1/kv/' + keyPath, 'GET')({});
  };

  var getValue = async function getValue(keyPath) {
    try {
      var response = await reqPartial('/v1/kv/' + keyPath, 'GET')({});
      if (response && response.length > 0) {
        var _response = (0, _slicedToArray3.default)(response, 1),
            rawData = _response[0];

        return Buffer.from(rawData.Value, 'base64').toString('utf-8').replace(/"/g, '').replace(/\\/g, '');
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  var upsert = async function upsert(keyPath, value, keyOpts) {
    var kOpts = (0, _extends3.default)({}, keyOpts);
    var payload = (0, _stringify2.default)(value);
    return reqPartial('/v1/kv/' + keyPath, 'PUT')({ qs: kOpts, body: payload });
  };

  var del = async function del(keyPath, keyOpts) {
    var kOpts = (0, _extends3.default)({}, keyOpts);
    return reqPartial('/v1/kv/' + keyPath, 'DELETE')({ qs: kOpts });
  };

  var txn = async function txn(value) {
    return reqPartial('/v1/txn', 'PUT')({ body: value });
  };

  return {
    list: list,
    get: get,
    getValue: getValue,
    upsert: upsert,
    del: del,
    txn: txn
  };
};

var Api = function Api(nodeIP, nodePort) {
  var reqArgs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var reqPartial = (0, _http_client2.default)(nodeIP, nodePort, reqArgs);
  return {
    agent: (0, _extends3.default)({}, AgentAPI(reqPartial)),
    catalog: (0, _extends3.default)({}, CatalogAPI(reqPartial)),
    kv: (0, _extends3.default)({}, KVAPI(reqPartial))
  };
};

var Backend = function Backend() {
  var nodeIP = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '127.0.0.1';
  var nodePort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8500;
  var reqArgs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var api = Api(nodeIP, nodePort, reqArgs);
  return {
    Api: api
  };
};

exports.default = Backend;
//# sourceMappingURL=api.js.map
