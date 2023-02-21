/* eslint-disable import/no-named-as-default-member */
/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
import moment from 'moment';
import InfluxStore from '../../monit/influx-store';
import Util from '../../common/util';

const statusMap = {
  WARNING: 1,
  CRITICAL: 2,
};

const getMissedBlocksChart = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const from = (query.get('from') || 0) * 1e6;
  const to = (query.get('to') || 0) * 1e6;
  const [totalBlocks, missedBlocks] = await Promise.all([
    InfluxStore.getBlocksByTimeOfDay({
      project,
      network,
      from,
      to,
    }),
    InfluxStore.getMissedBlocksByTimeOfDay({
      project,
      network,
      from,
      to,
    }),
  ]);
  const ret = [{
    data: totalBlocks.map((block) => ({
      x: moment(block[0]).valueOf(),
      y: 0,
    })),
  }, {
    data: totalBlocks.map((block) => ({
      x: moment(block[0]).valueOf(),
      y: 100,
      meta: {
        total: block[1],
      },
    })),
  }];
  missedBlocks.forEach((block) => {
    const idx = totalBlocks.findIndex((x) => x[0] === block[0]);
    const totalCount = totalBlocks[idx][1];
    ret[0].data[idx].y = block[1];
    ret[1].data[idx].y = Util.roundFloatNumber(((totalCount - block[1]) / totalCount) * 100, 2);
  });
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

const getMissedBlocksAlertChart = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const from = (query.get('from') || 0) * 1e6;
  const to = (query.get('to') || 0) * 1e6;
  const weekDays = moment.weekdaysShort();
  const missedBlocks = await InfluxStore.getMissedBlocksAlert({
    project,
    network,
    from,
    to,
  });
  const ret = weekDays.map((day) => {
    const data = Array(24).fill().map((v, index) => ({
      x: `${index}`,
      y: 0,
      meta: {
        WARNING: 0,
        CRITICAL: 0,
      },
    }));
    return {
      name: day,
      data,
    };
  });
  missedBlocks.forEach((block) => {
    const d = moment(block[0]);
    if (Number(block[1])) {
      ret[d.weekday()].data[d.hour()].y = Math.max(ret[d.weekday()].data[d.hour()].y, statusMap[block[2]]);
      ret[d.weekday()].data[d.hour()].meta[block[2]] += block[1];
    }
  });
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret.reverse()));
  return res;
};

const getPeerCountChart = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const from = (query.get('from') || 0) * 1e6;
  const to = (query.get('to') || 0) * 1e6;

  let ret = await InfluxStore.getPeerCount({
    project,
    network,
    from,
    to,
  });
  ret = ret.map((item) => {
    const data = [];
    item.values.forEach((val) => {
      data.push({
        x: moment(val[0]).valueOf(),
        y: val.slice(-1)[0],
      });
    });
    return {
      name: item.name,
      data,
    };
  });
  if (!ret.length) {
    ret = [{
      data: [],
    }];
  }
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};


const getBlockHeightsChart = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const from = (query.get('from') || 0) * 1e6;
  const to = (query.get('to') || 0) * 1e6;

  let ret = await InfluxStore.getBlockHeights({
    project,
    network,
    from,
    to,
  });
  ret = ret.map((item) => {
    const data = [];
    item.values.forEach((val) => {
      data.push({
        x: moment(val[0]).valueOf(),
        y: val.slice(-1)[0],
      });
    });
    return {
      name: item.name,
      data,
    };
  });
  if (!ret.length) {
    ret = [{
      data: [],
    }];
  }
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

const getLateBlockTimeAlertChart = ({
  query,
  capture,
}, res) => async (args) => {
  const [, project] = capture;
  const network = query.get('network');
  const from = (query.get('from') || 0) * 1e6;
  const to = (query.get('to') || 0) * 1e6;
  const weekDays = moment.weekdaysShort();
  const missedBlocks = await InfluxStore.getLateBlockTimeAlert({
    project,
    network,
    from,
    to,
  });
  const ret = weekDays.map((day) => {
    const data = Array(24).fill().map((v, index) => ({
      x: `${index}`,
      y: 0,
      meta: {
        WARNING: 0,
        CRITICAL: 0,
      },
    }));
    return {
      name: day,
      data,
    };
  });
  missedBlocks.forEach((block) => {
    const d = moment(block[0]);
    if (Number(block[1])) {
      ret[d.weekday()].data[d.hour()].y = Math.max(ret[d.weekday()].data[d.hour()].y, statusMap[block[2]]);
      ret[d.weekday()].data[d.hour()].meta[block[2]] += block[1];
    }
  });
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret.reverse()));
  return res;
};

export default {
  getMissedBlocksChart,
  getMissedBlocksAlertChart,
  getPeerCountChart,
  getLateBlockTimeAlertChart,
  getBlockHeightsChart,
};
