import pino from 'pino';
import Server from './server';

const logger = pino().child({ module: 'cmd/health' });

const start = ({
  port, node, nomadPort, consulPort, production, prodConfigFile,
}) => {
  const server = Server({
    node, nomadPort, consulPort, production, prodConfigFile,
  });
  server.listen(port, (err) => {
    if (err) {
      return logger.error(err && err.toString());
    }
    return logger.info('Server is listening on port', port);
  });
  return server;
};

process.on('uncaughtException', (exception) => {
  console.log('EXCEPTION', exception);
});

export default {
  start,
};
