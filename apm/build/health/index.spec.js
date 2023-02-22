'use strict';

var _api = require('../plugins/schedulers/nomad2/nocks/api');

var _api2 = _interopRequireDefault(_api);

var _api3 = require('../plugins/backends/consul2/nocks/api');

var _api4 = _interopRequireDefault(_api3);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('Health Command Tests', function () {
  before(async function () {
    await (0, _api2.default)('127.0.0.1', 4646);
    await (0, _api4.default)('127.0.0.1', 8500);
  });
  describe('# health --node 127.0.0.1 --config /app', function () {
    it('should run the health command', async function () {
      await (0, _index2.default)({
        node: '127.0.0.1', nomadPort: 4646, consulPort: 8500, showRawData: true
      });
    });
  });
  describe('# health --node 127.0.0.1 --config /app --service commit-hub', function () {
    it('should run the health command', async function () {
      await (0, _index2.default)({
        node: '127.0.0.1', nomadPort: 4646, consulPort: 8500, service: 'commit-hub'
      });
    });
  });
  describe('# health --node 127.0.0.1 --config /app --service commit-hub --output tm-missed-blocks', function () {
    it('should run the health command', async function () {
      await (0, _index2.default)({
        node: '127.0.0.1', nomadPort: 4646, consulPort: 8500, service: 'commit-hub', output: 'tm-missed-blocks'
      });
    });
  });
});
//# sourceMappingURL=index.spec.js.map
