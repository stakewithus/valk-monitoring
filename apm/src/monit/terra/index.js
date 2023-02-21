import pino from 'pino';
import LcdBackend from '../lcd-backend';
import OracleBackend from './oracle-backend';
import KVStore from '../kv-store';
import config from '../../config';
import Consul from '../../plugins/backends/consul2/api';
import Notification from '../../notification';
import service from './service';
import Constant from '../constant';
import ExchangeRate from './exchange-rates';
import { saveTerraOracleMisses } from '../influx-store';

const logger = pino().child({ module: 'cmd/monit/tera/oracle-backend' });

const getHealthChecks = async (Backend) => {
  const nodeChecks = await Backend.agent.check.list();
  const lcdList = process.env.TERRA_LCD.split(',');
  const lcdHealthChecks = lcdList.map((lcd) => {
    const [host, port] = lcd.split(':');
    return LcdBackend.healthCheck(nodeChecks, 'terra', host, port);
  });
  const lcdResult = lcdHealthChecks.filter((c) => c).map((check) => ({
    project: 'terra',
    name: 'Terra-LCD-Backend',
    id: check.CheckID,
    status: check.Status,
    output: check.Output,
    notes: check.Notes,
  }));
  const oracleHealthCheck = OracleBackend.healthCheck(nodeChecks);
  if (!oracleHealthCheck) {
    return lcdResult;
  }
  const oracleResult = {
    project: 'terra',
    name: 'Terra-Oracle-Backend',
    status: oracleHealthCheck.Status,
    output: oracleHealthCheck.Output,
    notes: oracleHealthCheck.Notes,
  };
  const result = lcdResult.concat(oracleResult);
  return result;
};

const getLCDAlerts = (checks) => {
  const lcdList = process.env.TERRA_LCD.split(',');
  return lcdList.map((lcd) => {
    const [host, port] = lcd.split(':');
    const check = LcdBackend.healthCheck(checks, 'terra', host, port);
    if (!LcdBackend.shouldAlerting(check, 'terra', host, port)) {
      return null;
    }
    const alert = {
      type: 'LCD-Monitoring',
      project: 'terra',
      endpoint: lcd,
      status: check.Status && check.Status.toUpperCase(),
    };
    if (alert.status === Constant.HEALTH_CHECK_STATUS.CRITICAL) {
      alert.note = check.Output;
    }
    return alert;
  }).filter((e) => e);
};

const getOracleAlert = (check) => {
  if (!OracleBackend.shouldAlerting(check.status, check.prevStatus)) {
    return [];
  }
  return [{
    type: 'Oracle-Monitoring',
    project: 'terra',
    status: check.status,
    prevStatus: check.prevStatus,
    note: check.note,
  }];
};

const handleAlerting = async (alerts) => {
  await Promise.all(alerts.map(Notification.sendToSlack));
  return Notification.sendToTwilio(alerts);
};

const saveToKVStore = async (Backend) => {
  const missingData = await service.getMissingVote();
  saveTerraOracleMisses({ height: missingData.height, misses: missingData.result });
  const votingPeriod = Math.floor(+missingData.height / 5);
  const keyPrefix = OracleBackend.getKeyPrefix();
  const kvKey = OracleBackend.getKey(votingPeriod);
  await Backend.kv.upsert(kvKey, +missingData.result);
  const votingMisses = await KVStore.getAllByKeyPrefix(Backend)(keyPrefix);
  const lastVotingPeriodForSaving = votingPeriod - config.numberOfLastVotingPeriod;
  const lastVotings = await OracleBackend.getLastVotings(votingMisses, lastVotingPeriodForSaving);
  await OracleBackend.removeOldKeys(Backend)(votingMisses, lastVotingPeriodForSaving);
  return lastVotings;
};

const getUptimePercentage = (Backend) => async (votingPeriod) => {
  const keyPrefix = OracleBackend.getKeyPrefix();
  const votingMisses = await KVStore.getAllByKeyPrefix(Backend)(keyPrefix);
  const lastVotings = await OracleBackend.getLastVotings(votingMisses,
    votingPeriod - config.numberOfLastVotingPeriod);
  const missed = lastVotings[lastVotings.length - 1] - lastVotings[0];
  const totalVotingPeriod = lastVotings.length;
  const percentage = (1 - missed / totalVotingPeriod) * 100;
  return Math.round(percentage * 100) / 100;
};

const run = async ({
  node: nodeIp, consulPort,
}) => {
  try {
    const Backend = Consul(nodeIp, consulPort).Api;
    const lastVotings = await saveToKVStore(Backend);
    const checks = await Backend.agent.check.list();
    let alertings = getLCDAlerts(checks);
    if (lastVotings.length > 10) {
      const oracleHealthCheck = await OracleBackend.updateHealthCheck(Backend)(lastVotings, checks);
      if (oracleHealthCheck) {
        alertings = alertings.concat(getOracleAlert(oracleHealthCheck));
      }
    }
    await handleAlerting(alertings);
  } catch (error) {
    logger.error('TerraMonitoring-ERROR', error);
  }
};

const fetchExchangeRate = async () => {
  try {
    const activeDenoms = await service.getActiveDenoms();
    ExchangeRate.runEverySec(activeDenoms);
  } catch (error) {
    logger.error('fetchExchangeRate-ERROR');
    logger.info(error && error.toString());
  }
};

export default {
  getHealthChecks,
  run,
  getUptimePercentage,
  fetchExchangeRate,
};
