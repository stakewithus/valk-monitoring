import Bluebird from 'bluebird';
import request from 'request';

Bluebird.promisifyAll(request);

const query = async ({
  query, start, end, step = '15s',
}) => {
  const response = await request.getAsync(`${process.env.PROMETHEUS_API_URL}/query_range`, {
    qs: {
      query, start, end, step,
    },
  });
  const data = JSON.parse(response.body);
  return data;
};

export default query;
