'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTerraOracleExchangeRates = exports.getTerraOracleMisses = exports.getBlockHeights = exports.getBlocksByTimeOfDay = exports.getTotalBlockCount = exports.getPeerCount = exports.getLateBlockTimeAlert = exports.getMissedBlocksAlert = exports.getMissedBlocksByTimeOfDay = exports.getMissedBlocksHistory = exports.getTotalMissedBlockCount = exports.saveTerraOracleExchangeRates = exports.saveTerraOracleMisses = exports.saveBlockHeights = exports.savePeerCounts = exports.saveHealthChecks = exports.saveBlockCommits = undefined;

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _influxdbClient = require('../plugins/influxdb-client');

var _constant = require('./constant');

var _constant2 = _interopRequireDefault(_constant);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-use-before-define */
var dbName = 'apm';
var blockCommitMeasurement = 'block_commits';
var healthCheckMeasurement = 'health_checks';
var peerCountMeasurement = 'peer_counts';
var blockHeightMeasurement = 'block_heights';
var terraOracleMissesMeasurement = 'terra_oracle_misses';
var terraOracleExchangeRateMeasurement = 'terra_oracle_exchange_rates';

var getTotalMissedBlockCount = async function getTotalMissedBlockCount(_ref) {
  var network = _ref.network,
      project = _ref.project,
      from = _ref.from,
      to = _ref.to;

  var ret = await (0, _influxdbClient.Query)({
    // host
  })(dbName).exec({
    query: 'SELECT COUNT(block_height) FROM ' + blockCommitMeasurement + ' WHERE network=$network AND project=$project AND missed=\'true\' ' + parseTimeCondition({ from: from, to: to }),
    params: {
      from: from,
      to: to,
      network: network,
      project: project
    }
  });
  if (!ret[0].series) return 0;
  return ret[0].series[0].values[0][1];
};

var getTotalBlockCount = async function getTotalBlockCount(_ref2) {
  var network = _ref2.network,
      project = _ref2.project;

  var ret = await (0, _influxdbClient.Query)({
    // host
  })(dbName).exec({
    query: 'SELECT COUNT(block_height) FROM ' + blockCommitMeasurement + ' WHERE network=$network AND project=$project',
    params: {
      network: network,
      project: project
    }
  });
  if (!ret[0].series) return 0;
  return ret[0].series[0].values[0][1];
};

