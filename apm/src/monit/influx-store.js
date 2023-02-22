/* eslint-disable no-use-before-define */
import moment from 'moment';
import {
  Query,
  Writer,
} from '../plugins/influxdb-client';
import Constant from './constant';
import Util from '../common/util';

const dbName = 'apm';
const blockCommitMeasurement = 'block_commits';
const healthCheckMeasurement = 'health_checks';
const peerCountMeasurement = 'peer_counts';
const blockHeightMeasurement = 'block_heights';
const terraOracleMissesMeasurement = 'terra_oracle_misses';
const terraOracleExchangeRateMeasurement = 'terra_oracle_exchange_rates';

const getTotalMissedBlockCount = async ({
  // host,
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({
    // host
  })(dbName).exec({
    query: `SELECT COUNT(block_height) FROM ${blockCommitMeasurement} WHERE network=$network AND project=$project AND missed='true' ${parseTimeCondition({ from, to })}`,
    params: {
      from,
      to,
      network,
      project,
    },
  });
  if (!ret[0].series) return 0;
  return ret[0].series[0].values[0][1];
};

const getTotalBlockCount = async ({
  // host,
  network,
  project,
}) => {
  const ret = await Query({
    // host
  })(dbName).exec({
    query: `SELECT COUNT(block_height) FROM ${blockCommitMeasurement} WHERE network=$network AND project=$project`,
    params: {
      network,
      project,
    },
  });
  if (!ret[0].series) return 0;
  return ret[0].series[0].values[0][1];
};

const getMissedBlocksHistory = async ({
  // host,
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({
    // host
  })(dbName).exec({
    query: `SELECT COUNT(block_height) FROM ${blockCommitMeasurement} WHERE network=$network AND project=$project AND missed='true' ${parseTimeCondition({ from, to })} GROUP BY time(1d) fill(0)`,
    params: {
      network,
      project,
      from,
      to,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values;
};

const getMissedBlocksByTimeOfDay = async ({
  // host,
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({
    // host
  })(dbName).exec({
    query: `SELECT COUNT(block_height) FROM ${blockCommitMeasurement} WHERE network=$network AND project=$project AND missed='true' ${parseTimeCondition({ from, to })} GROUP BY time(1h) fill(none) ORDER BY time ASC`,
    params: {
      network,
      project,
      from,
      to,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values;
};

const getBlocksByTimeOfDay = async ({
  // host,
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({
    // host
  })(dbName).exec({
    query: `SELECT COUNT(block_height) FROM ${blockCommitMeasurement} WHERE network=$network AND project=$project ${parseTimeCondition({ from, to })} GROUP BY time(1h) fill(none) ORDER BY time ASC`,
    params: {
      network,
      project,
      from,
      to,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values;
};

const getMissedBlocksAlert = async ({
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({})(dbName).exec({
    query: `SELECT count(block_height) FROM ${healthCheckMeasurement} WHERE network=$network AND project=$project AND type=$type ${parseTimeCondition({ from, to })} GROUP BY time(1h),status fill(0)`,
    params: {
      network,
      project,
      from,
      to,
      type: Constant.CHECK_NAMES.TM_MISSED_BLOCK,
    },
  });
  const out = [];
  if (!ret[0].series) return [];
  ret[0].series.forEach((sr) => sr.values.forEach((v) => {
    out.push(v.concat(sr.tags.status));
  }));
  return out;
};

const getLateBlockTimeAlert = async ({
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({})(dbName).exec({
    query: `SELECT count(block_height) FROM ${healthCheckMeasurement} WHERE network=$network AND project=$project AND type=$type ${parseTimeCondition({ from, to })} GROUP BY time(1h),status fill(none)`,
    params: {
      network,
      project,
      from,
      to,
      type: Constant.CHECK_NAMES.TM_LATE_BLOCK_TIME,
    },
  });
  const out = [];
  if (!ret[0].series) return [];
  ret[0].series.forEach((sr) => sr.values.forEach((v) => {
    out.push(v.concat(sr.tags.status));
  }));
  return out;
};

const getPeerCount = async ({
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({})(dbName).exec({
    query: `SELECT total FROM ${peerCountMeasurement} WHERE network=$network AND project=$project ${parseTimeCondition({ from, to })} GROUP BY region`,
    params: {
      network,
      project,
      from,
      to,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series.map((sr) => ({
    name: sr.tags.region,
    values: sr.values,
  }));
};

const getBlockHeights = async ({
  network,
  project,
  from,
  to,
}) => {
  const ret = await Query({})(dbName).exec({
    query: `SELECT max(height) FROM ${blockHeightMeasurement} WHERE network=$network AND project=$project ${parseTimeCondition({ from, to })} GROUP BY region,time(1h) fill(none)`,
    params: {
      network,
      project,
      from,
      to,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series.map((sr) => ({
    name: sr.tags.region,
    values: sr.values,
  }));
};

const saveBlockCommits = async ({
  // host,
  network,
  project,
  blockCommits = [],
}) => {
  const points = parseBlockCommitsToPoints(blockCommits, {
    network,
    project: Util.getProjectName(project),
  });
  const ret = await Writer({
    // host
  }).writePoints(dbName)(points);
  return ret;
};

const saveHealthChecks = async ({
  host,
  network,
  project,
  status,
  checkId,
  note,
  time,
  blockHeight,
  blockTime,
  nodeId,
  region,
  type,
}) => {
  const points = parseHealthChecksToPoints({
    host,
    network,
    project: Util.getProjectName(project),
    status,
    checkId,
    note,
    time,
    blockHeight,
    blockTime,
    nodeId,
    region,
    type,
  });
  const ret = await Writer({
    // host
  }).writePoints(dbName)(points);
  return ret;
};

const savePeerCounts = async ({
  network,
  project,
  region,
  inbound,
  outbound,
  total,
}) => {
  const points = parsePeerCountsToPoints({
    network,
    project: Util.getProjectName(project),
    region,
    inbound,
    outbound,
    total,
  });
  const ret = await Writer({}).writePoints(dbName)(points);
  return ret;
};

const saveBlockHeights = async ({
  network,
  project,
  region,
  height,
  time,
}) => {
  const points = parseBlockHeightsToPoints({
    network,
    project: Util.getProjectName(project),
    region,
    height,
    time,
  });
  const ret = await Writer({}).writePoints(dbName)(points);
  return ret;
};

const saveTerraOracleMisses = async ({ height, misses }) => {
  await deleteExistingBlockHeight({ height, measurement: terraOracleMissesMeasurement });
  const points = parseTerraOracleMissesToPoints({ height, misses });
  return Writer({}).writePoints(dbName)(points);
};

const saveTerraOracleExchangeRates = async ({ height, result }) => {
  try {
    console.log('Before deleting existing blocks');
    await deleteExistingBlockHeight({ height, measurement: terraOracleExchangeRateMeasurement });
    const points = parseTerraOracleExchangeRatesToPoints({ height, exchangeRates: result });
    console.log('Before saving exchange rates');
    return Writer({}).writePoints(dbName)(points);
  } catch (error) {
    console.log('Saving exchange rates error');
    console.log(error);
  }
};

const deleteExistingBlockHeight = async ({ height, measurement }) => {
  const [{ series }] = await Query({})(dbName).exec({
    query: `SELECT time,block_height FROM ${measurement} WHERE block_height=$height`,
    params: {
      height: Number(height),
    },
  });
  if (!series) return;
  const times = series[0].values.map((v) => v[0]);
  await Promise.all(times.map(async (time) => Query({})(dbName).exec({
    query: `DELETE FROM ${measurement} WHERE time=$time`,
    params: {
      time,
    },
  })));
};

const getTerraOracleMisses = async ({
  from, to, fromBlock, toBlock, limit,
}) => {
  const ret = await Query({})(dbName).exec({
    query: `SELECT block_height,misses FROM ${terraOracleMissesMeasurement} WHERE 1=1 ${parseTimeCondition({ from, to })} ${parseBlockHeightCondition({ fromBlock, toBlock })} ORDER BY time DESC LIMIT ${limit}`,
    params: {
      from,
      to,
      fromBlock,
      toBlock,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values.map((val) => ({
    height: Number(val[1]),
    misses: Number(val[2]),
  })).reverse();
};

const getTerraOracleExchangeRates = async ({
  from, to, fromBlock, toBlock, limit,
}) => {
  const ret = await Query({})(dbName).exec({
    query: `SELECT block_height,amount,swu_amount FROM ${terraOracleExchangeRateMeasurement} WHERE 1=1 ${parseTimeCondition({ from, to })} ${parseBlockHeightCondition({ fromBlock, toBlock })} GROUP BY denom ORDER BY time DESC LIMIT ${limit}`,
    params: {
      from,
      to,
      fromBlock,
      toBlock,
    },
  });
  if (!ret[0].series) return [];
  return ret[0].series.reduce((acc, cur) => {
    acc[cur.tags.denom] = cur.values.map((val) => ({
      height: val[1],
      amount: val[2],
      swu_amount: val[3],
    })).reverse();
    return acc;
  }, {});
};

// #region helpersheight: Number(height)
const parseTimeCondition = ({
  from,
  to,
}) => {
  let out = '';
  if (from) {
    out += ' AND time>=$from';
  }
  if (to) {
    out += ' AND time<=$to';
  }
  return out;
};

const parseBlockHeightCondition = ({
  fromBlock,
  toBlock,
}) => {
  let out = '';
  if (fromBlock) {
    out += ' AND block_height>=$fromBlock';
  }
  if (toBlock) {
    out += ' AND block_height<=$toBlock';
  }
  return out;
};

const parseBlockCommitsToPoints = (blockCommits = [], {
  network,
  project,
}) => blockCommits.map((block) => ({
  measurement: blockCommitMeasurement,
  tags: {
    network,
    project,
  },
  fields: {
    block_height: fieldToString(block.height),
    missed: fieldToString(block.missed),
  },
  timestamp: block.time,
}));

const parseHealthChecksToPoints = ({
  host,
  network,
  project,
  status,
  checkId,
  note,
  time,
  blockHeight,
  blockTime,
  nodeId,
  region,
  type,
}) => [{
  measurement: healthCheckMeasurement,
  tags: {
    nodeId,
    region,
    network,
    project,
    type,
    status,
  },
  fields: {
    host: fieldToString(host),
    note: fieldToString(note),
    check_id: fieldToString(checkId),
    block_height: fieldToString(blockHeight),
    block_time: fieldToString(blockTime),
  },
  timestamp: time,
}];

const parsePeerCountsToPoints = ({
  network,
  project,
  region,
  inbound,
  outbound,
  total,
}) => [{
  measurement: peerCountMeasurement,
  tags: {
    network,
    project,
    region,
  },
  fields: {
    inbound: fieldToString(inbound),
    outbound: fieldToString(outbound),
    total: fieldToString(total),
  },
  timestamp: moment().startOf('h').valueOf(),
}];

const parseBlockHeightsToPoints = ({
  network,
  project,
  region,
  height,
  time,
}) => [{
  measurement: blockHeightMeasurement,
  tags: {
    network,
    project,
    region,
  },
  fields: {
    height,
  },
  timestamp: time,
}];

const parseTerraOracleMissesToPoints = ({ height, misses }) => [{
  measurement: terraOracleMissesMeasurement,
  tags: {
    note: fieldToString(''),
  },
  fields: {
    misses: Number(misses),
    block_height: Number(height),
  },
}];

const parseTerraOracleExchangeRatesToPoints = ({
  height, exchangeRates = [],
}) => exchangeRates.map((rate) => ({
  measurement: terraOracleExchangeRateMeasurement,
  tags: {
    denom: rate.denom,
  },
  fields: {
    amount: Number(rate.amount),
    swu_amount: Number(rate.swu_amount),
    block_height: Number(height),
  },
}));

const fieldToString = (input) => JSON.stringify(String(input));
// #endregion

export {
  saveBlockCommits,
  saveHealthChecks,
  savePeerCounts,
  saveBlockHeights,
  saveTerraOracleMisses,
  saveTerraOracleExchangeRates,
  getTotalMissedBlockCount,
  getMissedBlocksHistory,
  getMissedBlocksByTimeOfDay,
  getMissedBlocksAlert,
  getLateBlockTimeAlert,
  getPeerCount,
  getTotalBlockCount,
  getBlocksByTimeOfDay,
  getBlockHeights,
  getTerraOracleMisses,
  getTerraOracleExchangeRates,
};

export default {
  saveBlockCommits,
  saveHealthChecks,
  savePeerCounts,
  saveBlockHeights,
  saveTerraOracleMisses,
  saveTerraOracleExchangeRates,
  getTotalMissedBlockCount,
  getMissedBlocksHistory,
  getMissedBlocksByTimeOfDay,
  getMissedBlocksAlert,
  getLateBlockTimeAlert,
  getPeerCount,
  getTotalBlockCount,
  getBlocksByTimeOfDay,
  getBlockHeights,
  getTerraOracleMisses,
  getTerraOracleExchangeRates,
};
