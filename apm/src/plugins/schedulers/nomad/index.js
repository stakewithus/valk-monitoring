import pino from 'pino';

import rawRequest from '../../../common/http_client';

const stripNewLine = (txt) => txt.replace(/(\r\n|\n|\r)/gm, '');
const logger = pino().child({ module: 'plugins/schedulers/nomad' });

const Job = (client) => (jobId, jobDef) => {
  let allocations = [];
  let jobInfo = {};
  let layout = {};

  const procTaskGroup = (ID, nodeProject) => (taskGroup) => {
    const {
      Count,
      Constraints: {
        0: firstCriteria,
      },
      Name: taskGroupName,
      Tasks: {
        0: {
          Meta: taskMeta,
          Name: taskName,
          Resources: {
            CPU: taskResCPU,
            MemoryMB: taskResMB,
            Networks: {
              0: {
                ReservedPorts,
              },
            },
          },
        },
      },
    } = taskGroup;
    if (typeof firstCriteria === 'undefined') throw new Error('Missing the first constraint on region');
    // TODO Stronger check for criteria
    const {
      RTarget,
    } = firstCriteria;
    const desiredAvail = RTarget.split(',');
    const {
      'node-project-category': nodeProjectCategory,
      'node-project-name': nodeProjectName,
    } = taskMeta;
    if (typeof nodeProjectCategory === 'undefined') throw new Error('Missing node-project-category in Job - TaskGroup - Task Meta');
    if (typeof nodeProjectName === 'undefined') throw new Error('Missing node-project-name in Job - TaskGroup - Task Meta');
    const reservedPorts = ReservedPorts.reduce((aac, portRow) => {
      const { Label, Value } = portRow;
      return { ...aac, [Label]: Value };
    }, {});
    const canonKey = `${ID}_${taskGroupName}_${taskName}`;
    return {
      canonKey,
      projectName: taskGroupName,
      desiredCount: Count,
      desiredAvail,
      nodeProject,
      nodeProjectCategory,
      nodeResourceAlloc: {
        desiredCPU: taskResCPU,
        desiredMemory: taskResMB,
        desiredPorts: reservedPorts,
      },
      allocations: [],
    };
  };

  const procJobInfo = () => {
    const {
      ID,
      Meta,
      TaskGroups,
    } = jobInfo;
    const { 'node-project': nodeProject } = Meta;
    if (typeof nodeProject === 'undefined') throw new Error('Missing node-project in Job Meta');
    if (nodeProject !== 'blockchain-client') throw new Error(`Job Meta node-project [${nodeProject}] is not blockchain-client`);
    layout = TaskGroups.map(procTaskGroup(ID, nodeProject));
  };

  const updateLayout = (newAlloc) => {
    layout = layout.reduce((acc, grpRow) => {
      const { canonKey } = grpRow;
      const matchedAlloc = newAlloc.filter((alloc) => alloc.canonKey === canonKey);
      if (matchedAlloc === null) return acc.concat(grpRow);
      const saveAlloc = matchedAlloc.map(({ canonKey: cKey, ...allocDet }) => allocDet, []);
      return acc.concat({
        ...grpRow,
        allocations: saveAlloc,
      });
    }, []);
  };

  const getDetail = async () => {
    jobInfo = await client.job.read(jobId);
    procJobInfo();
    return jobInfo;
  };

  const sync = async (newJobHCL, updateNow = false) => {
    logger.info('Starting sync...');
    // Check if jobId exists,if not we create it.
    try {
      jobInfo = await client.job.read(jobId);
    } catch (except) {
      if (except.statusCode !== 404) throw except;
    }
    const isExist = Object.keys(jobInfo).length > 0;
    //
    if (!isExist) {
      // Create It
      logger.info('Creating new Job...');
      await client.job.create(jobId, jobDef, {});
      return false;
    }
    let planDetails = {};
    if (typeof newJobHCL === 'undefined' || newJobHCL === null) {
      logger.info('Updating Job from initial definition');
      planDetails = await client.job.plan(jobId, jobDef, { diff: true });
      if (updateNow === false) return planDetails;
      await client.job.update(jobId, jobDef, {});
      jobInfo = await getDetail();
      return jobInfo;
    }
    logger.info('Updating Job...');
    const newJobDef = await Job.parseHCL(client)(newJobHCL);
    planDetails = await client.job.plan(jobId, newJobDef, { diff: true });
    if (updateNow === false) return planDetails;
    const { JobModifyIndex: jobModifyIndex } = planDetails;
    await client.job.update(jobId, newJobDef, { enforceIndex: true, jobModifyIndex });
    jobInfo = await getDetail();
    return jobInfo;
  };

  const parseNodeAllocation = (allocIDList) => (acc, allocRow) => {
    const { ID } = allocRow;
    if (allocIDList.indexOf(ID) === -1) return acc;
    const {
      Job: {
        ID: jobName,
        TaskGroups: {
          0: {
            Name: taskGroupName,
            Tasks: {
              0: {
                Name: taskName,
              },
            },
          },
        },
      },
    } = allocRow;
    const canonKey = `${jobName}_${taskGroupName}_${taskName}`;

    return acc.concat({
      allocID: ID,
      canonKey,
    });
  };

  const queryNode = (allocIDList) => async (nodeInfo) => {
    const {
      Address: nodeAddress,
      ID: nodeId,
      Name: nodeName,
    } = nodeInfo;
    // Read Single Node
    const singleNodeInfo = await client.node.read(nodeId);
    const {
      Meta: {
        region: metaRegion,
      },
    } = singleNodeInfo;
    // Read Allocations
    const singleNodeAlloc = await client.node.allocations(nodeId);
    const combinedNodeAlloc = singleNodeAlloc.reduce(parseNodeAllocation(allocIDList), [])
      .map((n) => ({
        ...n,
        nodeId,
        address: nodeAddress,
        name: nodeName,
        metaRegion,
      }));
    return combinedNodeAlloc;
  };

  const getAllocations = async () => {
    const rawNodeInfo = await client.job.allocations(jobId);
    // Get a breakdown summary of target allocations
    const jobAllocInfo = rawNodeInfo.reduce((acc, nodeInfo) => {
      const {
        JobID: allocJobId,
        ClientStatus: allocClientStatus,
        ID: allocId,
        NodeID: allocNodeId,
      } = nodeInfo;
      if (allocClientStatus !== 'running' || allocJobId !== jobId) return acc;
      return acc.concat([{ allocId, allocJobId, allocNodeId }]);
    }, []);
    // Get all Nodes
    const nodeAllocFilter = jobAllocInfo.reduce(
      (acc, allocInfo) => acc.concat([allocInfo.allocNodeId]),
      [],
    );
    const allocIDList = jobAllocInfo.reduce(
      (acc, allocInfo) => acc.concat([allocInfo.allocId]),
      [],
    );
    const rawAllNodes = await client.node.list();
    const filteredNodes = rawAllNodes.filter((n) => nodeAllocFilter.indexOf(n.ID) > -1);
    // Read all Nodes Allocation
    const combinedNodes = await Promise.all(filteredNodes.map(queryNode(allocIDList)));
    allocations = combinedNodes.reduce((acc, node) => acc.concat(node), []);
    // Update Layout
    updateLayout(allocations);
    return allocations;
  };

  const describe = () => layout;

  return {
    sync,
    getDetail,
    getAllocations,
    describe,
  };
};

