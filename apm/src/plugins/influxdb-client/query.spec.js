import nock from 'nock';
import {
  assert,
} from 'chai';
import {
  Query,
} from './index';

describe('InfluxDB Query', () => {
  const host = 'http://127.0.0.1:8086';
  const query = Query({
    host,
  });

  beforeEach((done) => {
    nock.cleanAll();
    done();
  });

  describe('Read data', () => {
    it('Should return database not found error', async () => {
      const dbName = 'apm1';
      const q = 'select * from blocks where network=$network';
      const params = {
        network: 'kava',
      };
      nock(host)
        .post('/query')
        .query({
          db: dbName,
          q,
          params: JSON.stringify(params),
        })
        .reply(200, {
          results: [{
            statement_id: 0,
            error: 'database not found: apm1',
          }],
        });
      const res = await query(dbName).exec({
        query: q,
        params,
      });
      assert.deepStrictEqual(res, [{
        statement_id: 0,
        error: 'database not found: apm1',
      }]);
    });

    it('Should throw an error(query invalid)', async () => {
      const dbName = 'apm';
      const q = 'select * from blocks where network=$network where';
      const params = {
        network: 'kava',
      };
      nock(host)
        .post('/query')
        .query({
          db: dbName,
          q,
          params: JSON.stringify(params),
        })
        .reply(200, {
          error: 'error parsing query: found WHERE, expected ; at line 1, char 45',
        });
      try {
        await query(dbName).exec({
          query: q,
          params,
        });
      } catch (error) {
        assert.equal(error.message, 'error parsing query: found WHERE, expected ; at line 1, char 45');
      }
    });

    it('Should return an array of results', async () => {
      const dbName = 'apm';
      const q = 'select time,block_height from blocks where network=$network;select time,missed_count from blocks where network=$network';
      const params = {
        network: 'kava',
      };
      nock(host)
        .post('/query')
        .query({
          db: dbName,
          q,
          params: JSON.stringify(params),
        })
        .reply(200, {
          results: [{
            statement_id: 0,
            series: [{
              name: 'blocks',
              columns: ['time', 'block_height'],
              values: [
                ['2019-08-15T12:47:20.194Z', 1092345],
                ['2019-08-15T12:47:20.694Z', 1092345],
              ],
            }],
          }, {
            statement_id: 1,
            series: [{
              name: 'blocks',
              columns: ['time', 'missed_count'],
              values: [
                ['2019-08-15T12:47:20.194Z', 25],
                ['2019-08-15T12:47:20.694Z', 22],
              ],
            }],
          }],
        });
      const res = await query(dbName).exec({
        query: q,
        params,
      });
      assert.deepStrictEqual(res, [{
        statement_id: 0,
        series: [{
          name: 'blocks',
          columns: ['time', 'block_height'],
          values: [
            ['2019-08-15T12:47:20.194Z', 1092345],
            ['2019-08-15T12:47:20.694Z', 1092345],
          ],
        }],
      },
      {
        statement_id: 1,
        series: [{
          name: 'blocks',
          columns: ['time', 'missed_count'],
          values: [
            ['2019-08-15T12:47:20.194Z', 25],
            ['2019-08-15T12:47:20.694Z', 22],
          ],
        }],
      },
      ]);
    });
  });
});
