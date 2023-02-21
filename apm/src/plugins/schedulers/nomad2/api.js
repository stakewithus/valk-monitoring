import pino from 'pino';

import rawRequest from '../../../common/http_client';

const stripNewLine = (txt) => txt.replace(/(\r\n|\n|\r)/gm, '');
const logger = pino().child({ module: 'plugins/schedulers/nomad' });

const JobAPI = (reqPartial) => {
  const list = (async) => reqPartial('/v1/jobs', 'GET')({});

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

  return {
    list,
    parse,
    plan,
    read,
    create,
    update,
    allocations,
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

const Api = (nodeIP, nodePort, reqArgs = {}) => {
  const reqPartial = rawRequest(nodeIP, nodePort, reqArgs);
  return {
    job: { ...JobAPI(reqPartial) },
    node: { ...NodeAPI(reqPartial) },
  };
};


const parseJobDef = (jobDef) => {
  const {
    ID: jobId,
    TaskGroups: {
      0: taskGroup,
    },
  } = jobDef;
  const {
    //
    Name: taskGroupName,
    Affinities,
    // Constraints,
    Count: taskGroupCount,
    Tasks: {
      0: taskGroupTask,
    },
  } = taskGroup;
  if (Affinities === null) throw Error(`Affinities for Task Group ${taskGroupName} for Job ${jobId} is missing`);
  const regionAff = Affinities.reduce(
    (acc, aff) => {
      const {
        LTarget,
        Operand,
        RTarget,
        Weight,
      } = aff;
      if (LTarget !== '${meta.region}' || Operand !== 'set_contains_any') return acc; // eslint-disable-line
      if (Weight === 100) {
        const regions = RTarget.split(',');
        const { incl: curRegion } = acc;
        const newRegion = curRegion.concat(regions);
        return { ...acc, incl: newRegion };
      }
      if (Weight === -100) {
        const regions = RTarget.split(',');
        const { excl: curRegion } = acc;
        const newRegion = curRegion.concat(regions);
        return { ...acc, excl: newRegion };
      }
      return acc;
    },
    { incl: [], excl: [] },
  );
  const {
    Name: taskGroupTaskName,
    Meta: {
      'node-project-name': projectName,
      'node-project-category': projectCat,
      'node-project-network': projectNetwork,
    },
    Resources,
  } = taskGroupTask;
  const canonKey = `${jobId}-${taskGroupName}-${taskGroupTaskName}`;
  const {
    Networks: {
      0: {
        ReservedPorts,
      },
    },
  } = Resources;
  return {
    canonKey,
    desiredCount: taskGroupCount,
    desiredPorts: ReservedPorts,
    name: projectName,
    cat: projectCat,
    network: projectNetwork,
    region: regionAff,
  };
};

const parseJobTendermint = (jobLayout) => {
  const {
    desiredPorts,
    ...restJob
  } = jobLayout;
  const portNames = ['http_p2p', 'http_rpc', 'http_abci'];
  const projectPorts = desiredPorts.reduce((acc, row) => {
    const { Label, Value } = row;
    if (portNames.indexOf(Label) === -1) return acc;
    return { ...acc, [Label]: Value };
  }, {});
  return {
    ...restJob,
    ports: projectPorts,
  };
};

const Job = () => {

};

Job.parseHCL = (client) => async (hclDef) => {
  logger.debug('Parsing job from HCL');
  const hclNorm = stripNewLine(hclDef);
  const apiReply = await client.job.parse(`${hclNorm}`);
  return apiReply;
};

Job.layoutFromDef = (rawDef) => {
  const jobDef = parseJobDef(rawDef);
  const { cat } = jobDef;
  if (cat === 'tendermint') return parseJobTendermint(jobDef);
  return jobDef;
};

Job.layoutFromHCL = (client) => async (hclDef) => {
  const rawDef = await Job.parseHCL(hclDef);
  const jobDef = parseJobDef(rawDef);
  const { cat } = jobDef;
  if (cat === 'tendermint') return parseJobTendermint(jobDef);
  return jobDef;
};

const Scheduler = (nodeIP = '127.0.0.1', nodePort = 4646, reqArgs = {}) => {
  const api = Api(nodeIP, nodePort, reqArgs);
  const job = Job;
  return {
    Api: api,
    Job: job,
    stripNewLine,
  };
};

export default Scheduler;
