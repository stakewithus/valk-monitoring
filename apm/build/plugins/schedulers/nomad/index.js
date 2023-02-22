'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Client = exports.Job = undefined;

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

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

var Job = function Job(client) {
  return function (jobId, jobDef) {
    var allocations = [];
    var jobInfo = {};
    var layout = {};

    var procTaskGroup = function procTaskGroup(ID, nodeProject) {
      return function (taskGroup) {
        var Count = taskGroup.Count,
            firstCriteria = taskGroup.Constraints[0],
            taskGroupName = taskGroup.Name,
            _taskGroup$Tasks$ = taskGroup.Tasks[0],
            taskMeta = _taskGroup$Tasks$.Meta,
            taskName = _taskGroup$Tasks$.Name,
            _taskGroup$Tasks$$Res = _taskGroup$Tasks$.Resources,
            taskResCPU = _taskGroup$Tasks$$Res.CPU,
            taskResMB = _taskGroup$Tasks$$Res.MemoryMB,
            ReservedPorts = _taskGroup$Tasks$$Res.Networks[0].ReservedPorts;

        if (typeof firstCriteria === 'undefined') throw new Error('Missing the first constraint on region');
        // TODO Stronger check for criteria
        var RTarget = firstCriteria.RTarget;

        var desiredAvail = RTarget.split(',');
        var nodeProjectCategory = taskMeta['node-project-category'],
            nodeProjectName = taskMeta['node-project-name'];

        if (typeof nodeProjectCategory === 'undefined') throw new Error('Missing node-project-category in Job - TaskGroup - Task Meta');
        if (typeof nodeProjectName === 'undefined') throw new Error('Missing node-project-name in Job - TaskGroup - Task Meta');
        var reservedPorts = ReservedPorts.reduce(function (aac, portRow) {
          var Label = portRow.Label,
              Value = portRow.Value;

          return (0, _extends4.default)({}, aac, (0, _defineProperty3.default)({}, Label, Value));
        }, {});
        var canonKey = ID + '_' + taskGroupName + '_' + taskName;
        return {
          canonKey: canonKey,
          projectName: taskGroupName,
          desiredCount: Count,
          desiredAvail: desiredAvail,
          nodeProject: nodeProject,
          nodeProjectCategory: nodeProjectCategory,
          nodeResourceAlloc: {
            desiredCPU: taskResCPU,
            desiredMemory: taskResMB,
            desiredPorts: reservedPorts
          },
          allocations: []
        };
      };
    };

    var procJobInfo = function procJobInfo() {
      var _jobInfo = jobInfo,
          ID = _jobInfo.ID,
          Meta = _jobInfo.Meta,
          TaskGroups = _jobInfo.TaskGroups;
      var nodeProject = Meta['node-project'];

      if (typeof nodeProject === 'undefined') throw new Error('Missing node-project in Job Meta');
      if (nodeProject !== 'blockchain-client') throw new Error('Job Meta node-project [' + nodeProject + '] is not blockchain-client');
      layout = TaskGroups.map(procTaskGroup(ID, nodeProject));
    };

    var updateLayout = function updateLayout(newAlloc) {
      layout = layout.reduce(function (acc, grpRow) {
        var canonKey = grpRow.canonKey;

        var matchedAlloc = newAlloc.filter(function (alloc) {
          return alloc.canonKey === canonKey;
        });
        if (matchedAlloc === null) return acc.concat(grpRow);
        var saveAlloc = matchedAlloc.map(function (_ref) {
          var cKey = _ref.canonKey,
              allocDet = (0, _objectWithoutProperties3.default)(_ref, ['canonKey']);
          return allocDet;
        }, []);
        return acc.concat((0, _extends4.default)({}, grpRow, {
          allocations: saveAlloc
        }));
      }, []);
    };

    var getDetail = async function getDetail() {
      jobInfo = await client.job.read(jobId);
      procJobInfo();
      return jobInfo;
    };

    var sync = async function sync(newJobHCL) {
      var updateNow = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      logger.info('Starting sync...');
      // Check if jobId exists,if not we create it.
      try {
        jobInfo = await client.job.read(jobId);
      } catch (except) {
        if (except.statusCode !== 404) throw except;
      }
      var isExist = (0, _keys2.default)(jobInfo).length > 0;
      //
      if (!isExist) {
        // Create It
        logger.info('Creating new Job...');
        await client.job.create(jobId, jobDef, {});
        return false;
      }
      var planDetails = {};
      if (typeof newJobHCL === 'undefined' || newJobHCL === null) {
        logger.info('Updating Job from initial definition');
        planDetails = await client.job.plan(jobId, jobDef, { diff: true });
        if (updateNow === false) return planDetails;
        await client.job.update(jobId, jobDef, {});
        jobInfo = await getDetail();
        return jobInfo;
      }
      logger.info('Updating Job...');
      var newJobDef = await Job.parseHCL(client)(newJobHCL);
      planDetails = await client.job.plan(jobId, newJobDef, { diff: true });
      if (updateNow === false) return planDetails;
      var _planDetails = planDetails,
          jobModifyIndex = _planDetails.JobModifyIndex;

      await client.job.update(jobId, newJobDef, { enforceIndex: true, jobModifyIndex: jobModifyIndex });
      jobInfo = await getDetail();
      return jobInfo;
    };

    var parseNodeAllocation = function parseNodeAllocation(allocIDList) {
      return function (acc, allocRow) {
        var ID = allocRow.ID;

        if (allocIDList.indexOf(ID) === -1) return acc;
        var _allocRow$Job = allocRow.Job,
            jobName = _allocRow$Job.ID,
            _allocRow$Job$TaskGro = _allocRow$Job.TaskGroups[0],
            taskGroupName = _allocRow$Job$TaskGro.Name,
            taskName = _allocRow$Job$TaskGro.Tasks[0].Name;

        var canonKey = jobName + '_' + taskGroupName + '_' + taskName;

        return acc.concat({
          allocID: ID,
          canonKey: canonKey
        });
      };
    };

    var queryNode = function queryNode(allocIDList) {
      return async function (nodeInfo) {
        var nodeAddress = nodeInfo.Address,
            nodeId = nodeInfo.ID,
            nodeName = nodeInfo.Name;
        // Read Single Node

        var singleNodeInfo = await client.node.read(nodeId);
        var metaRegion = singleNodeInfo.Meta.region;
        // Read Allocations

        var singleNodeAlloc = await client.node.allocations(nodeId);
        var combinedNodeAlloc = singleNodeAlloc.reduce(parseNodeAllocation(allocIDList), []).map(function (n) {
          return (0, _extends4.default)({}, n, {
            nodeId: nodeId,
            address: nodeAddress,
            name: nodeName,
            metaRegion: metaRegion
          });
        });
        return combinedNodeAlloc;
      };
    };

    var getAllocations = async function getAllocations() {
      var rawNodeInfo = await client.job.allocations(jobId);
      // Get a breakdown summary of target allocations
      var jobAllocInfo = rawNodeInfo.reduce(function (acc, nodeInfo) {
        var allocJobId = nodeInfo.JobID,
            allocClientStatus = nodeInfo.ClientStatus,
            allocId = nodeInfo.ID,
            allocNodeId = nodeInfo.NodeID;

        if (allocClientStatus !== 'running' || allocJobId !== jobId) return acc;
        return acc.concat([{ allocId: allocId, allocJobId: allocJobId, allocNodeId: allocNodeId }]);
      }, []);
      // Get all Nodes
      var nodeAllocFilter = jobAllocInfo.reduce(function (acc, allocInfo) {
        return acc.concat([allocInfo.allocNodeId]);
      }, []);
      var allocIDList = jobAllocInfo.reduce(function (acc, allocInfo) {
        return acc.concat([allocInfo.allocId]);
      }, []);
      var rawAllNodes = await client.node.list();
      var filteredNodes = rawAllNodes.filter(function (n) {
        return nodeAllocFilter.indexOf(n.ID) > -1;
      });
      // Read all Nodes Allocation
      var combinedNodes = await _promise2.default.all(filteredNodes.map(queryNode(allocIDList)));
      allocations = combinedNodes.reduce(function (acc, node) {
        return acc.concat(node);
      }, []);
      // Update Layout
      updateLayout(allocations);
      return allocations;
    };

    var describe = function describe() {
      return layout;
    };

    return {
      sync: sync,
      getDetail: getDetail,
      getAllocations: getAllocations,
      describe: describe
    };
  };
};

