import Controllers from './controllers';

/* eslint-disable */
const getRouteHandlers = {
  GET: {
    '^\/api\/v1\/status$': (req, res) => args => Controllers.Status.get(req, res)(args),
    '^\/api\/v1\/status\/projects$': (req, res) => args => Controllers.Status.getAllProjects(req, res)(args),
    '^\/api\/v1\/status\/hosts$': (req, res) => args => Controllers.Status.getAllHosts(req, res)(args),
    '^\/api\/v1\/status\/([a-zA-Z0-9\-]{2,99})\/missed-blocks\/count$': (req, res) => args => Controllers.Status.getTotalMissedBlocks(req, res)(args),
    '^\/api\/v1\/status\/([a-zA-Z0-9\-]{2,99})\/missed-blocks\/by-time-of-day$': (req, res) => args => Controllers.Status.getMissedBlocksByTimeOfDay(req, res)(args),
    '^\/api\/v1\/status\/([a-zA-Z0-9\-]{2,99})\/missed-blocks\/history$': (req, res) => args => Controllers.Status.getMissedBlocksHistory(req, res)(args),
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/missed-blocks$': (req, res) => args => Controllers.Statistics.getMissedBlocksChart(req, res)(args),
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/missed-blocks-alert$': (req, res) => args => Controllers.Statistics.getMissedBlocksAlertChart(req, res)(args),
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/peer-count$': (req, res) => args => Controllers.Statistics.getPeerCountChart(req, res)(args),
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/late-block-time-alert$': (req, res) => args => Controllers.Statistics.getLateBlockTimeAlertChart(req, res)(args),
    '^\/api\/v1\/status\/statistics\/charts\/([a-zA-Z0-9\-]{2,99})\/block-heights$': (req, res) => args => Controllers.Statistics.getBlockHeightsChart(req, res)(args),
    // getMissedBlocksChart
    // fx: api/v/node-status/[project]/?network=b&region=c
    '^\/api\/v1\/node-status\/([a-zA-Z0-9\-]{2,99})$':
      (req, res) => args => Controllers.Status.getNodeStatus(req, res)(args),
    '^\/api\/v1\/cluster$': (req, res) => args => Controllers.Cluster.get(req, res)(args),
    '^\/api\/v1\/twilio\/([a-zA-Z0-9\-]{2,99})$': (req, res) => args => Controllers.Twilio.get(req, res)(args),
    '^\/api\/v1\/apm-muted-nodes\/list$': (req, res) => args => Controllers.KVStore.listNodes(req, res)(args),
    // fx: api/v1/apm/update?nodes=a,b,c
    '^\/api\/v1\/apm-muted-nodes\/update$': (req, res) => args => Controllers.KVStore.updateNodes(req, res)(args),
    '^\/api\/v1\/threshold-settings$': (req, res) => args => Controllers.KVStore.getThresholdSettings(req, res)(args),
    '^\/api\/v1\/validator-addresses$': (req, res) => args => Controllers.KVStore.getValidatorAddresses(req, res)(args),
    '^\/api\/v1\/terra/oracle/status$': (req, res) => args => Controllers.Terra.getStatus(req, res)(args),
    '^\/api\/v1\/terra/oracle/health-checks$': (req, res) => args => Controllers.Terra.getHealthChecks(req, res)(args),
    '^\/api\/v1\/terra/oracle/misses-chart$': (req, res) => args => Controllers.Terra.getMissesChart(req, res)(args),
    '^\/api\/v1\/terra/oracle/exchange-rate-charts$': (req, res) => args => Controllers.Terra.getExchangeRateCharts(req, res)(args),
  },
  POST: {
    '^\/kv\/watch$': (req, res) => args => Controllers.KVStore.watch(req, res)(args),
    '^\/slack\/command$': (req, res) => args => Controllers.Slack.handle(req, res)(args),
    '^\/github\/webhook$': (req, res) => args => Controllers.Github.handle(req, res)(args),
    '^\/api\/v1\/twilio\/([a-zA-Z0-9\-]{2,99})$': (req, res) => args => Controllers.Twilio.get(req, res)(args),
    '^\/api\/v1\/threshold-settings$': (req, res) => args => Controllers.KVStore.updateThresholdSettings(req, res)(args),
    '^\/api\/v1\/validator-addresses$': (req, res) => args => Controllers.KVStore.updateValidatorAddress(req, res)(args),
    '^\/api\/v1\/deregister-validator-addresses$': (req, res) => args => Controllers.KVStore.removeValidatorAddress(req, res)(args),
  },
};

export {
  getRouteHandlers,
};
/* eslint-enable */
