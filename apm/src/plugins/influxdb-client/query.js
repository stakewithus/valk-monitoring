import Bluebird from 'bluebird';
import request from 'request';

Bluebird.promisifyAll(request);

const execQuery = async ({
  host,
  db,
  query,
  params,
}) => {
  let rhost = host;
  if (!rhost) {
    rhost = (process.env.INFLUXDB_HOST && process.env.INFLUXDB_PORT) ? `${process.env.INFLUXDB_HOST}:${process.env.INFLUXDB_PORT}` : 'http://127.0.0.1:8086';
  }
  const response = await request.postAsync({
    uri: `${rhost}/query`,
    qs: {
      db,
      q: query,
      params: JSON.stringify(params),
    },
  });
  const data = JSON.parse(response.body);
  if (data.error) throw new Error(data.error);
  return data.results;
};

export default ({
  host,
}) => (db) => ({
  exec: ({
    query,
    params,
  }) => execQuery({
    host,
    db,
    query,
    params,
  }),
});
