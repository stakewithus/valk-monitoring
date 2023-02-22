'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _api = require('../plugins/schedulers/nomad2/nocks/api');

var _api2 = _interopRequireDefault(_api);

var _api3 = require('../plugins/backends/consul2/nocks/api');

var _api4 = _interopRequireDefault(_api3);

var _oracle = require('../plugins/backends/consul2/nocks/oracle');

var _oracle2 = _interopRequireDefault(_oracle);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('Sync Command Tests', function () {
  process.env.TERRA_LCD = '127.0.0.1:1321';
  before(async function () {
    await (0, _api2.default)('127.0.0.1', 4646);
    await (0, _api4.default)('127.0.0.1', 8500);
    await (0, _oracle2.default)('127.0.0.1', 8500);
  });
  describe('# sync --node 127.0.0.1 --config /app', function () {
    it('should run the sync command', async function () {
      var configDir = _path2.default.join(__dirname, 'fix1');
      await (0, _index2.default)('127.0.0.1', 4646, 8500, configDir, {});
    });
    it('should run the sync command and update the job', async function () {
      var configDir = _path2.default.join(__dirname, 'fix2');
      await (0, _index2.default)('127.0.0.1', 4646, 8500, configDir, {});
    });
    it('should run the sync without nomad', async function () {
      await (0, _index2.default)('127.0.0.1', 4646, 8500, null, {}, true, 'prod-config/config.json');
    });
  });
});
//# sourceMappingURL=index.spec.js.map
