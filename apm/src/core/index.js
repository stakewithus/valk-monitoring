import fs from 'fs';
import Bluebird from 'bluebird';
import Scheduler from '../plugins/schedulers/nomad2/api';
import Backend from '../plugins/backends/consul2/api';
import Util from '../common/util';

Bluebird.promisifyAll(fs);

const Node = (
  schd,
  bend,
  {
    nodeID,
    nodeDetail,
    nodeServices,
    nodeChecks,
    nodeAddress,
  },
) => {
  const {
    Name: nodeName,
    Meta: nodeMeta,
  } = nodeDetail;
  const {
    region: nodeRegion,
    ...nodeMetaRest
  } = nodeMeta;

  const nodeServiceList = Object.keys(nodeServices);
  const nodeCheckList = Object.keys(nodeChecks);

  const createService = async (svcDef) => {
    const res = await bend.agent.service.upsert(svcDef);
    return res;
  };

  const destroyService = async (svcName) => {
    const res = await bend.agent.service.destroy(svcName);
    return res;
  };


  return {
    createService,
    destroyService,

    nodeName,
    nodeID,
    nodeAddress,
    nodeMeta: nodeMetaRest,
    nodeRegion,
    nodeServices,
    nodeChecks,
    nodeServiceList,
    nodeCheckList,
  };
};

Node.create = (nomadPort, consulPort) => async ({ nodeID, nodeAddress }) => {
  try {
    const schd = Scheduler(nodeAddress, nomadPort);
    const bend = Backend(nodeAddress, consulPort);
    const nodeDetail = await schd.Api.node.read(nodeID);
    const nodeServices = await bend.Api.agent.service.list();
    const nodeChecks = await bend.Api.agent.check.list();

    return Node(
      schd.Api,
      bend.Api,
      {
        nodeID,
        nodeDetail,
        nodeServices,
        nodeChecks,
        nodeAddress,
      },
    );
  } catch (e) {
    console.log(e);
    return 0;
  }
};

const getCluster = async (
  nodeHost,
  nomadPort,
  consulPort,
) => {
  const schd = Scheduler(nodeHost, nomadPort);
  const nomadNodeList = await schd.Api.node.list();
  const bend = Backend(nodeHost, consulPort);
  const consulNodeList = await bend.Api.catalog.list();
  const rawNodeList = nomadNodeList.reduce((acc, nomadRow) => {
    const {
      ID,
      Drivers: { docker },
      Address,
      Name,
      Status,
    } = nomadRow;
    const consulRow = consulNodeList.filter((cRow) => cRow.ID === ID);
    const { Meta: consulMeta } = consulRow;
    const nodeRow = {
      nodeID: ID,
      driverDocker: docker,
      nodeAddress: Address,
      nodeStatus: Status,
      nodeName: Name,
      consulMeta,
    };
    return acc.concat(nodeRow);
  }, []);
  const nodeMaker = Node.create(nomadPort, consulPort);
  const nodeList = await Promise.all(rawNodeList.map(nodeMaker));
  return {
    nodeList,
    schd: { ...schd.Api, stripNewLine: schd.stripNewLine, Job: schd.Job },
    bend: bend.Api,
  };
};
const getClusterProd = async (
  nodeHost,
  consulPort,
  Config,
) => {
  const bend = Backend(nodeHost, consulPort);
  const nodeServices = await bend.Api.agent.service.list();
  const nodeChecks = await bend.Api.agent.check.list();
  const nodeServiceList = Object.keys(nodeServices);
  const nodeCheckList = Object.keys(nodeChecks);
  const createService = async (svcDef) => {
    const res = await bend.Api.agent.service.upsert(svcDef);
    return res;
  };

  const destroyService = async (svcName) => {
    const res = await bend.Api.agent.service.destroy(svcName);
    return res;
  };
  return {
    nodeList: Config.nodes.map((node) => ({
      nodeID: node.id,
      nodeAddress: node.address,
      nodeRegion: node.region,
      nodeServices,
      nodeChecks,
      nodeServiceList,
      nodeCheckList,
      projects: node.projects,
      createService,
      destroyService,
    })),
    bend: bend.Api,
    serverConfig: Config,
  };
};

const getNodeInfos = async ({
  production,
  nodeIp,
  consulPort,
  nomadPort,
  prodConfigFile,
}) => {
  if (production) {
    const serverConfig = await Util.getProductionFileConfig(prodConfigFile);
    return getClusterProd(nodeIp, consulPort, serverConfig);
  }
  return getCluster(nodeIp, nomadPort, consulPort);
};

export default {
  getCluster,
  getClusterProd,
  getNodeInfos,
};
