import pino from 'pino';
import bootstrap from './bootstrap';
import Config from './config';
import server from './server';

const logger = pino().child({
  module: 'index',
});

const start = async (port) => {
  await bootstrap();
  server().listen(port, (err) => {
    if (err) {
      return logger.error(err && err.toString());
    }
    return logger.info('Server is listening on port', port);
  });
  return server;
};

start(Config.serverPort);
