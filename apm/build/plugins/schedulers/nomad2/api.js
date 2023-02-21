'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _extends3 = require('babel-runtime/helpers/extends');

var _extends4 = _interopRequireDefault(_extends3);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _http_client = require('../../../common/http_client');

var _http_client2 = _interopRequireDefault(_http_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var stripNewLine = function stripNewLine(txt) {
  return txt.replace(/(\r\n|\n|\r)/gm, '');
};
var logger = (0, _pino2.default)().child({ module: 'plugins/schedulers/nomad' });

var JobAPI = function JobAPI(reqPartial) {
  var list = function list(async) {
    return reqPartial('/v1/jobs', 'GET')({});
  };

  var parse = async function parse(jobHCL) {
    var canonicalize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return reqPartial('/v1/jobs/parse', 'POST')({
      body: {
        JobHCL: jobHCL,
        Canonicalize: canonicalize
      }
    });
  };

  var plan = async function plan(jobId, jobDef, _ref) {
    var _ref$diff = _ref.diff,
        diff = _ref$diff === undefined ? true : _ref$diff,
        _ref$policyOverride = _ref.policyOverride,
        policyOverride = _ref$policyOverride === undefined ? false : _ref$policyOverride;
    return reqPartial('/v1/job/' + jobId + '/plan', 'POST')({
      body: {
        Job: jobDef,
        Diff: diff,
        PolicyOverride: policyOverride
      }
    });
  };

  var read = async function read(jobId) {
    return reqPartial('/v1/job/' + jobId, 'GET')({});
  };

  var create = async function create(jobId, jobDef, _ref2) {
    var _ref2$enforceIndex = _ref2.enforceIndex,
        enforceIndex = _ref2$enforceIndex === undefined ? false : _ref2$enforceIndex,
        _ref2$jobModifyIndex = _ref2.jobModifyIndex,
        jobModifyIndex = _ref2$jobModifyIndex === undefined ? 0 : _ref2$jobModifyIndex,
        _ref2$policyOverride = _ref2.policyOverride,
        policyOverride = _ref2$policyOverride === undefined ? false : _ref2$policyOverride;
    return reqPartial('/v1/jobs', 'POST')({
      body: {
        Job: jobDef,
        EnforceIndex: enforceIndex,
        JobModifyIndex: jobModifyIndex,
        PolicyOverride: policyOverride
      }
    });
  };

  var update = async function update(jobId, jobDef, _ref3) {
    var _ref3$enforceIndex = _ref3.enforceIndex,
        enforceIndex = _ref3$enforceIndex === undefined ? false : _ref3$enforceIndex,
        _ref3$jobModifyIndex = _ref3.jobModifyIndex,
        jobModifyIndex = _ref3$jobModifyIndex === undefined ? 0 : _ref3$jobModifyIndex,
        _ref3$policyOverride = _ref3.policyOverride,
        policyOverride = _ref3$policyOverride === undefined ? false : _ref3$policyOverride;
    return reqPartial('/v1/job/' + jobId, 'POST')({
      body: {
        Job: jobDef,
        EnforceIndex: enforceIndex,
        JobModifyIndex: jobModifyIndex,
        PolicyOverride: policyOverride
      }
    });
  };

  var allocations = async function allocations(jobId) {
    return reqPartial('/v1/job/' + jobId + '/allocations', 'GET')({});
  };

  return {
    list: list,
    parse: parse,
    plan: plan,
    read: read,
    create: create,
    update: update,
    allocations: allocations
  };
};

var NodeAPI = function NodeAPI(reqPartial) {
  var allocations = async function allocations(nodeId) {
    return reqPartial('/v1/node/' + nodeId + '/allocations', 'GET')({});
  };

  var list = function list(async) {
    return reqPartial('/v1/nodes', 'GET')({});
  };

  var read = async function read(nodeId) {
    return reqPartial('/v1/node/' + nodeId, 'GET')({});
  };

  return {
    allocations: allocations,
    list: list,
    read: read
  };
};

var Api = function Api(nodeIP, nodePort) {
  var reqArgs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var reqPartial = (0, _http_client2.default)(nodeIP, nodePort, reqArgs);
  return {
    job: (0, _extends4.default)({}, JobAPI(reqPartial)),
    node: (0, _extends4.default)({}, NodeAPI(reqPartial))
  };
};

var parseJobDef = function parseJobDef(jobDef) {
  var jobId = jobDef.ID,
      taskGroup = jobDef.TaskGroups[0];
  var taskGroupName = taskGroup.Name,
      Affinities = taskGroup.Affinities,
      taskGroupCount = taskGroup.Count,
      taskGroupTask = taskGroup.Tasks[0];

  if (Affinities === null) throw Error('Affinities for Task Group ' + taskGroupName + ' for Job ' + jobId + ' is missing');
  var regionAff = Affinities.reduce(function (acc, aff) {
    var LTarget = aff.LTarget,
        Operand = aff.Operand,
        RTarget = aff.RTarget,
        Weight = aff.Weight;

    if (LTarget !== '${meta.region}' || Operand !== 'set_contains_any') return acc; // eslint-disable-line
    if (Weight === 100) {
      var regions = RTarget.split(',');
      var curRegion = acc.incl;

      var newRegion = curRegion.concat(regions);
      return (0, _extends4.default)({}, acc, { incl: newRegion });
    }
    if (Weight === -100) {
      var _regions = RTarget.split(',');
      var _curRegion = acc.excl;

      var _newRegion = _curRegion.concat(_regions);
      return (0, _extends4.default)({}, acc, { excl: _newRegion });
    }
    return acc;
  }, { incl: [], excl: [] });
  var taskGroupTaskName = taskGroupTask.Name,
      _taskGroupTask$Meta = taskGroupTask.Meta,
      projectName = _taskGroupTask$Meta['node-project-name'],
      projectCat = _taskGroupTask$Meta['node-project-category'],
      projectNetwork = _taskGroupTask$Meta['node-project-network'],
      Resources = taskGroupTask.Resources;

  var canonKey = jobId + '-' + taskGroupName + '-' + taskGroupTaskName;
  var ReservedPorts = Resources.Networks[0].ReservedPorts;

  return {
    canonKey: canonKey,
    desiredCount: taskGroupCount,
    desiredPorts: ReservedPorts,
    name: projectName,
    cat: projectCat,
    network: projectNetwork,
    region: regionAff
  };
};

var parseJobTendermint = function parseJobTendermint(jobLayout) {
  var desiredPorts = jobLayout.desiredPorts,
      restJob = (0, _objectWithoutProperties3.default)(jobLayout, ['desiredPorts']);

  var portNames = ['http_p2p', 'http_rpc', 'http_abci'];
  var projectPorts = desiredPorts.reduce(function (acc, row) {
    var Label = row.Label,
        Value = row.Value;

    if (portNames.indexOf(Label) === -1) return acc;
    return (0, _extends4.default)({}, acc, (0, _defineProperty3.default)({}, Label, Value));
  }, {});
  return (0, _extends4.default)({}, restJob, {
    ports: projectPorts
  });
};

var Job = function Job() {};

Job.parseHCL = function (client) {
  return async function (hclDef) {
    logger.debug('Parsing job from HCL');
    var hclNorm = stripNewLine(hclDef);
    var apiReply = await client.job.parse('' + hclNorm);
    return apiReply;
  };
};

Job.layoutFromDef = function (rawDef) {
  var jobDef = parseJobDef(rawDef);
  var cat = jobDef.cat;

  if (cat === 'tendermint') return parseJobTendermint(jobDef);
  return jobDef;
};

Job.layoutFromHCL = function (client) {
  return async function (hclDef) {
    var rawDef = await Job.parseHCL(hclDef);
    var jobDef = parseJobDef(rawDef);
    var cat = jobDef.cat;

    if (cat === 'tendermint') return parseJobTendermint(jobDef);
    return jobDef;
  };
};

var Scheduler = function Scheduler() {
  var nodeIP = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '127.0.0.1';
  var nodePort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 4646;
  var reqArgs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var api = Api(nodeIP, nodePort, reqArgs);
  var job = Job;
  return {
    Api: api,
    Job: job,
    stripNewLine: stripNewLine
  };
};

exports.default = Scheduler;
//# sourceMappingURL=api.js.map
