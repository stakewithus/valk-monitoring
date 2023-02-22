'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _constant = require('../constant');

var _constant2 = _interopRequireDefault(_constant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lcdStatus = {};

var getCheckId = function getCheckId(project, host, port) {
  return 'lcd-' + project + '-' + host + ':' + port;
};

var addService = function addService(bend) {
  return async function (project, host, port) {
    var nodeServices = await bend.agent.service.list();
    var svcName = project + '-backend';
    if (nodeServices[svcName]) {
      return null;
    }
    var svcDef = {
      ID: svcName,
      Name: svcName
    };
    return bend.agent.service.upsert(svcDef);
  };
};

var addCheck = function addCheck(bend) {
  return async function (project, host, port) {
    var nodeChecks = await bend.agent.check.list();
    if (nodeChecks[getCheckId(project, host, port)]) {
      return null;
    }
    var lcdHttpCheck = {
      CheckID: getCheckId(project, host, port),
      Name: getCheckId(project, host, port),
      Notes: 'Checks that LCD Server is running',
      HTTP: 'http://' + host + ':' + port + '/node_info',
      Method: 'GET',
      Interval: '5s',
      ServiceID: project + '-backend',
      Status: 'critical'
    };
    return bend.agent.check.register(lcdHttpCheck);
  };
};

var healthCheck = function healthCheck(nodeChecks, project, host, port) {
  return nodeChecks[getCheckId(project, host, port)];
};

var shouldAlerting = function shouldAlerting(check, project, host, port) {
  if (!check || !check.Status) {
    return false;
  }
  var failInARow = lcdStatus[getCheckId(project, host, port)];
  if (check.Status.toUpperCase() === _constant2.default.HEALTH_CHECK_STATUS.CRITICAL) {
    lcdStatus[getCheckId(project, host, port)] = failInARow ? failInARow + 1 : 1;
    if (failInARow === 2) {
      return true;
    }
  } else {
    lcdStatus[getCheckId(project, host, port)] = 0;
  }
  return false;
};

exports.default = {
  healthCheck: healthCheck,
  addService: addService,
  addCheck: addCheck,
  shouldAlerting: shouldAlerting,
  getCheckId: getCheckId
};
//# sourceMappingURL=index.js.map
