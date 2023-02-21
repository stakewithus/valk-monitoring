/* eslint-disable max-len */

import fs from 'fs';
import Bluebird from 'bluebird';
import pino from 'pino';
import chalk from 'chalk';
import Table from 'cli-table';
import Util from '../common/util';

import Core from '../core';

Bluebird.promisifyAll(fs);
const logger = pino().child({ module: 'cmd/health' });

const getDistinctServices = (nodeList, isSingleHost) => {
  const svcPrefix = 'bcl-';
  const services = nodeList.reduce((acc, n) => {
    const { nodeServiceList } = n;
    const critMet = nodeServiceList.filter((svc) => svc.startsWith(svcPrefix));
    let critNew = critMet.filter((svc) => acc.indexOf(svc) === -1);
    if (isSingleHost) {
      critNew = critNew.map((svc) => svc.split(':')[0]);
    }
    return acc.concat(critNew);
  }, []);
  services.sort();
  return [...new Set(services)];
};

const getHealthMainRow = (distSvc, showRawData, isSingleHost) => (acc, n) => {
  const {
    nodeID,
    nodeAddress,
    nodeRegion,
    nodeServiceList,
    nodeCheckList,
    nodeChecks,
  } = n;
  const nid = showRawData ? `${nodeID.slice(0, 8)}..` : nodeID;
  const initRow = [nid, nodeAddress, nodeRegion];
  const svcRow = distSvc.reduce((aacc, prjName) => {
    const serviceName = Util.getServiceName(prjName, isSingleHost, nodeRegion);
    const svcIdx = nodeServiceList.indexOf(serviceName);
    if (svcIdx === -1) return aacc.concat('-');
    const svcPrefix = `service:${serviceName}`;
    const svcChecks = nodeCheckList.filter((c) => c.startsWith(svcPrefix));
    const checkStatus = svcChecks.map((chkName) => nodeChecks[chkName].Status);
    const numPass = checkStatus.filter((s) => s === 'passing').length;
    const numWarn = checkStatus.filter((s) => s === 'warning').length;
    const numFail = checkStatus.filter((s) => s === 'critical').length;
    const svcStatus = showRawData ? `${numPass} (pass), ${numWarn} (warn), ${numFail} (critical)`
      : `(${chalk.green(numPass)}, ${chalk.yellow(numWarn)}, ${chalk.red(numFail)})`;
    return aacc.concat(svcStatus);
  }, []);
  const fullRow = initRow.concat(svcRow);
  return acc.concat([fullRow]);
};

const getTableDataByNode = (node, service, showOutput, production) => {
  if (!node) {
    console.log('Node check is empty!');
    return {};
  }
  const checkRecords = Object.values(node.nodeChecks)
    .filter((check) => check.ServiceID === Util.getServiceName(service, production, node.nodeRegion));
  const checkStatus = checkRecords.reduce((acc, check) => {
    const content = check.Status;
    if (showOutput) {
      if (check.Name === showOutput) {
        acc[check.Name] = `${check.CheckID} ${content} (${check.Output})`;
      }
    } else {
      acc[check.Name] = content;
    }
    return acc;
  }, {});
  const header = ['NodeID', 'IP', 'Region'].concat(Object.keys(checkStatus));
  const row = [`${node.nodeID.slice(0, 8)}..`, node.nodeAddress, node.nodeRegion].concat(Object.values(checkStatus));
  return {
    header,
    row,
  };
};
const showHealthService = async (
  service, distSvc, nodeList, showOutput, production, serverConfig,
) => {
  const svcPrefix = 'bcl-';
  const serviceId = `${svcPrefix}${service}`;
  if (!distSvc.find((s) => s.startsWith(serviceId))) {
    return console.log('Service not found!');
  }
  const nodes = nodeList.filter((n) => {
    if (!n) {
      return null;
    }
    const offlineNodes = (serverConfig && serverConfig.deRegisterServices[service]) || [];
    return production
      ? (n.projects.find((p) => p.name === service) && !offlineNodes.includes(n.nodeRegion))
      : Object.values(n.nodeChecks)
        .find((check) => check.ServiceID === Util.getServiceName(service, production, n.nodeRegion));
  });
  const [firstNode] = nodes;
  const tableData = getTableDataByNode(firstNode, service, showOutput, production);
  const table = new Table({
    head: tableData.header,
  });
  const tableBody = [];
  tableBody.push(tableData.row);
  nodes.slice(1, nodes.length).map((node) => {
    const data = getTableDataByNode(node, service, showOutput, production);
    return tableBody.push(data.row);
  });
  tableBody.map((t) => table.push(t));
  console.log(table.toString());
  return {
    header: tableData.header,
    body: tableBody,
  };
};

const health = async ({
  node: nodeIp,
  nomadPort,
  consulPort,
  service,
  config: configDir,
  output: showOutput,
  showRawData,
  nomadToken,
  consulToken,
  production,
  prodConfigFile,
}) => {
  logger.info('Retrieving cluster info...');
  const { nodeList, serverConfig } = await Core.getNodeInfos({
    nodeIp, nomadPort, consulPort, production, prodConfigFile,
  });
  const distSvc = getDistinctServices(nodeList, production);
  if (service) {
    return showHealthService(service, distSvc, nodeList, showOutput, production, serverConfig);
  }
  const tableHeaders = ['NodeID', 'IP', 'Region'].concat(distSvc);
  const tableBody = nodeList.reduce(getHealthMainRow(distSvc, showRawData, production), []);
  const table = new Table({
    head: tableHeaders,
  });
  tableBody.map((t) => table.push(t));
  console.log(table.toString());

  return {
    header: tableHeaders,
    body: tableBody,
  };
};

export default health;
