import TerraService from '../../../monit/terra/service';
import Terra from '../../../monit/terra';
import { getTerraOracleMisses, getTerraOracleExchangeRates } from '../../../monit/influx-store';

const getStatus = (req, res) => async ({ Backend }) => {
  const missesData = await TerraService.getMissingVote();
  const votingPeriod = Math.floor(+missesData.height / 5);
  const uptime = await Terra.getUptimePercentage(Backend)(votingPeriod);
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify({
    blockHeight: missesData.height,
    misses: missesData.result,
    uptime,
  }));
  return res;
};

const getHealthChecks = (req, res) => async ({ Backend }) => {
  const result = await Terra.getHealthChecks(Backend);
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(result));
  return res;
};

const getMissesChart = (req, res) => async ({ }) => {
  const limit = 2500;
  const from = (req.query.get('from') || 0) * 1e6;
  const to = (req.query.get('to') || 0) * 1e6;
  const fromBlock = Number(req.query.get('from_block'));
  const toBlock = Number(req.query.get('to_block'));
  const BLOCKS = Number(req.query.get('blocks')) || 50;
  const missesByBlockHeight = await getTerraOracleMisses({
    from, to, fromBlock, toBlock, limit,
  });
  const ret = [];
  if (missesByBlockHeight.length > 0) {
    let lastBlockHeight = missesByBlockHeight[0].height;
    let lastTotalMisses = missesByBlockHeight[0].misses;
    ret.push({
      x: lastBlockHeight,
      y: 0,
    });
    missesByBlockHeight.slice(1).forEach((val, idx) => {
      if (lastBlockHeight + BLOCKS <= val.height || missesByBlockHeight.length - 2 === idx) {
        ret.push({
          x: val.height,
          y: val.misses - lastTotalMisses,
        });
        lastBlockHeight = val.height;
        lastTotalMisses = val.misses;
      }
    });
  }
  res.write(JSON.stringify(ret));
  return res;
};

const getExchangeRateCharts = (req, res) => async ({ }) => {
  const limit = 50;
  const from = (req.query.get('from') || 0) * 1e6;
  const to = (req.query.get('to') || 0) * 1e6;
  const fromBlock = Number(req.query.get('from_block'));
  const toBlock = Number(req.query.get('to_block'));
  const ret = await getTerraOracleExchangeRates({
    from, to, fromBlock, toBlock, limit,
  });
  for (const denom in ret) {
    ret[denom] = [{
      name: '_',
      data: ret[denom].map((val) => ({
        x: val.height,
        y: val.amount,
      })),
    }, {
      name: 'swu',
      data: ret[denom].map((val) => ({
        x: val.height,
        y: val.swu_amount,
      })),
    }];
  }
  res.write(JSON.stringify(ret));
  return res;
};

export default {
  getStatus,
  getHealthChecks,
  getMissesChart,
  getExchangeRateCharts,
};
