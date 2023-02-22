import pino from 'pino';
import fs from 'fs';
import path from 'path';
import Bluebird from 'bluebird';

import { Job as NomadJob, Client as NomadClient } from '../plugins/schedulers/nomad/index';
import { Mesh } from '../plugins/backends/consul/index';

Bluebird.promisifyAll(fs);

const logger = pino().child({ module: 'sync/index.js' });

const syncJob = (configDir, nomadClient) => async (fileName) => {
  logger.info(`Attempting to sync job file ${fileName}`);
  const nomadHCL = await fs.readFileAsync(path.join(configDir, fileName), 'utf-8');
  const job = await NomadJob.fromHCL(nomadClient)(nomadHCL);
  await job.sync(null, true);
  await job.getDetail();
  await job.getAllocations();
  return job;
};

const syncMesh = (nodeIP, consulPort) => async (job) => {
  //
  logger.info('Attempting to sync servics for job');
  const jobLayout = job.describe();
  const mesh = Mesh(nodeIP, consulPort)(jobLayout);
  await mesh.sync();
  return mesh;
};

const syncTasks = (argv) => async (fileName) => {
  const {
    config: configDir,
    node: nodeIP,
    nomadPort,
    consulPort,
  } = argv;
  const nomadClient = NomadClient(nodeIP, nomadPort, {});
  const job = await syncJob(configDir, nomadClient)(fileName);
  const mesh = await syncMesh(nodeIP, consulPort)(job);
  const health = await mesh.health();
  console.log(JSON.stringify(health, null, 2));
  logger.info('Completed all sync tasks');
};


const loadLocalConfig = async (argv) => {
  const {
    config: configDir,
  } = argv;
  const rawFileList = await fs.readdirAsync(configDir);
  const hclFileList = rawFileList.filter((f) => f.endsWith('.hcl'));
  if (hclFileList.length > 0) {
    const syncPartial = syncTasks(argv);
    const syncRes = await Promise.all(hclFileList.map(syncPartial));
    return syncRes;
  }
  return 0;
};

const sync = async (argv) => {
  const {
    config: configDir,
  } = argv;
  if (configDir !== 'github') {
    await loadLocalConfig(argv);
    return 1;
  }
  return 1;
};

export default sync;