Job.parseHCL = (client) => async (hclDef) => {
  const hclNorm = stripNewLine(hclDef);
  const apiReply = await client.job.parse(`${hclNorm}`);
  return apiReply;
};

Job.fromHCL = (client) => async (hclDef) => {
  console.log('Create job from HCL');
  const apiReply = await Job.parseHCL(client)(hclDef);
  const { ID: loadJobId } = apiReply;
  console.log('Returning new job from HCL...');
  return Job(client)(loadJobId, apiReply);
};

const JobAPI = (reqPartial) => {
  const parse = async (jobHCL, canonicalize = false) => reqPartial('/v1/jobs/parse', 'POST')({
    body: {
      JobHCL: jobHCL,
      Canonicalize: canonicalize,
    },
  });

  const plan = async (jobId, jobDef, { diff = true, policyOverride = false }) => reqPartial(`/v1/job/${jobId}/plan`, 'POST')({
    body: {
      Job: jobDef,
      Diff: diff,
      PolicyOverride: policyOverride,
    },
  });

  const read = async (jobId) => reqPartial(`/v1/job/${jobId}`, 'GET')({});

  const create = async (
    jobId,
    jobDef,
    {
      enforceIndex = false,
      jobModifyIndex = 0,
      policyOverride = false,
    }) => reqPartial('/v1/jobs', 'POST')({
    body: {
      Job: jobDef,
      EnforceIndex: enforceIndex,
      JobModifyIndex: jobModifyIndex,
      PolicyOverride: policyOverride,
    },
  });

  const update = async (
    jobId,
    jobDef,
    {
      enforceIndex = false,
      jobModifyIndex = 0,
      policyOverride = false,
    }) => reqPartial(`/v1/job/${jobId}`, 'POST')({
    body: {
      Job: jobDef,
      EnforceIndex: enforceIndex,
      JobModifyIndex: jobModifyIndex,
      PolicyOverride: policyOverride,
    },
  });

  const allocations = async (jobId) => reqPartial(`/v1/job/${jobId}/allocations`, 'GET')({});

  const allocationsByNode = async (nodeId) => reqPartial(`/v1/node/${nodeId}/allocations`, 'GET')({});

  const listNode = (async) => reqPartial('/v1/nodes', 'GET')({});

  const readNode = async (nodeId) => reqPartial(`/v1/node/${nodeId}`, 'GET')({});

  return {
    parse,
    plan,
    read,
    create,
    update,
    allocations,
    allocationsByNode,
    listNode,
    readNode,
  };
};

const NodeAPI = (reqPartial) => {
  const allocations = async (nodeId) => reqPartial(`/v1/node/${nodeId}/allocations`, 'GET')({});

  const list = (async) => reqPartial('/v1/nodes', 'GET')({});

  const read = async (nodeId) => reqPartial(`/v1/node/${nodeId}`, 'GET')({});

  return {
    allocations,
    list,
    read,
  };
};

const Client = (nodeIP, nodePort, reqArgs = {}) => {
  const reqPartial = rawRequest(nodeIP, nodePort, reqArgs);
  return {
    job: { ...JobAPI(reqPartial) },
    node: { ...NodeAPI(reqPartial) },
  };
};

export {
  Job,
  Client,
};
