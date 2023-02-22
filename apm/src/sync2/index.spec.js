import path from 'path';

import NockNomadAPI from '../plugins/schedulers/nomad2/nocks/api';
import NockConsulAPI from '../plugins/backends/consul2/nocks/api';
import NockOracleConsulAPI from '../plugins/backends/consul2/nocks/oracle';

import sync from './index';

describe('Sync Command Tests', () => {
  process.env.TERRA_LCD = '127.0.0.1:1321';
  before(async () => {
    await NockNomadAPI('127.0.0.1', 4646);
    await NockConsulAPI('127.0.0.1', 8500);
    await NockOracleConsulAPI('127.0.0.1', 8500);
  });
  describe('# sync --node 127.0.0.1 --config /app', () => {
    it('should run the sync command', async () => {
      const configDir = path.join(__dirname, 'fix1');
      await sync('127.0.0.1', 4646, 8500, configDir, {});
    });
    it('should run the sync command and update the job', async () => {
      const configDir = path.join(__dirname, 'fix2');
      await sync('127.0.0.1', 4646, 8500, configDir, {});
    });
    it('should run the sync without nomad', async () => {
      await sync('127.0.0.1', 4646, 8500, null, {}, true, 'prod-config/config.json');
    });
  });
});