var getMissedBlocksHistory = async function getMissedBlocksHistory(_ref3) {
  var network = _ref3.network,
      project = _ref3.project,
      from = _ref3.from,
      to = _ref3.to;

  var ret = await (0, _influxdbClient.Query)({
    // host
  })(dbName).exec({
    query: 'SELECT COUNT(block_height) FROM ' + blockCommitMeasurement + ' WHERE network=$network AND project=$project AND missed=\'true\' ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY time(1d) fill(0)',
    params: {
      network: network,
      project: project,
      from: from,
      to: to
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values;
};

var getMissedBlocksByTimeOfDay = async function getMissedBlocksByTimeOfDay(_ref4) {
  var network = _ref4.network,
      project = _ref4.project,
      from = _ref4.from,
      to = _ref4.to;

  var ret = await (0, _influxdbClient.Query)({
    // host
  })(dbName).exec({
    query: 'SELECT COUNT(block_height) FROM ' + blockCommitMeasurement + ' WHERE network=$network AND project=$project AND missed=\'true\' ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY time(1h) fill(none) ORDER BY time ASC',
    params: {
      network: network,
      project: project,
      from: from,
      to: to
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values;
};

var getBlocksByTimeOfDay = async function getBlocksByTimeOfDay(_ref5) {
  var network = _ref5.network,
      project = _ref5.project,
      from = _ref5.from,
      to = _ref5.to;

  var ret = await (0, _influxdbClient.Query)({
    // host
  })(dbName).exec({
    query: 'SELECT COUNT(block_height) FROM ' + blockCommitMeasurement + ' WHERE network=$network AND project=$project ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY time(1h) fill(none) ORDER BY time ASC',
    params: {
      network: network,
      project: project,
      from: from,
      to: to
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values;
};

var getMissedBlocksAlert = async function getMissedBlocksAlert(_ref6) {
  var network = _ref6.network,
      project = _ref6.project,
      from = _ref6.from,
      to = _ref6.to;

  var ret = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT count(block_height) FROM ' + healthCheckMeasurement + ' WHERE network=$network AND project=$project AND type=$type ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY time(1h),status fill(0)',
    params: {
      network: network,
      project: project,
      from: from,
      to: to,
      type: _constant2.default.CHECK_NAMES.TM_MISSED_BLOCK
    }
  });
  var out = [];
  if (!ret[0].series) return [];
  ret[0].series.forEach(function (sr) {
    return sr.values.forEach(function (v) {
      out.push(v.concat(sr.tags.status));
    });
  });
  return out;
};

var getLateBlockTimeAlert = async function getLateBlockTimeAlert(_ref7) {
  var network = _ref7.network,
      project = _ref7.project,
      from = _ref7.from,
      to = _ref7.to;

  var ret = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT count(block_height) FROM ' + healthCheckMeasurement + ' WHERE network=$network AND project=$project AND type=$type ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY time(1h),status fill(none)',
    params: {
      network: network,
      project: project,
      from: from,
      to: to,
      type: _constant2.default.CHECK_NAMES.TM_LATE_BLOCK_TIME
    }
  });
  var out = [];
  if (!ret[0].series) return [];
  ret[0].series.forEach(function (sr) {
    return sr.values.forEach(function (v) {
      out.push(v.concat(sr.tags.status));
    });
  });
  return out;
};

var getPeerCount = async function getPeerCount(_ref8) {
  var network = _ref8.network,
      project = _ref8.project,
      from = _ref8.from,
      to = _ref8.to;

  var ret = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT total FROM ' + peerCountMeasurement + ' WHERE network=$network AND project=$project ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY region',
    params: {
      network: network,
      project: project,
      from: from,
      to: to
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series.map(function (sr) {
    return {
      name: sr.tags.region,
      values: sr.values
    };
  });
};

var getBlockHeights = async function getBlockHeights(_ref9) {
  var network = _ref9.network,
      project = _ref9.project,
      from = _ref9.from,
      to = _ref9.to;

  var ret = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT max(height) FROM ' + blockHeightMeasurement + ' WHERE network=$network AND project=$project ' + parseTimeCondition({ from: from, to: to }) + ' GROUP BY region,time(1h) fill(none)',
    params: {
      network: network,
      project: project,
      from: from,
      to: to
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series.map(function (sr) {
    return {
      name: sr.tags.region,
      values: sr.values
    };
  });
};

var saveBlockCommits = async function saveBlockCommits(_ref10) {
  var network = _ref10.network,
      project = _ref10.project,
      _ref10$blockCommits = _ref10.blockCommits,
      blockCommits = _ref10$blockCommits === undefined ? [] : _ref10$blockCommits;

  var points = parseBlockCommitsToPoints(blockCommits, {
    network: network,
    project: _util2.default.getProjectName(project)
  });
  var ret = await (0, _influxdbClient.Writer)({
    // host
  }).writePoints(dbName)(points);
  return ret;
};

var saveHealthChecks = async function saveHealthChecks(_ref11) {
  var host = _ref11.host,
      network = _ref11.network,
      project = _ref11.project,
      status = _ref11.status,
      checkId = _ref11.checkId,
      note = _ref11.note,
      time = _ref11.time,
      blockHeight = _ref11.blockHeight,
      blockTime = _ref11.blockTime,
      nodeId = _ref11.nodeId,
      region = _ref11.region,
      type = _ref11.type;

  var points = parseHealthChecksToPoints({
    host: host,
    network: network,
    project: _util2.default.getProjectName(project),
    status: status,
    checkId: checkId,
    note: note,
    time: time,
    blockHeight: blockHeight,
    blockTime: blockTime,
    nodeId: nodeId,
    region: region,
    type: type
  });
  var ret = await (0, _influxdbClient.Writer)({
    // host
  }).writePoints(dbName)(points);
  return ret;
};

var savePeerCounts = async function savePeerCounts(_ref12) {
  var network = _ref12.network,
      project = _ref12.project,
      region = _ref12.region,
      inbound = _ref12.inbound,
      outbound = _ref12.outbound,
      total = _ref12.total;

  var points = parsePeerCountsToPoints({
    network: network,
    project: _util2.default.getProjectName(project),
    region: region,
    inbound: inbound,
    outbound: outbound,
    total: total
  });
  var ret = await (0, _influxdbClient.Writer)({}).writePoints(dbName)(points);
  return ret;
};

var saveBlockHeights = async function saveBlockHeights(_ref13) {
  var network = _ref13.network,
      project = _ref13.project,
      region = _ref13.region,
      height = _ref13.height,
      time = _ref13.time;

  var points = parseBlockHeightsToPoints({
    network: network,
    project: _util2.default.getProjectName(project),
    region: region,
    height: height,
    time: time
  });
  var ret = await (0, _influxdbClient.Writer)({}).writePoints(dbName)(points);
  return ret;
};

var saveTerraOracleMisses = async function saveTerraOracleMisses(_ref14) {
  var height = _ref14.height,
      misses = _ref14.misses;

  await deleteExistingBlockHeight({ height: height, measurement: terraOracleMissesMeasurement });
  var points = parseTerraOracleMissesToPoints({ height: height, misses: misses });
  return (0, _influxdbClient.Writer)({}).writePoints(dbName)(points);
};

var saveTerraOracleExchangeRates = async function saveTerraOracleExchangeRates(_ref15) {
  var height = _ref15.height,
      result = _ref15.result;

  try {
    console.log('Before deleting existing blocks');
    await deleteExistingBlockHeight({ height: height, measurement: terraOracleExchangeRateMeasurement });
    var points = parseTerraOracleExchangeRatesToPoints({ height: height, exchangeRates: result });
    console.log('Before saving exchange rates');
    return (0, _influxdbClient.Writer)({}).writePoints(dbName)(points);
  } catch (error) {
    console.log('Saving exchange rates error');
    console.log(error);
  }
};

var deleteExistingBlockHeight = async function deleteExistingBlockHeight(_ref16) {
  var height = _ref16.height,
      measurement = _ref16.measurement;

  var _ref17 = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT time,block_height FROM ' + measurement + ' WHERE block_height=$height',
    params: {
      height: Number(height)
    }
  }),
      _ref18 = (0, _slicedToArray3.default)(_ref17, 1),
      series = _ref18[0].series;

  if (!series) return;
  var times = series[0].values.map(function (v) {
    return v[0];
  });
  await _promise2.default.all(times.map(async function (time) {
    return (0, _influxdbClient.Query)({})(dbName).exec({
      query: 'DELETE FROM ' + measurement + ' WHERE time=$time',
      params: {
        time: time
      }
    });
  }));
};

var getTerraOracleMisses = async function getTerraOracleMisses(_ref19) {
  var from = _ref19.from,
      to = _ref19.to,
      fromBlock = _ref19.fromBlock,
      toBlock = _ref19.toBlock,
      limit = _ref19.limit;

  var ret = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT block_height,misses FROM ' + terraOracleMissesMeasurement + ' WHERE 1=1 ' + parseTimeCondition({ from: from, to: to }) + ' ' + parseBlockHeightCondition({ fromBlock: fromBlock, toBlock: toBlock }) + ' ORDER BY time DESC LIMIT ' + limit,
    params: {
      from: from,
      to: to,
      fromBlock: fromBlock,
      toBlock: toBlock
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series[0].values.map(function (val) {
    return {
      height: Number(val[1]),
      misses: Number(val[2])
    };
  }).reverse();
};

var getTerraOracleExchangeRates = async function getTerraOracleExchangeRates(_ref20) {
  var from = _ref20.from,
      to = _ref20.to,
      fromBlock = _ref20.fromBlock,
      toBlock = _ref20.toBlock,
      limit = _ref20.limit;

  var ret = await (0, _influxdbClient.Query)({})(dbName).exec({
    query: 'SELECT block_height,amount,swu_amount FROM ' + terraOracleExchangeRateMeasurement + ' WHERE 1=1 ' + parseTimeCondition({ from: from, to: to }) + ' ' + parseBlockHeightCondition({ fromBlock: fromBlock, toBlock: toBlock }) + ' GROUP BY denom ORDER BY time DESC LIMIT ' + limit,
    params: {
      from: from,
      to: to,
      fromBlock: fromBlock,
      toBlock: toBlock
    }
  });
  if (!ret[0].series) return [];
  return ret[0].series.reduce(function (acc, cur) {
    acc[cur.tags.denom] = cur.values.map(function (val) {
      return {
        height: val[1],
        amount: val[2],
        swu_amount: val[3]
      };
    }).reverse();
    return acc;
  }, {});
};

// #region helpersheight: Number(height)
var parseTimeCondition = function parseTimeCondition(_ref21) {
  var from = _ref21.from,
      to = _ref21.to;

  var out = '';
  if (from) {
    out += ' AND time>=$from';
  }
  if (to) {
    out += ' AND time<=$to';
  }
  return out;
};

var parseBlockHeightCondition = function parseBlockHeightCondition(_ref22) {
  var fromBlock = _ref22.fromBlock,
      toBlock = _ref22.toBlock;

  var out = '';
  if (fromBlock) {
    out += ' AND block_height>=$fromBlock';
  }
  if (toBlock) {
    out += ' AND block_height<=$toBlock';
  }
  return out;
};

var parseBlockCommitsToPoints = function parseBlockCommitsToPoints() {
  var blockCommits = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var _ref23 = arguments[1];
  var network = _ref23.network,
      project = _ref23.project;
  return blockCommits.map(function (block) {
    return {
      measurement: blockCommitMeasurement,
      tags: {
        network: network,
        project: project
      },
      fields: {
        block_height: fieldToString(block.height),
        missed: fieldToString(block.missed)
      },
      timestamp: block.time
    };
  });
};

var parseHealthChecksToPoints = function parseHealthChecksToPoints(_ref24) {
  var host = _ref24.host,
      network = _ref24.network,
      project = _ref24.project,
      status = _ref24.status,
      checkId = _ref24.checkId,
      note = _ref24.note,
      time = _ref24.time,
      blockHeight = _ref24.blockHeight,
      blockTime = _ref24.blockTime,
      nodeId = _ref24.nodeId,
      region = _ref24.region,
      type = _ref24.type;
  return [{
    measurement: healthCheckMeasurement,
    tags: {
      nodeId: nodeId,
      region: region,
      network: network,
      project: project,
      type: type,
      status: status
    },
    fields: {
      host: fieldToString(host),
      note: fieldToString(note),
      check_id: fieldToString(checkId),
      block_height: fieldToString(blockHeight),
      block_time: fieldToString(blockTime)
    },
    timestamp: time
  }];
};

var parsePeerCountsToPoints = function parsePeerCountsToPoints(_ref25) {
  var network = _ref25.network,
      project = _ref25.project,
      region = _ref25.region,
      inbound = _ref25.inbound,
      outbound = _ref25.outbound,
      total = _ref25.total;
  return [{
    measurement: peerCountMeasurement,
    tags: {
      network: network,
      project: project,
      region: region
    },
    fields: {
      inbound: fieldToString(inbound),
      outbound: fieldToString(outbound),
      total: fieldToString(total)
    },
    timestamp: (0, _moment2.default)().startOf('h').valueOf()
  }];
};

var parseBlockHeightsToPoints = function parseBlockHeightsToPoints(_ref26) {
  var network = _ref26.network,
      project = _ref26.project,
      region = _ref26.region,
      height = _ref26.height,
      time = _ref26.time;
  return [{
    measurement: blockHeightMeasurement,
    tags: {
      network: network,
      project: project,
      region: region
    },
    fields: {
      height: height
    },
    timestamp: time
  }];
};

var parseTerraOracleMissesToPoints = function parseTerraOracleMissesToPoints(_ref27) {
  var height = _ref27.height,
      misses = _ref27.misses;
  return [{
    measurement: terraOracleMissesMeasurement,
    tags: {
      note: fieldToString('')
    },
    fields: {
      misses: Number(misses),
      block_height: Number(height)
    }
  }];
};

var parseTerraOracleExchangeRatesToPoints = function parseTerraOracleExchangeRatesToPoints(_ref28) {
  var height = _ref28.height,
      _ref28$exchangeRates = _ref28.exchangeRates,
      exchangeRates = _ref28$exchangeRates === undefined ? [] : _ref28$exchangeRates;
  return exchangeRates.map(function (rate) {
    return {
      measurement: terraOracleExchangeRateMeasurement,
      tags: {
        denom: rate.denom
      },
      fields: {
        amount: Number(rate.amount),
        swu_amount: Number(rate.swu_amount),
        block_height: Number(height)
      }
    };
  });
};

var fieldToString = function fieldToString(input) {
  return (0, _stringify2.default)(String(input));
};
// #endregion

exports.saveBlockCommits = saveBlockCommits;
exports.saveHealthChecks = saveHealthChecks;
exports.savePeerCounts = savePeerCounts;
exports.saveBlockHeights = saveBlockHeights;
exports.saveTerraOracleMisses = saveTerraOracleMisses;
exports.saveTerraOracleExchangeRates = saveTerraOracleExchangeRates;
exports.getTotalMissedBlockCount = getTotalMissedBlockCount;
exports.getMissedBlocksHistory = getMissedBlocksHistory;
exports.getMissedBlocksByTimeOfDay = getMissedBlocksByTimeOfDay;
exports.getMissedBlocksAlert = getMissedBlocksAlert;
exports.getLateBlockTimeAlert = getLateBlockTimeAlert;
exports.getPeerCount = getPeerCount;
exports.getTotalBlockCount = getTotalBlockCount;
exports.getBlocksByTimeOfDay = getBlocksByTimeOfDay;
exports.getBlockHeights = getBlockHeights;
exports.getTerraOracleMisses = getTerraOracleMisses;
exports.getTerraOracleExchangeRates = getTerraOracleExchangeRates;
exports.default = {
  saveBlockCommits: saveBlockCommits,
  saveHealthChecks: saveHealthChecks,
  savePeerCounts: savePeerCounts,
  saveBlockHeights: saveBlockHeights,
  saveTerraOracleMisses: saveTerraOracleMisses,
  saveTerraOracleExchangeRates: saveTerraOracleExchangeRates,
  getTotalMissedBlockCount: getTotalMissedBlockCount,
  getMissedBlocksHistory: getMissedBlocksHistory,
  getMissedBlocksByTimeOfDay: getMissedBlocksByTimeOfDay,
  getMissedBlocksAlert: getMissedBlocksAlert,
  getLateBlockTimeAlert: getLateBlockTimeAlert,
  getPeerCount: getPeerCount,
  getTotalBlockCount: getTotalBlockCount,
  getBlocksByTimeOfDay: getBlocksByTimeOfDay,
  getBlockHeights: getBlockHeights,
  getTerraOracleMisses: getTerraOracleMisses,
  getTerraOracleExchangeRates: getTerraOracleExchangeRates
};
//# sourceMappingURL=influx-store.js.map
