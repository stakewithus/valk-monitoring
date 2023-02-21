'use strict';

var _chai = require('chai');

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _influxdbClient = require('../plugins/influxdb-client');

var _influxStore = require('./influx-store');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var blockCommits = [{
  height: 1234456,
  time: new Date().valueOf(),
  missed: true
}];

describe('Read and write block commits to influxdb', function () {
  var host = 'http://127.0.0.1:8086';
  var db = 'apm';
  var measurement = 'block_commits';
  var project = 'kava';
  var network = 'kava-testnet-2000';
  var query = (0, _influxdbClient.Query)({
    host: host
  });
  before(async function () {
    return query(db).exec({
      query: 'DROP DATABASE ' + db + ';CREATE DATABASE ' + db
    });
  });

  describe('Save block commits', function () {
    before(async function () {
      return query(db).exec({
        query: 'DELETE FROM ' + measurement
      });
    });

    it('Should ok', async function () {
      var ret = await (0, _influxStore.saveBlockCommits)({
        host: host,
        network: network,
        project: project,
        blockCommits: blockCommits
      });
      _chai.assert.deepStrictEqual(ret, true);
    });
  });

  describe('Get total count of missed blocks', function () {
    it('Should ok', async function () {
      var ret = await (0, _influxStore.getTotalMissedBlockCount)({
        host: host,
        network: network,
        project: project
      });
      _chai.assert.deepStrictEqual(ret, 1);
    });
  });

  describe('Get history of missed blocks for the last 14 days', function () {
    it('Should ok', async function () {
      var ret = await (0, _influxStore.getMissedBlocksHistory)({
        host: host,
        network: network,
        project: project,
        from: (0, _moment2.default)().subtract(13, 'd').valueOf() * 1e6,
        to: (0, _moment2.default)().valueOf() * 1e6
      });
      _chai.assert.deepStrictEqual(ret.length, 14);
    });
  });

  describe('Get missed blocks by time of days for the last 14 days', function () {
    it('Should ok', async function () {
      var ret = await (0, _influxStore.getMissedBlocksByTimeOfDay)({
        host: host,
        network: network,
        project: project,
        from: (0, _moment2.default)().subtract(13, 'd').startOf('d').valueOf() * 1e6,
        to: (0, _moment2.default)().endOf('d').valueOf() * 1e6
      });
      _chai.assert.deepStrictEqual(ret.length, 14 * 24);
    });
  });
});
//# sourceMappingURL=influx-store.spec.js.map
