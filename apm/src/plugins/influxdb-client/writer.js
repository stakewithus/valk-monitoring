import Bluebird from 'bluebird';
import request from 'request';

import {
  parse,
} from './line-protocol';

Bluebird.promisifyAll(request);

const write = async (host, db, points) => {
  let rhost = host;
  if (!rhost) {
    rhost = (process.env.INFLUXDB_HOST && process.env.INFLUXDB_PORT) ? `${process.env.INFLUXDB_HOST}:${process.env.INFLUXDB_PORT}` : 'http://127.0.0.1:8086';
  }
  const lineMsg = parse(points);
  const res = await request.postAsync({
    uri: `${rhost}/write`,
    qs: {
      db,
      precision: 'ms',
    },
    body: lineMsg,
  });
  const {
    statusCode,
    body,
  } = res.toJSON();
  if (statusCode === 204 && body === '') {
    return true;
  }
  console.log('Influxdb writer response:', statusCode, body);
  return false;
};

export default ({
  host,
}) => ({
  writePoints: (db) => (points) => write(host, db, points),
});
