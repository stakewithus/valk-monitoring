/* eslint-disable import/no-named-as-default-member */
import pino from 'pino';
import moment from 'moment';
import KVStore from '../../monit/kv-store';
import InfluxStore from '../../monit/influx-store';
import Util from '../../common/util';
import Config from '../../config/dev';
import Core from '../../core';

const logger = pino().child({
  module: 'controllers/status',
});

const getProjectAndNetworkList = (keys) => {
  const list = keys.reduce((acc, key) => {
    const [, , project, network] = key.split('/');
    const isExist = acc.find((e) => e.project === project && e.network === network);
    if (!isExist) {
      acc.push({
        project,
        network,
      });
    }
    return acc;
  }, []);
  return list;
};

const getProjectNetworkAndRegionList = (keys) => {
  // projects/nodes/bcl-commit-hub/unknown/ap-southeast-1a/status/peers-total'
  const list = keys.reduce((acc, key) => {
    const [, , project, network, region] = key.split('/');
    const isExist = acc
      .find((e) => e.project === project && e.network === network && e.region === region);
    if (!isExist) {
      acc.push({
        project,
        network,
        region,
      });
    }
    return acc;
  }, []);
  return list;
};

const getLastBlockCommits = (Backend) => async ({
  latestBlockHeight,
  metaData,
}) => {
  if (latestBlockHeight < 2) {
    return [];
  }
  const from = latestBlockHeight > Config.numberOfLastCommits
    ? latestBlockHeight - Config.numberOfLastCommits - 1 : 1;
  const blockCommitsValues = await KVStore.getBlockCommitKeys(Backend)({
    from,
    to: latestBlockHeight - 1,
    metaData,
  });
  return blockCommitsValues.map((c) => (!!+c.value));
};

const getTotalChecks = (healthChecks) => healthChecks.reduce((acc, health) => {
  const metric = health.checks.reduce((acc2, check) => {
    const tmpAcc = Object.assign(acc2);
    if (check.Status === 'passing') {
      tmpAcc.passing = acc2.passing + 1;
    } else if (check.Status === 'warning') {
      tmpAcc.warning = acc2.warning + 1;
    } else if (check.Status === 'critical') {
      tmpAcc.critical = acc2.critical + 1;
    }
    return tmpAcc;
  }, {
    passing: 0,
    critical: 0,
    warning: 0,
  });
  acc.passing += metric.passing;
  acc.critical += metric.critical;
  acc.warning += metric.warning;
  return acc;
}, {
  passing: 0,
  critical: 0,
  warning: 0,
});

const nodeStatusMap = {
  passing: 0,
  warning: 1,
  critical: 2,
};

const getTotalChecksByWorstStatus = (healthChecks) => {
  const out = {
    passing: 0,
    warning: 0,
    critical: 0,
  };
  healthChecks.forEach((health) => {
    out[health.checks.sort((a, b) => nodeStatusMap[b.Status]
      - nodeStatusMap[a.Status])[0].Status] += 1;
  });
  return out;
};

const getRegionChecks = (
  healthChecks, region,
) => healthChecks.filter((check) => check.region === region).map(((hc) => {
  const checks = hc.checks.map((c) => ({
    checkId: c.CheckID,
    name: c.Name,
    status: c.Status,
    output: c.Output,
  }));
  return checks;
})).reduce((acc, e) => acc.concat(e), []);

const getNetworkStatus = (Backend) => async ({
  projectName,
  networkName,
  region,
  keyPrefix,
  showCommits,
  healthChecks,
  host = '',
  validatorSettings,
}) => {
  const statusKeyValues = await KVStore.getAllByKeyPrefix(Backend)(keyPrefix);
  if (statusKeyValues && statusKeyValues.length === 0) {
    return null;
  }
  const result = statusKeyValues.reduce((acc, status) => {
    const type = status.key.split('/').pop();
    const typeCamelCase = Util.convertKebabToCamelCase(type);
    acc[typeCamelCase] = status.value;
    return acc;
  }, {});
  result.host = host;
  result.projectName = projectName;
  result.networkName = networkName;
  result.catchingUp = !!+result.catchingUp;
  if (region) {
    result.region = region;
    if (healthChecks) {
      result.healthChecks = getRegionChecks(healthChecks, region);
    }
  } else if (healthChecks) {
    result.healthChecks = getTotalChecks(healthChecks);
    result.healthChecksBySentry = getTotalChecksByWorstStatus(healthChecks);
  }
  if (showCommits) {
    const validatorAddresses = await Util
      .getValidatorAddress(validatorSettings, projectName, networkName);
    const commits = await Promise.all(validatorAddresses
      .map((v) => getLastBlockCommits(Backend)({
        latestBlockHeight: result.blockHeight,
        metaData: {
          projectName,
          networkName,
          region,
          validatorAddress: v.address,
        },
      })));
    result.commits = commits.reduce((acc, c, index) => acc.concat({
      name: validatorAddresses[index].name,
      values: c,
    }), []);
  }
  return result;
};

