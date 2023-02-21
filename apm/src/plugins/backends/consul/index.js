import pino from 'pino';
import rawRequest from '../../../common/http_client';

const logger = pino().child({ module: 'plugin/backend/consul' });

const tendermintServiceMapper = (nodeIP) => (job) => {
  const {
    projectName,
    nodeResourceAlloc,
    // desiredAvail,
  } = job;
  const {
    desiredPorts: {
      http_p2p: httpP2P,
      http_rpc: httpRPC,
    },
  } = nodeResourceAlloc;
  // Register all the checks
  const svcName = `bcl-${projectName}`;
  // Basic Checks
  const httpRPCAlive = {
    Name: 'http-rpc-alive',
    Notes: 'Checks that Tendermint RPC Server is running',
    HTTP: `http://${nodeIP}:${httpRPC}/status`,
    Method: 'GET',
    Interval: '3s',
    ServiceID: svcName,
    Status: 'critical',
  };

  const httpP2PAlive = {
    Name: 'http-p2p-alive',
    Notes: 'Checks that Tendermint P2P Server is running',
    TCP: `${nodeIP}:${httpP2P}`,
    Interval: '3s',
    ServiceID: svcName,
    Status: 'critical',
  };
  // Advanced Checks
  const tmMissedBlocks = {
    Name: 'tm-missed-blocks',
    Notes: 'Tally for monitoring missed blocks threshold',
    TTL: '5s',
    ServiceID: svcName,
    Status: 'critical',
  };
  const tmLateBlock = {
    Name: 'tm-late-block-time',
    Notes: 'Tally for late block time threshold',
    TTL: '5s',
    ServiceID: svcName,
    Status: 'critical',
  };
  const tmPeerCount = {
    Name: 'tm-peer-count',
    Notes: 'Tally for peer count threshold',
    TTL: '5s',
    ServiceID: svcName,
    Status: 'critical',
  };
  // Sample Service Definition / Payload
  const svcDef = {
    ID: svcName,
    Name: svcName,
    Address: nodeIP, // Set to the local agent's address
    Port: httpP2P,
    Meta: {
      'node-project': 'blockchain-client',
    },
    Checks: [
      httpRPCAlive,
      httpP2PAlive,
      tmMissedBlocks,
      tmLateBlock,
      tmPeerCount,
    ],
  };
  return svcDef;
};


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

  const destroy = async (checkId) => reqPartial(`/v1/agent/check/deregister/${checkId}`, 'PUT')({ });

  const ttlPass = async (checkId) => reqPartial(`/v1/agent/check/pass/${checkId}`, 'PUT')({ });

  const ttlWarn = async (checkId) => reqPartial(`/v1/agent/check/warn/${checkId}`, 'PUT')({ });

  const ttlFail = async (checkId) => reqPartial(`/v1/agent/check/fail/${checkId}`, 'PUT')({ });

  return {
    list,
    destroy,
    ttlPass,
    ttlWarn,
    ttlFail,
  };
};

// TODO Reserved for future agent interactions
const AgentAPI = (reqPartial) => ({
  service: AgentServiceAPI(reqPartial),
  check: AgentCheckAPI(reqPartial),
});
const CatalogAPI = (reqPartial) => {
  const listNode = (async) => reqPartial('/v1/catalog/nodes', 'GET')({});

  return {
    listNode,
  };
};

const KVAPI = (reqPartial) => {
  const list = async (keyPath) => reqPartial(`/v1/kv/${keyPath}`, 'GET')({ });

  const get = async (keyPath) => reqPartial(`/v1/kv/${keyPath}`, 'GET')({ });

  const upsert = async (keyPath, value, keyOpts) => {
    const kOpts = {
      cas: 1,
      ...keyOpts,
    };
    return reqPartial(`/v1/kv/${keyPath}`, 'PUT')({ qs: kOpts });
  };

  const remove = async (keyPath) => reqPartial(`/v1/kv/${keyPath}`, 'DELETE')({});
  return {
    list,
    get,
    upsert,
    remove,
  };
};
// Update K/V
// await client.kv.upsert('bcl-commit-hub/crust-2/ap-southeast-1/900000/B1927',1, {});

const Client = (nodeIP, nodePort, reqArgs = {}) => {
  const reqPartial = rawRequest(nodeIP, nodePort, reqArgs);
  return {
    agent: { ...AgentAPI(reqPartial) },
    catalog: { ...CatalogAPI(reqPartial) },
    kv: { ...KVAPI(reqPartial) },
  };
};

