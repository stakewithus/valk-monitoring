import yargs from 'yargs';
import pino from 'pino';
import dotenv from 'dotenv';
import Monit from './monit';

import syncCmd2 from './sync2';

import healthCmd from './health';

import server from './server';

const logger = pino().child({ module: 'app.js' });

dotenv.config();
logger.info('Launching APM-AGENT');

const args = yargs  // eslint-disable-line
  .usage('Usage: $0 <command> [options]')
  .command(
    ['sync'],
    'Sync the Nomad and Consul APM Agent',
    (yags) => {
      //
      yags.option('node', {
        describe: 'Node for the APM Agent to query',
      })
        .option('nomad-port', {
          alias: 'np',
          default: 4646,
        })
        .option('consul-port', {
          alias: 'cp',
          default: 8500,
        })
        .option('nomad-token', {
          alias: 'nt',
        })
        .option('consul-token', {
          alias: 'ct',
        })
        .option('config', {
          default: 'github',
        })
        .option('production')
        .option('prod-config-file')
        .describe('production', 'Run monit in production mode without nomad')
        .describe('prod-config-file', 'Custom config file for production')
        .describe('consul-port', 'Port Consul Agent is listening on')
        .describe('nomad-port', 'Port Nomad Agent is listening on')
        .describe('consul-token', 'Consul ACL Token')
        .describe('nomad-token', 'Nomad ACL Token')
        .describe('config', 'Configuration directory to read Nomad Job Files')
        .demandOption(['node']);
    },
    (argv) => {
      const {
        node,
        nomadPort,
        consulPort,
        nomadToken,
        consulToken,
        config: configDir,
        production,
        prodConfigFile,
      } = argv;

      syncCmd2(
        node,
        nomadPort,
        consulPort,
        configDir,
        { nomadToken, consulToken },
        production,
        prodConfigFile,
      ).then(() => {
        process.exit(0);
      }).catch((err) => {
        if (err) console.log(err);
        process.exit(1);
      });
    },
  )
  .command(
    ['health'],
    'Get cluster health from Nomad and Consul through APM agent',
    (yags) => {
      //
      yags.option('node', {
        describe: 'Node for the APM Agent to query',
      })
        .option('nomad-port', {
          alias: 'np',
          default: 4646,
        })
        .option('consul-port', {
          alias: 'cp',
          default: 8500,
        })
        .option('nomad-token', {
          alias: 'nt',
        })
        .option('consul-token', {
          alias: 'ct',
        })
        .option('config', {
          default: 'github',
        })
        .option('service', {
          alias: 's',
        })
        .option('output', {
          alias: 'o',
        })
        .option('production')
        .option('prod-config-file')
        .describe('production', 'Run monit in production mode without nomad')
        .describe('prod-config-file', 'Custom config file for production')
        .describe('consul-port', 'Port Consul Agent is listening on')
        .describe('nomad-port', 'Port Nomad Agent is listening on')
        .describe('consul-token', 'Consul ACL Token')
        .describe('nomad-token', 'Nomad ACL Token')
        .describe('config', 'Configuration directory to read Nomad Job Files')
        .describe('service', 'Service name, fx: kava')
        .describe('output', 'Show output of health check name, fx: tm-missed-blocks')
        .demandOption(['node']);
    },
    (argv) => {
      healthCmd(argv).then(() => {
        process.exit(0);
      }).catch((err) => {
        if (err) console.log(err);
        process.exit(1);
      });
    },
  )
  .command(
    ['monit [node]'],
    'Monitor and Update node state',
    (yags) => {
      //
      yags.option('node', {
        describe: 'Node for the APM Agent to query',
        alias: 'n',
        default: '127.0.0.1',
      })
        .option('config', {
          describe: 'Config folder path',
          alias: 'c',
        })
        .option('nomad-port', {
          default: 4646,
        })
        .option('consul-port', {
          default: 8500,
        })
        .option('verbose', {
          alias: 'v',
        })
        .option('production')
        .option('prod-config-file')
        .option('nomad-token')
        .option('consul-token')
        .describe('consul-port', 'Port Consul Agent is listening on')
        .describe('nomad-port', 'Port Nomad Agent is listening on')
        .describe('consul-token', 'Consul ACL Token')
        .describe('nomad-token', 'Nomad ACL Token')
        .describe('verbose', 'Show logs')
        .describe('production', 'Run monit in production mode without nomad')
        .describe('prod-config-file', 'Custom config file for production')
        .demandOption(['node']);
    },
    (argv) => {
      logger.info('Starting Monit...');
      Monit.start(argv);
    },
  )
  .command(
    ['server [node]'],
    'Monitor and Update node state',
    (yags) => {
      yags.option('node', {
        describe: 'Node for the APM Agent to query',
        alias: 'n',
        default: '127.0.0.1',
      })
        .option('nomad-port', {
          default: 4646,
        })
        .option('consul-port', {
          default: 8500,
        })
        .option('port', {
          describe: 'Http port',
          alias: 'p',
          default: 3000,
        })
        .option('production')
        .option('prod-config-file')
        .describe('production', 'Run monit in production mode without nomad')
        .describe('prod-config-file', 'Custom config file for production')
        .demandOption(['node']);
    },
    (argv) => {
      logger.info('Starting Server...');
      server.start(argv);
    },
  )
  .help()
  .argv;