const getAllProjectStatus = async ({
  Backend,
  node: nodeIp,
  nomadPort,
  consulPort,
  production,
  prodConfigFile,
}) => {
  const {
    nodeList,
  } = await Core.getNodeInfos({
    nodeIp,
    nomadPort,
    consulPort,
    production,
    prodConfigFile,
  });
  const keys = await Backend.kv.list('projects/global');
  const validatorSettings = await KVStore.getValidatorAddressSettings(Backend)(prodConfigFile);
  const prjList = getProjectAndNetworkList(keys);
  const result = await Promise.all(prjList
    .map((row) => {
      const keyPrefix = `projects/global/${row.project}/${row.network}/status/`;
      const checks = nodeList
        .filter((n) => n.nodeServiceList.includes(Util.getServiceName(
          row.project, production, n.nodeRegion,
        )))
        .map((n) => ({
          region: n.nodeRegion,
          checks: n.nodeCheckList
            .filter((c) => c.includes(Util.getServiceName(row.project, production, n.nodeRegion)))
            .map((checkId) => n.nodeChecks[checkId]),
        }));
      return getNetworkStatus(Backend)({
        projectName: row.project,
        networkName: row.network,
        keyPrefix,
        showCommits: true,
        healthChecks: checks,
        validatorSettings,
      });
    }));
  return result;
};

const filterProjectByRegion = ({
  Backend,
  node: nodeIp,
  nomadPort,
  consulPort,
  production,
  prodConfigFile,
}) => async (project, network, region) => {
  const {
    nodeList,
  } = await Core.getNodeInfos({
    nodeIp,
    nomadPort,
    consulPort,
    production,
    prodConfigFile,
  });
  const validatorSettings = await KVStore.getValidatorAddressSettings(Backend)(prodConfigFile);
  const nodeProjects = nodeList
    .filter((n) => n.nodeServiceList.includes(Util.getServiceName(
      project, production, n.nodeRegion,
    )));
  const keys = await Backend.kv.list(`projects/nodes/${Util.getProjectName(project)}`);
  const prjAndNetworkList = getProjectNetworkAndRegionList(keys);
  const filteredNetworkList = prjAndNetworkList.filter((e) => !network || network === e.network);
  const filteredRegionList = filteredNetworkList.filter((e) => !region || region === e.region);
  const checks = nodeProjects
    .map((n) => ({
      region: n.nodeRegion,
      checks: n.nodeCheckList
        .filter((c) => c.includes(Util.getServiceName(project, production, n.nodeRegion)))
        .map((checkId) => n.nodeChecks[checkId]),
    }));
  return Promise.all(filteredRegionList.map((e) => {
    const keyPrefix = `projects/nodes/${e.project}/${e.network}/${e.region}/status/`;
    const nodeByRegion = nodeProjects.find((node) => node.nodeRegion === e.region) || {};
    return getNetworkStatus(Backend)({
      projectName: e.project,
      networkName: e.network,
      region: e.region,
      keyPrefix,
      healthChecks: checks,
      host: nodeByRegion.nodeAddress,
      validatorSettings,
    });
  }));
};

const filterProjectByHost = ({
  Backend,
  node: nodeIp,
  nomadPort,
  consulPort,
  production,
  prodConfigFile,
}) => async (host) => {
  const {
    nodeList,
  } = await Core.getNodeInfos({
    nodeIp,
    nomadPort,
    consulPort,
    production,
    prodConfigFile,
  });
  const nodeByHost = nodeList
    .find((n) => n.nodeAddress === host);
  if (!nodeByHost) return [];
  if (!nodeByHost.projects) return [];
  return Promise.all(nodeByHost.projects.map((e) => {
    const keyPrefix = `projects/nodes/${Util.getProjectName(e.name)}/${e.network}/${nodeByHost.nodeRegion}/status/`;
    return getNetworkStatus(Backend)({
      projectName: Util.getProjectName(e.name),
      networkName: e.network,
      region: nodeByHost.nodeRegion,
      keyPrefix,
      healthChecks: [{
        region: nodeByHost.nodeRegion,
        checks: nodeByHost.nodeCheckList
          .filter((c) => c.includes(Util.getServiceName(e.name, production, nodeByHost.nodeRegion)))
          .map((checkId) => nodeByHost.nodeChecks[checkId]),
      }],
      host: nodeByHost.nodeAddress,
    });
  }));
};

