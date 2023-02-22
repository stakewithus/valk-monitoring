import fs from 'fs';
import path from 'path';
import Bluebird from 'bluebird';
import { Job, Client as NomadClient } from '../../schedulers/nomad/index';
import { Mesh } from './index';

Bluebird.promisifyAll(fs);

const nomadClient = NomadClient('127.0.0.1', 4646, {});
// const consulClient = Client('127.0.0.1', 8500, {});

describe('# Consul Backend Plugin', () => {
  let jobLayout = {};
  describe('# Register Node Health System', () => {
    before((done) => {
      const syncAndCreateJob = async () => {
        const nomadHCL = await fs.readFileAsync(path.join(__dirname, '../../schedulers/nomad/fixtures', 'socat-new.hcl'), 'utf-8');
        const job = await Job.fromHCL(nomadClient)(nomadHCL);
        // Sync
        await job.sync();
        await job.getDetail();
        // Node Allocation Info
        await job.getAllocations();
        return job;
      };
      syncAndCreateJob().then((result) => {
        // console.log(JSON.stringify(result, null, 2));
        console.log('Nomad Describe');
        jobLayout = result.describe();
        console.log(JSON.stringify(jobLayout, null, 2));
        done();
      }).catch(done);
    });
    it('should register the health system', (done) => {
      const initMesh = async () => {
        const mesh = Mesh('127.0.0.1')(jobLayout);
        await mesh.sync();
      };
      initMesh().then((res) => {
        done();
      }).catch(done);
    });
    it('should register the health system', (done) => {
      const initMesh = async () => {
        const mesh = Mesh('127.0.0.1')(jobLayout);
        await mesh.sync();
        const health = await mesh.health();
        console.log(JSON.stringify(health, null, 2));
      };
      initMesh().then((res) => {
        done();
      }).catch(done);
    });
  });
});