const Mesh = (nodeIP, nodePort = 8500) => (jobLayout) => {
  const client = Client(nodeIP, nodePort, {});

  const serviceLayouts = jobLayout.map((job) => {
    const {
      nodeProjectCategory,
      nodeProject,
      ...details
    } = job;
    if (nodeProject === 'blockchain-client') {
      //
      if (nodeProjectCategory === 'tendermint') {
        //
        return tendermintServiceMapper(nodeIP)(details);
      }
    }
    return [];
  });

  const createService = async (svcLayout) => {
    try {
      logger.info('Attempting to create new service...');
      console.log(JSON.stringify(svcLayout, null, 2));
      const res = await client.agent.service.upsert(svcLayout);
      return res;
    } catch (httpErr) {
      logger.error('Http Error when creating new service');
      return 0;
    }
  };
  const destroyCheck = async (chkId) => {
    try {
      //
      const destroyRes = await client.agent.check.destroy(chkId);
      return destroyRes;
    } catch (httpErr) {
      logger.error('destroyCheck caught exception');
      console.log(httpErr);
      return 0;
    }
  };

  const destroyService = async (svcId) => {
    // Destroy the service itself
    let destroyRes = {};
    try {
      destroyRes = await client.agent.service.destroy(svcId);
    } catch (httpErr) {
      logger.error('destroyRes caught exception');
      console.log(httpErr);
      return 0;
    }
    // Destroy related checks
    const allChecks = await client.agent.check.list();
    const serviceChecks = Object.keys(allChecks).reduce((acc, chkID) => {
      const chk = allChecks[chkID];
      const {
        ServiceID,
      } = chk;
      if (ServiceID !== svcId) return acc;
      return acc.concat(chkID);
    }, []);
    const destroyCheckRes = await Promise.all(serviceChecks.map(destroyCheck));
    return {
      destroyRes,
      destroyCheckRes,
    };
  };

  const sync = async (updateNow = false) => {
    logger.info('Syncing Service Mesh');
    // Based on the jobLayout, produce a desired service definition
    const rawSvc = await client.agent.service.list();
    const currentSvcList = Object.keys(rawSvc);
    const newServiceList = serviceLayouts.reduce((acc, layout) => {
      const { ID } = layout;
      if (currentSvcList.indexOf(ID) === -1) return acc.concat(layout);
      return acc;
    }, []);
    const layoutIDs = serviceLayouts.reduce((acc, { ID }) => acc.concat(ID), []);
    const destroyServiceList = currentSvcList.reduce((acc, currentSvcID) => {
      const currentSvc = rawSvc[currentSvcID];
      const {
        ID,
        Meta: {
          'node-project': nodeProject,
        },
      } = currentSvc;
      if (typeof nodeProject === 'undefined') return acc;
      if (nodeProject !== 'blockchain-client') return acc;
      if (layoutIDs.indexOf(ID) !== -1) return acc;
      return acc.concat(ID);
    }, []);
    logger.info(`New Service Length: ${newServiceList.length}`);
    if (newServiceList.length > 0) {
      // Find the service definition and create it
      const createRes = await Promise.all(newServiceList.map(createService));
      console.log('createRes');
      console.log(createRes);
    }
    logger.info(`Destroy Service Length: ${destroyServiceList.length}`);
    // TODO Write logic for deleting old services as well
    if (destroyServiceList.length > 0) {
      const destroyRes = await Promise.all(destroyServiceList.map(destroyService));
      console.log('destroyRes');
      console.log(destroyRes);
    }
  };

  const procHealthStatus = (rawHealth) => {
    const {
      AggregatedStatus,
      Service: {
        ID: svcID,
        Meta: {
          region,
        },
        Address,
      },
      Checks,
    } = rawHealth;
    const checkList = Checks.reduce((acc, chk) => {
      const {
        CheckID,
        Name,
        Status,
        Output,
      } = chk;
      return acc.concat({
        svcStatus: AggregatedStatus,
        svcID,
        chkID: CheckID,
        chkName: Name,
        chkStatus: Status,
        chkOutput: Output,
        svcRegion: region,
        svcAddress: Address,
      });
    }, []);
    return checkList;
  };
  const getHealthStatus = async (svcID) => {
    try {
      const rawHealth = await client.agent.service.health(svcID);
      const healthRes = procHealthStatus(rawHealth);
      return healthRes;
    } catch (httpErr) {
      logger.error('getHealthStatus got HttpError');
      console.log(httpErr);
      return [];
    }
  };
  const health = async () => {
    const rawSvc = await client.agent.service.list();
    const currentSvcList = Object.keys(rawSvc);
    // Filter out those without the Meta:node-project tag
    const filterSvc = currentSvcList.reduce((acc, svcID) => {
      const { Meta: { 'node-project': nodeProject } } = rawSvc[svcID];
      if (typeof nodeProject === 'undefined') return acc;
      if (nodeProject !== 'blockchain-client') return acc;
      return acc.concat(svcID);
    }, []);
    const healthResList = await Promise.all(filterSvc.map(getHealthStatus));
    const healthRes = healthResList.reduce((acc, healthRow) => acc.concat([...healthRow]), []);
    return healthRes;
  };
  return {
    sync,
    health,
  };
};

export {
  Client,
  Mesh,
};