const modifyChainId = (projects) => {
  const networkMapping = {
    'bcl-band': 'band-guanyu-mainnet',
    'bcl-terra': 'columbus-4',
    'bcl-kava': 'kava-6',
    'bcl-cosmos': 'cosmoshub-4',
  };
  return projects.map((project) => {
    if (networkMapping[project.projectName]) {
      project.networkName = networkMapping[project.projectName];
    }
    return project;
  });
};

const get = (req, res) => async (args) => {
  try {
    const result = await getAllProjectStatus(args);
    res.writeHead(200, {
      'content-type': 'application/json',
    });
    res.write(JSON.stringify(modifyChainId(result)));
    return res;
  } catch (e) {
    logger.error('get', e && e.toString());
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const getAllProjects = (req, res) => async ({
  Backend,
}) => {
  try {
    const keys = await Backend.kv.list('projects/global');
    const prjList = getProjectAndNetworkList(keys);
    res.writeHead(200, {
      'content-type': 'application/json',
    });
    res.write(JSON.stringify(prjList));
    return res;
  } catch (e) {
    logger.error('get', e && e.toString());
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const getAllHosts = (req, res) => async ({
  node: nodeIp,
  nomadPort,
  consulPort,
  production,
  prodConfigFile,
}) => {
  try {
    const {
      nodeList,
    } = await Core.getNodeInfos({
      nodeIp,
      nomadPort,
      consulPort,
      production,
      prodConfigFile,
    });
    res.writeHead(200, {
      'content-type': 'application/json',
    });
    res.write(JSON.stringify(nodeList.map((n) => n.nodeAddress)));
    return res;
  } catch (e) {
    logger.error('get', e && e.toString());
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const getNodeStatus = ({
  query,
  capture,
}, res) => async (args) => {
  try {
    const [, project] = capture;
    const projectName = Util.getProjectName(project);
    const network = query.get('network');
    const region = query.get('region');
    const host = query.get('host');
    let result;
    if (host) {
      result = await filterProjectByHost(args)(host);
    } else {
      result = await filterProjectByRegion(args)(projectName, network, region);
    }
    res.writeHead(200, {
      'content-type': 'application/json',
    });
    res.write(JSON.stringify(result));
    return res;
  } catch (e) {
    logger.error('getNodeStatus', e && e.toString());
    res.writeHead(500);
    res.write(JSON.stringify(e && e.toString()));
    return res;
  }
};

const getTotalMissedBlocks = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const count = await InfluxStore.getTotalMissedBlockCount({
    network,
    project,
  });
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify({
    count,
  }));
  return res;
};

const getMissedBlocksHistory = ({
  query,
  capture,
}, res) => async (args) => {
  const count = 14;
  const defaultRet = [];
  for (let i = 0; i < count; i += 1) {
    defaultRet.unshift({
      x: moment()
        .subtract(i, 'd')
        .format('MMM D'),
      y: 0,
    });
  }
  const [, project] = capture;
  const network = query.get('network');
  let ret = await InfluxStore.getMissedBlocksHistory({
    project,
    network,
    from: moment().subtract(13, 'd').valueOf() * 1e6,
    to: moment().valueOf() * 1e6,
  });
  if (ret.length === 0) {
    ret = defaultRet;
  } else {
    ret = ret.map((row) => ({
      x: moment(row[0]).format('MMM D'),
      y: row[1],
    }));
  }
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

const getMissedBlocksByTimeOfDay = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const weekDays = moment.weekdaysShort();
  const missedBlocks = await InfluxStore.getMissedBlocksByTimeOfDay({
    project,
    network,
    from: moment().subtract(13, 'd').startOf('d').valueOf() * 1e6,
    to: moment().endOf('d').valueOf() * 1e6,
  });
  const ret = weekDays.map((day) => {
    const data = Array(24).fill().map((v, index) => ({
      x: index,
      y: 0,
    }));
    return {
      name: day,
      data,
    };
  });
  missedBlocks.forEach((block) => {
    const d = moment(block[0]);
    ret[d.weekday()].data[d.hour()].y += block[1];
  });
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret.reverse()));
  return res;
};

export default {
  get,
  getNodeStatus,
  getNetworkStatus,
  getProjectAndNetworkList,
  getAllProjectStatus,
  filterProjectByRegion,
  getTotalMissedBlocks,
  getMissedBlocksHistory,
  getMissedBlocksByTimeOfDay,
  getAllProjects,
  getAllHosts,
};
