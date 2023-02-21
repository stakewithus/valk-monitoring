import NockNomadAPI from '../plugins/schedulers/nomad2/nocks/api';
import NockConsulAPI from '../plugins/backends/consul2/nocks/api';

import health from './index';

describe('Health Command Tests', () => {
  before(async () => {
    await NockNomadAPI('127.0.0.1', 4646);
    await NockConsulAPI('127.0.0.1', 8500);
  });
  describe('# health --node 127.0.0.1 --config /app', () => {
    it('should run the health command', async () => {
      await health({
        node: '127.0.0.1', nomadPort: 4646, consulPort: 8500, showRawData: true,
      });
    });
  });
  describe('# health --node 127.0.0.1 --config /app --service commit-hub', () => {
    it('should run the health command', async () => {
      await health({
        node: '127.0.0.1', nomadPort: 4646, consulPort: 8500, service: 'commit-hub',
      });
    });
  });
  describe('# health --node 127.0.0.1 --config /app --service commit-hub --output tm-missed-blocks', () => {
    it('should run the health command', async () => {
      await health({
        node: '127.0.0.1', nomadPort: 4646, consulPort: 8500, service: 'commit-hub', output: 'tm-missed-blocks',
      });
    });
  });
});
