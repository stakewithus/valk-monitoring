import pino from 'pino';

import rawRequest from '../../../common/http_client';

const logger = pino().child({ module: 'plugins/backends/consul' });

const AgentServiceAPI = (reqPartial) => {
  const list = (async) => reqPartial('/v1/agent/services', 'GET')({ });

  const upsert = async (serviceDef) => reqPartial('/v1/agent/service/register', 'PUT')({ body: serviceDef });

  const health = async (serviceId) => reqPartial(`/v1/agent/health/service/id/${serviceId}`, 'GET')({});

  const destroy = async (serviceId) => reqPartial(`/v1/agent/service/deregister/${serviceId}`, 'PUT')({ });
  return {
    list,
    upsert,
    health,
    destroy,
  };
};

const AgentCheckAPI = (reqPartial) => {
  const list = (async) => reqPartial('/v1/agent/checks', 'GET')({ });

  const listByFilter = async (f) => reqPartial('/v1/agent/checks', 'GET')({ qs: { filter: f } });

  const register = async (check) => reqPartial('/v1/agent/check/register', 'PUT')({ body: check });

  const destroy = async (checkId) => reqPartial(`/v1/agent/check/deregister/${checkId}`, 'PUT')({ });

  const ttlPass = async (checkId, note) => reqPartial(`/v1/agent/check/pass/${checkId}`, 'PUT')({ qs: { note } });

  const ttlWarn = async (checkId, note) => reqPartial(`/v1/agent/check/warn/${checkId}`, 'PUT')({ qs: { note } });

  const ttlFail = async (checkId, note) => reqPartial(`/v1/agent/check/fail/${checkId}`, 'PUT')({ qs: { note } });

  return {
    list,
    listByFilter,
    register,
    destroy,
    ttlPass,
    ttlWarn,
    ttlFail,
  };
};

const AgentAPI = (reqPartial) => ({
  service: AgentServiceAPI(reqPartial),
  check: AgentCheckAPI(reqPartial),
});

const CatalogAPI = (reqPartial) => {
  const list = (async) => reqPartial('/v1/catalog/nodes', 'GET')({});

  return {
    list,
  };
};

const KVAPI = (reqPartial) => {
  const list = async (keyPath) => reqPartial(`/v1/kv/${keyPath}`, 'GET')({ qs: { keys: true } });

  const get = async (keyPath) => reqPartial(`/v1/kv/${keyPath}`, 'GET')({ });

  const getValue = async (keyPath) => {
    try {
      const response = await reqPartial(`/v1/kv/${keyPath}`, 'GET')({});
      if (response && response.length > 0) {
        const [rawData] = response;
        return Buffer.from(rawData.Value, 'base64').toString('utf-8').replace(/"/g, '').replace(/\\/g, '');
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const upsert = async (keyPath, value, keyOpts) => {
    const kOpts = {
      ...keyOpts,
    };
    const payload = JSON.stringify(value);
    return reqPartial(`/v1/kv/${keyPath}`, 'PUT')({ qs: kOpts, body: payload });
  };

  const del = async (keyPath, keyOpts) => {
    const kOpts = {
      ...keyOpts,
    };
    return reqPartial(`/v1/kv/${keyPath}`, 'DELETE')({ qs: kOpts });
  };

  const txn = async (value) => reqPartial('/v1/txn', 'PUT')({ body: value });

  return {
    list,
    get,
    getValue,
    upsert,
    del,
    txn,
  };
};

const Api = (nodeIP, nodePort, reqArgs = {}) => {
  const reqPartial = rawRequest(nodeIP, nodePort, reqArgs);
  return {
    agent: { ...AgentAPI(reqPartial) },
    catalog: { ...CatalogAPI(reqPartial) },
    kv: { ...KVAPI(reqPartial) },
  };
};

const Backend = (nodeIP = '127.0.0.1', nodePort = 8500, reqArgs = {}) => {
  const api = Api(nodeIP, nodePort, reqArgs);
  return {
    Api: api,
  };
};

export default Backend;
