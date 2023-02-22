"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var healthCheckCounter = {};

var generateCounterId = function generateCounterId(nodeMeta, checkName) {
  return nodeMeta.projectName + "-" + nodeMeta.networkName + "-" + nodeMeta.host + "-" + checkName;
};
var get = function get(nodeMeta, checkName) {
  return healthCheckCounter[generateCounterId(nodeMeta, checkName)] || 0;
};

var increase = function increase(nodeMeta, checkName) {
  var counterId = generateCounterId(nodeMeta, checkName);
  healthCheckCounter[counterId] = get(nodeMeta, checkName) + 1;
};

var reset = function reset(nodeMeta, checkName) {
  healthCheckCounter[generateCounterId(nodeMeta, checkName)] = 0;
};

exports.default = {
  get: get,
  increase: increase,
  reset: reset
};
//# sourceMappingURL=health-check-counter.js.map
