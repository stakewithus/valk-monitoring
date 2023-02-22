'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRouteHandlers = undefined;

var _controllers = require('./controllers');

var _controllers2 = _interopRequireDefault(_controllers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable */
var getRouteHandlers = {
  GET: {
    '^\/api\/v1\/status$': function apiV1Status$(req, res) {
      return function (args) {
        return _controllers2.default.Status.get(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/projects$': function apiV1StatusProjects$(req, res) {
      return function (args) {
        return _controllers2.default.Status.getAllProjects(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/hosts$': function apiV1StatusHosts$(req, res) {
      return function (args) {
        return _controllers2.default.Status.getAllHosts(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/([a-zA-Z0-9\-]{2,99})\/missed-blocks\/count$': function apiV1StatusAZAZ09299MissedBlocksCount$(req, res) {
      return function (args) {
        return _controllers2.default.Status.getTotalMissedBlocks(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/([a-zA-Z0-9\-]{2,99})\/missed-blocks\/by-time-of-day$': function apiV1StatusAZAZ09299MissedBlocksByTimeOfDay$(req, res) {
      return function (args) {
        return _controllers2.default.Status.getMissedBlocksByTimeOfDay(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/([a-zA-Z0-9\-]{2,99})\/missed-blocks\/history$': function apiV1StatusAZAZ09299MissedBlocksHistory$(req, res) {
      return function (args) {
        return _controllers2.default.Status.getMissedBlocksHistory(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/missed-blocks$': function apiV1StatusStatisticsChartsAZAZ09299MissedBlocks$(req, res) {
      return function (args) {
        return _controllers2.default.Statistics.getMissedBlocksChart(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/missed-blocks-alert$': function apiV1StatusStatisticsChartsAZAZ09299MissedBlocksAlert$(req, res) {
      return function (args) {
        return _controllers2.default.Statistics.getMissedBlocksAlertChart(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/peer-count$': function apiV1StatusStatisticsChartsAZAZ09299PeerCount$(req, res) {
      return function (args) {
        return _controllers2.default.Statistics.getPeerCountChart(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/late-block-time-alert$': function apiV1StatusStatisticsChartsAZAZ09299LateBlockTimeAlert$(req, res) {
      return function (args) {
        return _controllers2.default.Statistics.getLateBlockTimeAlertChart(req, res)(args);
      };
    },
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/block-heights$': function apiV1StatusStatisticsChartsAZAZ09299BlockHeights$(req, res) {
      return function (args) {
        return _controllers2.default.Statistics.getBlockHeightsChart(req, res)(args);
      };
    },
    // getMissedBlocksChart
    // fx: api/v/node-status/[project]/?network=b&region=c
    '^\/api\/v1\/node-status\/([a-zA-Z0-9\-]{2,99})$': function apiV1NodeStatusAZAZ09299$(req, res) {
      return function (args) {
        return _controllers2.default.Status.getNodeStatus(req, res)(args);
      };
    },
    '^\/api\/v1\/cluster$': function apiV1Cluster$(req, res) {
      return function (args) {
        return _controllers2.default.Cluster.get(req, res)(args);
      };
    },
    '^\/api\/v1\/twilio\/([a-zA-Z0-9\-]{2,99})$': function apiV1TwilioAZAZ09299$(req, res) {
      return function (args) {
        return _controllers2.default.Twilio.get(req, res)(args);
      };
    },
    '^\/api\/v1\/apm-muted-nodes\/list$': function apiV1ApmMutedNodesList$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.listNodes(req, res)(args);
      };
    },
    // fx: api/v1/apm/update?nodes=a,b,c
    '^\/api\/v1\/apm-muted-nodes\/update$': function apiV1ApmMutedNodesUpdate$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.updateNodes(req, res)(args);
      };
    },
    '^\/api\/v1\/threshold-settings$': function apiV1ThresholdSettings$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.getThresholdSettings(req, res)(args);
      };
    },
    '^\/api\/v1\/validator-addresses$': function apiV1ValidatorAddresses$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.getValidatorAddresses(req, res)(args);
      };
    },
    '^\/api\/v1\/terra/oracle/status$': function apiV1TerraOracleStatus$(req, res) {
      return function (args) {
        return _controllers2.default.Terra.getStatus(req, res)(args);
      };
    },
    '^\/api\/v1\/terra/oracle/health-checks$': function apiV1TerraOracleHealthChecks$(req, res) {
      return function (args) {
        return _controllers2.default.Terra.getHealthChecks(req, res)(args);
      };
    },
    '^\/api\/v1\/terra/oracle/misses-chart$': function apiV1TerraOracleMissesChart$(req, res) {
      return function (args) {
        return _controllers2.default.Terra.getMissesChart(req, res)(args);
      };
    },
    '^\/api\/v1\/terra/oracle/exchange-rate-charts$': function apiV1TerraOracleExchangeRateCharts$(req, res) {
      return function (args) {
        return _controllers2.default.Terra.getExchangeRateCharts(req, res)(args);
      };
    }
  },
  POST: {
    '^\/kv\/watch$': function kvWatch$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.watch(req, res)(args);
      };
    },
    '^\/slack\/command$': function slackCommand$(req, res) {
      return function (args) {
        return _controllers2.default.Slack.handle(req, res)(args);
      };
    },
    '^\/github\/webhook$': function githubWebhook$(req, res) {
      return function (args) {
        return _controllers2.default.Github.handle(req, res)(args);
      };
    },
    '^\/api\/v1\/twilio\/([a-zA-Z0-9\-]{2,99})$': function apiV1TwilioAZAZ09299$(req, res) {
      return function (args) {
        return _controllers2.default.Twilio.get(req, res)(args);
      };
    },
    '^\/api\/v1\/threshold-settings$': function apiV1ThresholdSettings$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.updateThresholdSettings(req, res)(args);
      };
    },
    '^\/api\/v1\/validator-addresses$': function apiV1ValidatorAddresses$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.updateValidatorAddress(req, res)(args);
      };
    },
    '^\/api\/v1\/deregister-validator-addresses$': function apiV1DeregisterValidatorAddresses$(req, res) {
      return function (args) {
        return _controllers2.default.KVStore.removeValidatorAddress(req, res)(args);
      };
    }
  }
};

exports.getRouteHandlers = getRouteHandlers;
/* eslint-enable */
//# sourceMappingURL=routes.js.map