Job.parseHCL = function (client) {
  return async function (hclDef) {
    var hclNorm = stripNewLine(hclDef);
    var apiReply = await client.job.parse('' + hclNorm);
    return apiReply;
  };
};

Job.fromHCL = function (client) {
  return async function (hclDef) {
    console.log('Create job from HCL');
    var apiReply = await Job.parseHCL(client)(hclDef);
    var loadJobId = apiReply.ID;

    console.log('Returning new job from HCL...');
    return Job(client)(loadJobId, apiReply);
  };
};

var JobAPI = function JobAPI(reqPartial) {
  var parse = async function parse(jobHCL) {
    var canonicalize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return reqPartial('/v1/jobs/parse', 'POST')({
      body: {
        JobHCL: jobHCL,
        Canonicalize: canonicalize
      }
    });
  };

  var plan = async function plan(jobId, jobDef, _ref2) {
    var _ref2$diff = _ref2.diff,
        diff = _ref2$diff === undefined ? true : _ref2$diff,
        _ref2$policyOverride = _ref2.policyOverride,
        policyOverride = _ref2$policyOverride === undefined ? false : _ref2$policyOverride;
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

  var create = async function create(jobId, jobDef, _ref3) {
    var _ref3$enforceIndex = _ref3.enforceIndex,
        enforceIndex = _ref3$enforceIndex === undefined ? false : _ref3$enforceIndex,
        _ref3$jobModifyIndex = _ref3.jobModifyIndex,
        jobModifyIndex = _ref3$jobModifyIndex === undefined ? 0 : _ref3$jobModifyIndex,
        _ref3$policyOverride = _ref3.policyOverride,
        policyOverride = _ref3$policyOverride === undefined ? false : _ref3$policyOverride;
    return reqPartial('/v1/jobs', 'POST')({
      body: {
        Job: jobDef,
        EnforceIndex: enforceIndex,
        JobModifyIndex: jobModifyIndex,
        PolicyOverride: policyOverride
      }
    });
  };

  var update = async function update(jobId, jobDef, _ref4) {
    var _ref4$enforceIndex = _ref4.enforceIndex,
        enforceIndex = _ref4$enforceIndex === undefined ? false : _ref4$enforceIndex,
        _ref4$jobModifyIndex = _ref4.jobModifyIndex,
        jobModifyIndex = _ref4$jobModifyIndex === undefined ? 0 : _ref4$jobModifyIndex,
        _ref4$policyOverride = _ref4.policyOverride,
        policyOverride = _ref4$policyOverride === undefined ? false : _ref4$policyOverride;
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

  var allocationsByNode = async function allocationsByNode(nodeId) {
    return reqPartial('/v1/node/' + nodeId + '/allocations', 'GET')({});
  };

  var listNode = function listNode(async) {
    return reqPartial('/v1/nodes', 'GET')({});
  };

  var readNode = async function readNode(nodeId) {
    return reqPartial('/v1/node/' + nodeId, 'GET')({});
  };

  return {
    parse: parse,
    plan: plan,
    read: read,
    create: create,
    update: update,
    allocations: allocations,
    allocationsByNode: allocationsByNode,
    listNode: listNode,
    readNode: readNode
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

var Client = function Client(nodeIP, nodePort) {
  var reqArgs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var reqPartial = (0, _http_client2.default)(nodeIP, nodePort, reqArgs);
  return {
    job: (0, _extends4.default)({}, JobAPI(reqPartial)),
    node: (0, _extends4.default)({}, NodeAPI(reqPartial))
  };
};

exports.Job = Job;
exports.Client = Client;
//# sourceMappingURL=index.js.map
