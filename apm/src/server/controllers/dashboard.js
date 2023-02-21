import prometheusRequest from '../../plugins/prometheus-client/query';

const getCpuUsageMetrics = ({
  query,
  capture,
}, res) => async (args) => {
  const start = query.get('start');
  const end = query.get('end');
  const step = query.get('step');
  const data = await prometheusRequest({
    query: '100 - (avg by (instance) (irate(node_cpu_seconds_total{job="node",mode="idle"}[5m])) * 100)',
    start,
    end,
    step,
  });
  const ret = data;
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

const getMemoryUsageMetrics = ({
  query,
  capture,
}, res) => async (args) => {
  const start = query.get('start');
  const end = query.get('end');
  const step = query.get('step');
  const data = await prometheusRequest({
    query: '100 * (1 - ((avg_over_time(node_memory_MemFree_bytes[5m]) + avg_over_time(node_memory_Cached_bytes[5m]) + avg_over_time(node_memory_Buffers_bytes[5m])) / avg_over_time(node_memory_MemTotal_bytes[5m])))',
    start,
    end,
    step,
  });
  const ret = data;
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

const getDiskUsageMetrics = ({
  query,
  capture,
}, res) => async (args) => {
  const start = query.get('start');
  const end = query.get('end');
  const step = query.get('step');
  const data = await prometheusRequest({
    query: '100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} * 100) / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"})',
    start,
    end,
    step,
  });
  const ret = data;
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

const getNetworkIOMetrics = ({
  query,
  capture,
}, res) => async (args) => {
  const start = query.get('start');
  const end = query.get('end');
  const step = query.get('step');
  const data = await Promise.all([
    prometheusRequest({
      query: 'irate(node_network_receive_bytes_total[5m])/1024/1024',
      start,
      end,
      step,
    }),
    prometheusRequest({
      query: 'irate(node_network_transmit_bytes_total[5m])/1024/1024',
      start,
      end,
      step,
    }),
  ]);
  const ret = data;
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify(ret));
  return res;
};

export default {
  getCpuUsageMetrics,
  getMemoryUsageMetrics,
  getDiskUsageMetrics,
  getNetworkIOMetrics,
};
