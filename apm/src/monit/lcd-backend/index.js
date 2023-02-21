import CONSTANT from '../constant';

const lcdStatus = {};

const getCheckId = (project, host, port) => `lcd-${project}-${host}:${port}`;

const addService = (bend) => async (project, host, port) => {
  const nodeServices = await bend.agent.service.list();
  const svcName = `${project}-backend`;
  if (nodeServices[svcName]) {
    return null;
  }
  const svcDef = {
    ID: svcName,
    Name: svcName,
  };
  return bend.agent.service.upsert(svcDef);
};

const addCheck = (bend) => async (project, host, port) => {
  const nodeChecks = await bend.agent.check.list();
  if (nodeChecks[getCheckId(project, host, port)]) {
    return null;
  }
  const lcdHttpCheck = {
    CheckID: getCheckId(project, host, port),
    Name: getCheckId(project, host, port),
    Notes: 'Checks that LCD Server is running',
    HTTP: `http://${host}:${port}/node_info`,
    Method: 'GET',
    Interval: '5s',
    ServiceID: `${project}-backend`,
    Status: 'critical',
  };
  return bend.agent.check.register(lcdHttpCheck);
};

const healthCheck = (
  nodeChecks, project, host, port,
) => nodeChecks[getCheckId(project, host, port)];

const shouldAlerting = (check, project, host, port) => {
  if (!check || !check.Status) {
    return false;
  }
  const failInARow = lcdStatus[getCheckId(project, host, port)];
  if (check.Status.toUpperCase() === CONSTANT.HEALTH_CHECK_STATUS.CRITICAL) {
    lcdStatus[getCheckId(project, host, port)] = failInARow ? failInARow + 1 : 1;
    if (failInARow === 2) {
      return true;
    }
  } else {
    lcdStatus[getCheckId(project, host, port)] = 0;
  }
  return false;
};

export default {
  healthCheck,
  addService,
  addCheck,
  shouldAlerting,
  getCheckId,
};
