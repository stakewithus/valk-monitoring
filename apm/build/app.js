'use strict';

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _monit = require('./monit');

var _monit2 = _interopRequireDefault(_monit);

var _sync = require('./sync2');

var _sync2 = _interopRequireDefault(_sync);

var _health = require('./health');

var _health2 = _interopRequireDefault(_health);

var _server = require('./server');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'app.js' });

_dotenv2.default.config();
logger.info('Launching APM-AGENT');

var args = _yargs2.default // eslint-disable-line
.usage('Usage: $0 <command> [options]').command(['sync'], 'Sync the Nomad and Consul APM Agent', function (yags) {
  //
  yags.option('node', {
    describe: 'Node for the APM Agent to query'
  }).option('nomad-port', {
    alias: 'np',
    default: 4646
  }).option('consul-port', {
    alias: 'cp',
    default: 8500
  }).option('nomad-token', {
    alias: 'nt'
  }).option('consul-token', {
    alias: 'ct'
  }).option('config', {
    default: 'github'
  }).option('production').option('prod-config-file').describe('production', 'Run monit in production mode without nomad').describe('prod-config-file', 'Custom config file for production').describe('consul-port', 'Port Consul Agent is listening on').describe('nomad-port', 'Port Nomad Agent is listening on').describe('consul-token', 'Consul ACL Token').describe('nomad-token', 'Nomad ACL Token').describe('config', 'Configuration directory to read Nomad Job Files').demandOption(['node']);
}, function (argv) {
  var node = argv.node,
      nomadPort = argv.nomadPort,
      consulPort = argv.consulPort,
      nomadToken = argv.nomadToken,
      consulToken = argv.consulToken,
      configDir = argv.config,
      production = argv.production,
      prodConfigFile = argv.prodConfigFile;


  (0, _sync2.default)(node, nomadPort, consulPort, configDir, { nomadToken: nomadToken, consulToken: consulToken }, production, prodConfigFile).then(function () {
    process.exit(0);
  }).catch(function (err) {
    if (err) console.log(err);
    process.exit(1);
  });
}).command(['health'], 'Get cluster health from Nomad and Consul through APM agent', function (yags) {
  //
  yags.option('node', {
    describe: 'Node for the APM Agent to query'
  }).option('nomad-port', {
    alias: 'np',
    default: 4646
  }).option('consul-port', {
    alias: 'cp',
    default: 8500
  }).option('nomad-token', {
    alias: 'nt'
  }).option('consul-token', {
    alias: 'ct'
  }).option('config', {
    default: 'github'
  }).option('service', {
    alias: 's'
  }).option('output', {
    alias: 'o'
  }).option('production').option('prod-config-file').describe('production', 'Run monit in production mode without nomad').describe('prod-config-file', 'Custom config file for production').describe('consul-port', 'Port Consul Agent is listening on').describe('nomad-port', 'Port Nomad Agent is listening on').describe('consul-token', 'Consul ACL Token').describe('nomad-token', 'Nomad ACL Token').describe('config', 'Configuration directory to read Nomad Job Files').describe('service', 'Service name, fx: kava').describe('output', 'Show output of health check name, fx: tm-missed-blocks').demandOption(['node']);
}, function (argv) {
  (0, _health2.default)(argv).then(function () {
    process.exit(0);
  }).catch(function (err) {
    if (err) console.log(err);
    process.exit(1);
  });
}).command(['monit [node]'], 'Monitor and Update node state', function (yags) {
  //
  yags.option('node', {
    describe: 'Node for the APM Agent to query',
    alias: 'n',
    default: '127.0.0.1'
  }).option('config', {
    describe: 'Config folder path',
    alias: 'c'
  }).option('nomad-port', {
    default: 4646
  }).option('consul-port', {
    default: 8500
  }).option('verbose', {
    alias: 'v'
  }).option('production').option('prod-config-file').option('nomad-token').option('consul-token').describe('consul-port', 'Port Consul Agent is listening on').describe('nomad-port', 'Port Nomad Agent is listening on').describe('consul-token', 'Consul ACL Token').describe('nomad-token', 'Nomad ACL Token').describe('verbose', 'Show logs').describe('production', 'Run monit in production mode without nomad').describe('prod-config-file', 'Custom config file for production').demandOption(['node']);
}, function (argv) {
  logger.info('Starting Monit...');
  _monit2.default.start(argv);
}).command(['server [node]'], 'Monitor and Update node state', function (yags) {
  yags.option('node', {
    describe: 'Node for the APM Agent to query',
    alias: 'n',
    default: '127.0.0.1'
  }).option('nomad-port', {
    default: 4646
  }).option('consul-port', {
    default: 8500
  }).option('port', {
    describe: 'Http port',
    alias: 'p',
    default: 3000
  }).option('production').option('prod-config-file').describe('production', 'Run monit in production mode without nomad').describe('prod-config-file', 'Custom config file for production').demandOption(['node']);
}, function (argv) {
  logger.info('Starting Server...');
  _server2.default.start(argv);
}).help().argv;
//# sourceMappingURL=app.js.map
