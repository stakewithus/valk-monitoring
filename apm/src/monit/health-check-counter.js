const healthCheckCounter = {};

const generateCounterId = (nodeMeta, checkName) => `${nodeMeta.projectName}-${nodeMeta.networkName}-${nodeMeta.host}-${checkName}`;
const get = (
  nodeMeta,
  checkName,
) => healthCheckCounter[generateCounterId(nodeMeta, checkName)] || 0;

const increase = (nodeMeta, checkName) => {
  const counterId = generateCounterId(nodeMeta, checkName);
  healthCheckCounter[counterId] = get(nodeMeta, checkName) + 1;
};

const reset = (nodeMeta, checkName) => {
  healthCheckCounter[generateCounterId(nodeMeta, checkName)] = 0;
};

export default {
  get,
  increase,
  reset,
};
