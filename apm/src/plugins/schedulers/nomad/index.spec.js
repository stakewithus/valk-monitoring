import { assert } from 'chai';
import fs from 'fs';
import path from 'path';
import Bluebird from 'bluebird';
import { Job, Client } from './index';

Bluebird.promisifyAll(fs);

const nomadClient = Client('127.0.0.1', 4646, {});

describe('# Nomad Scheduler Plugin', () => {
  let job = {};
  describe('# Job Parsing, Configuration, Creating', () => {
    it('should parse job.hcl file into JSON', (done) => {
      const readAndParseJob = async () => {
        const nomadHCL = await fs.readFileAsync(path.join(__dirname, 'fixtures', 'socat.hcl'), 'utf-8');
        await Job.fromHCL(nomadClient)(nomadHCL);
      };
      readAndParseJob().then((result) => {
        done();
      }).catch(done);
    }); // End of IT
  }); // End of Describe
  describe('# Job Sync', () => {
    it('should create new Job if it does not exist', (done) => {
      const syncAndCreateJob = async () => {
        const nomadHCL = await fs.readFileAsync(path.join(__dirname, 'fixtures', 'socat.hcl'), 'utf-8');
        job = await Job.fromHCL(nomadClient)(nomadHCL);
        // Sync
        await job.sync();
        const jobInfo = await job.getDetail();
        return jobInfo;
      };
      syncAndCreateJob().then((result) => {
        // console.log(JSON.stringify(result, null, 2));
        assert.equal(result.ID, 'blockchain-client');
        done();
      }).catch(done);
    }); // End of IT
    it('should produce a job plan if it does exist with diff changes', (done) => {
      const planJob = async () => {
        const nomadHCL = await fs.readFileAsync(path.join(__dirname, 'fixtures', 'socat-new.hcl'), 'utf-8');
        // Sync
        const planDetail = await job.sync(nomadHCL);
        return planDetail;
      };
      planJob().then((result) => {
        // console.log(JSON.stringify(result, null, 2));
        assert.equal(result.Diff.Type, 'Edited');
        done();
      }).catch(done);
    }); // End of IT
    it('should update the job if sync is set to final', (done) => {
      const updateJob = async () => {
        const nomadHCL = await fs.readFileAsync(path.join(__dirname, 'fixtures', 'socat-new.hcl'), 'utf-8');
        // Sync
        const newJobInfo = await job.sync(nomadHCL, true);
        return newJobInfo;
      };
      updateJob().then((result) => {
        // console.log(JSON.stringify(result, null, 2));
        assert.equal(result.ID, 'blockchain-client');
        done();
      }).catch(done);
    }); // End of IT
  }); // End of Describe
  describe('# Job Status, Node Allocation', () => {
    it('should get and set the job\'s node allocations', (done) => {
      const checkJob = async () => {
        const nodeAllocationInfo = await job.getAllocations();
        return nodeAllocationInfo;
      };
      checkJob().then((result) => {
        // console.log(JSON.stringify(result, null, 2));
        console.log('finalNodes');
        console.log(JSON.stringify(result, null, 2));
        done();
      }).catch(done);
    }); // End of IT
  }); // End of Describe
});
