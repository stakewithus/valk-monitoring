import pino from 'pino';
import Constant from './constant';
import Util from '../common/util';
import Notification from '../notification';

const { CHECK_NAMES } = Constant;
const { HEALTH_CHECK_STATUS } = Constant;
const logger = pino().child({ module: 'cmd/alerting' });

const isNodeMuted = (mutedNodes, projectName, region) => {
  const result = mutedNodes.filter((node) => {
    if (!node.region) {
      return node.projectName === projectName;
    }
    return node.projectName === projectName && node.region === region;
  });
  return result.length > 0;
};

const isStatusChanged = (check) => {
  if (!check.status || !check.prevStatus) {
    return false;
  }
  return check.status !== HEALTH_CHECK_STATUS.PASS && check.status !== check.prevStatus;
};

const alertDataFromNode = (node) => ({
  project: node.project,
  network: node.network,
  region: node.region,
  ip: node.ip,
});

const getAlertByType = (changedStatusNodes, type) => changedStatusNodes.reduce((acc, node) => {
  const healthCheck = node.healthChecks[type];
  if (!healthCheck) {
    logger.error('getAlertByType Error');
    console.log(changedStatusNodes, type);
    throw new Error('HEALTH_CHECK_NOT_FOUND');
  }
  if (isStatusChanged(healthCheck)) {
    return acc.concat({
      ...alertDataFromNode(node),
      type,
      status: healthCheck.status,
      note: healthCheck.note,
      prevStatus: healthCheck.prevStatus,
    });
  }
  return acc;
}, []);

const getDisconnectionAlert = (changedStatusNodes) => {
  const disconnectionErrorNodes = changedStatusNodes.filter((node) => {
    const healthCheckValues = Object.values(node.healthChecks);
    const statuses = healthCheckValues.reduce((acc, check) => acc.concat(check.status), []);
    const isAllStatusCritical = statuses.every((s) => s === HEALTH_CHECK_STATUS.CRITICAL);
    const isAllStatusWarning = statuses.every((s) => s === HEALTH_CHECK_STATUS.WARNING);
    const isAllNoteCritical = healthCheckValues
      .every((c) => c.note === Constant.NOTE_MESSAGES.DISCONNECTION_ERROR_CRITICAL);
    const isAllNoteWarning = healthCheckValues
      .every((c) => c.note === Constant.NOTE_MESSAGES.DISCONNECTION_ERROR_WARNING);
    return (isAllStatusCritical && isAllNoteCritical) || (isAllStatusWarning && isAllNoteWarning);
  }, []);
  const alerts = disconnectionErrorNodes.map((node) => ({
    ...alertDataFromNode(node),
    note: node.healthChecks[CHECK_NAMES.TM_LATE_BLOCK_TIME].note,
    status: node.healthChecks[CHECK_NAMES.TM_LATE_BLOCK_TIME].status,
    prevStatus: node.healthChecks[CHECK_NAMES.TM_LATE_BLOCK_TIME].prevStatus,
  }));
  const alertNodeIds = disconnectionErrorNodes.map((node) => node.nodeId);
  return {
    alerts,
    others: changedStatusNodes.filter((alert) => !alertNodeIds.includes(alert.nodeId)),
  };
};

const getMissedBlockAlert = (
  changedStatusNodes, validatorSettings,
) => changedStatusNodes.filter((r) => r).reduce((acc, node) => {
  const existing = acc.find((e) => e.project === node.project && e.network === node.network);
  if (existing) {
    return acc;
  }
  const validatorChecks = [];
  const validatorAddresses = Util.getValidatorAddress(
    validatorSettings, node.project, node.network,
  );
  validatorAddresses.map((validator) => {
    const check = node.healthChecks[Util.getMissedBlockName(validator.name)];
    if (isStatusChanged(check)) {
      validatorChecks.push({
        project: node.project,
        network: node.network,
        type: CHECK_NAMES.TM_MISSED_BLOCK,
        status: check.status,
        prevStatus: check.prevStatus,
        note: check.note,
        validator: validator.name,
      });
    }
    return null;
  });
  return acc.concat(validatorChecks);
}, []);

const handleAlerting = async (mutedNodes, nodeStatuses, validatorSettings) => {
  const changedStatusNodes = nodeStatuses.filter((node) => {
    if (isNodeMuted(mutedNodes, node.project, node.region)) {
      return false;
    }
    const healthChecks = Object.values(node.healthChecks);
    return healthChecks.some((check) => isStatusChanged(check));
  });
  const { alerts: disconnectErrorAlerts, others } = getDisconnectionAlert(changedStatusNodes);
  const lateBlockAlerts = getAlertByType(others, CHECK_NAMES.TM_LATE_BLOCK_TIME);
  const peerCountAlert = getAlertByType(others, CHECK_NAMES.TM_PEER_COUNT);
  const missedBlockAlert = getMissedBlockAlert(others, validatorSettings);
  const alerts = [
    ...disconnectErrorAlerts,
    ...lateBlockAlerts,
    ...peerCountAlert,
    ...missedBlockAlert,
  ];
  await Promise.all(alerts.map(Notification.sendToSlack));
  return Notification.sendToTwilio(alerts);
};

export default {
  handleAlerting,
};
