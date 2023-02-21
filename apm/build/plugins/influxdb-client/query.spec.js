'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

var _chai = require('chai');

var _index = require('./index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('InfluxDB Query', function () {
  var host = 'http://127.0.0.1:8086';
  var query = (0, _index.Query)({
    host: host
  });

  beforeEach(function (done) {
    _nock2.default.cleanAll();
    done();
  });

  describe('Read data', function () {
    it('Should return database not found error', async function () {
      var dbName = 'apm1';
      var q = 'select * from blocks where network=$network';
      var params = {
        network: 'kava'
      };
      (0, _nock2.default)(host).post('/query').query({
        db: dbName,
        q: q,
        params: (0, _stringify2.default)(params)
      }).reply(200, {
        results: [{
          statement_id: 0,
          error: 'database not found: apm1'
        }]
      });
      var res = await query(dbName).exec({
        query: q,
        params: params
      });
      _chai.assert.deepStrictEqual(res, [{
        statement_id: 0,
        error: 'database not found: apm1'
      }]);
    });

    it('Should throw an error(query invalid)', async function () {
      var dbName = 'apm';
      var q = 'select * from blocks where network=$network where';
      var params = {
        network: 'kava'
      };
      (0, _nock2.default)(host).post('/query').query({
        db: dbName,
        q: q,
        params: (0, _stringify2.default)(params)
      }).reply(200, {
        error: 'error parsing query: found WHERE, expected ; at line 1, char 45'
      });
      try {
        await query(dbName).exec({
          query: q,
          params: params
        });
      } catch (error) {
        _chai.assert.equal(error.message, 'error parsing query: found WHERE, expected ; at line 1, char 45');
      }
    });

    it('Should return an array of results', async function () {
      var dbName = 'apm';
      var q = 'select time,block_height from blocks where network=$network;select time,missed_count from blocks where network=$network';
      var params = {
        network: 'kava'
      };
      (0, _nock2.default)(host).post('/query').query({
        db: dbName,
        q: q,
        params: (0, _stringify2.default)(params)
      }).reply(200, {
        results: [{
          statement_id: 0,
          series: [{
            name: 'blocks',
            columns: ['time', 'block_height'],
            values: [['2019-08-15T12:47:20.194Z', 1092345], ['2019-08-15T12:47:20.694Z', 1092345]]
          }]
        }, {
          statement_id: 1,
          series: [{
            name: 'blocks',
            columns: ['time', 'missed_count'],
            values: [['2019-08-15T12:47:20.194Z', 25], ['2019-08-15T12:47:20.694Z', 22]]
          }]
        }]
      });
      var res = await query(dbName).exec({
        query: q,
        params: params
      });
      _chai.assert.deepStrictEqual(res, [{
        statement_id: 0,
        series: [{
          name: 'blocks',
          columns: ['time', 'block_height'],
          values: [['2019-08-15T12:47:20.194Z', 1092345], ['2019-08-15T12:47:20.694Z', 1092345]]
        }]
      }, {
        statement_id: 1,
        series: [{
          name: 'blocks',
          columns: ['time', 'missed_count'],
          values: [['2019-08-15T12:47:20.194Z', 25], ['2019-08-15T12:47:20.694Z', 22]]
        }]
      }]);
    });
  });
});
//# sourceMappingURL=query.spec.js.map
