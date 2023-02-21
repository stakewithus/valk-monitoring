'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _server = require('./server');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'cmd/health' });

var start = function start(_ref) {
  var port = _ref.port,
      node = _ref.node,
      nomadPort = _ref.nomadPort,
      consulPort = _ref.consulPort,
      production = _ref.production,
      prodConfigFile = _ref.prodConfigFile;

  var server = (0, _server2.default)({
    node: node, nomadPort: nomadPort, consulPort: consulPort, production: production, prodConfigFile: prodConfigFile
  });
  server.listen(port, function (err) {
    if (err) {
      return logger.error(err && err.toString());
    }
    return logger.info('Server is listening on port', port);
  });
  return server;
};

process.on('uncaughtException', function (exception) {
  console.log('EXCEPTION', exception);
});

exports.default = {
  start: start
};
//# sourceMappingURL=index.js.map
