import Core from '../../core';

const get = (req, res) => async ({
  node: nodeIp, nomadPort, consulPort, production, prodConfigFile,
}) => {
  const { nodeList } = await Core.getNodeInfos({
    nodeIp, nomadPort, consulPort, production, prodConfigFile,
  });
  const result = nodeList.map((node) => {
    const nodeInfo = {
      name: node.nodeName,
      id: node.nodeId,
      address: node.nodeAddress,
      meta: node.nodeMeta,
      region: node.nodeRegion,
    };
    const services = node.nodeServiceList
      .filter((service) => service.includes('bcl-'))
      .map((service) => node.nodeServices[service])
      .map((service) => ({
        id: service.ID,
        name: service.Service,
        tags: service.Tags,
        port: service.Port,
        address: service.Address,
      }));
    const checks = node.nodeCheckList
      .filter((check) => check.includes('bcl-'))
      .map((check) => node.nodeChecks[check])
      .map((check) => ({
        checkId: check.CheckID,
        status: check.Status,
        notes: check.Notes,
        output: check.Output,
        serviceId: check.ServiceID,
        serviceName: check.ServiceName,
      }));
    return {
      ...nodeInfo,
      services,
      checks,
    };
  });
  res.write(JSON.stringify(result));
  return res;
};

export default {
  get,
};
