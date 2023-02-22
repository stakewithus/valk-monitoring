import {
  assert,
} from 'chai';
import moment from 'moment';
import {
  Query,
} from '../plugins/influxdb-client';
import {
  saveBlockCommits,
  getMissedBlocksByTimeOfDay,
  getMissedBlocksHistory,
  getTotalMissedBlockCount,
} from './influx-store';

const blockCommits = [{
  height: 1234456,
  time: new Date().valueOf(),
  missed: true,
}];

describe('Read and write block commits to influxdb', () => {
  const host = 'http://127.0.0.1:8086';
  const db = 'apm';
  const measurement = 'block_commits';
  const project = 'kava';
  const network = 'kava-testnet-2000';
  const query = Query({
    host,
  });
  before(async () => query(db).exec({
    query: `DROP DATABASE ${db};CREATE DATABASE ${db}`,
  }));

  describe('Save block commits', () => {
    before(async () => query(db).exec({
      query: `DELETE FROM ${measurement}`,
    }));

    it('Should ok', async () => {
      const ret = await saveBlockCommits({
        host,
        network,
        project,
        blockCommits,
      });
      assert.deepStrictEqual(ret, true);
    });
  });

  describe('Get total count of missed blocks', () => {
    it('Should ok', async () => {
      const ret = await getTotalMissedBlockCount({
        host,
        network,
        project,
      });
      assert.deepStrictEqual(ret, 1);
    });
  });

  describe('Get history of missed blocks for the last 14 days', () => {
    it('Should ok', async () => {
      const ret = await getMissedBlocksHistory({
        host,
        network,
        project,
        from: moment().subtract(13, 'd').valueOf() * 1e6,
        to: moment().valueOf() * 1e6,
      });
      assert.deepStrictEqual(ret.length, 14);
    });
  });

  describe('Get missed blocks by time of days for the last 14 days', () => {
    it('Should ok', async () => {
      const ret = await getMissedBlocksByTimeOfDay({
        host,
        network,
        project,
        from: moment().subtract(13, 'd').startOf('d').valueOf() * 1e6,
        to: moment().endOf('d').valueOf() * 1e6,
      });
      assert.deepStrictEqual(ret.length, 14 * 24);
    });
  });
});
