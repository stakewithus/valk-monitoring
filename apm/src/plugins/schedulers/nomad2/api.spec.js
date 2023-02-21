import { assert } from 'chai';
import path from 'path';
import fs from 'fs';
import Bluebird from 'bluebird';
import Scheduler from './api';
import NockNomadAPI from './nocks/api';

Bluebird.promisifyAll(fs);

describe('Nomad Scheduler Tests', () => {
  const scheduler = Scheduler();
  describe('# Nomad API', () => {
    before(async () => {
      await NockNomadAPI('127.0.0.1', 4646);
    });
    const api = scheduler.Api;
    // const nodeID = 'de888c16-29b1-4d35-221e-332b5b9097f4';
    const nodeID = '7314889b-0aeb-00e1-8b67-98de3ef8e4db';
    describe('## Nodes', () => {
      it('should list all nodes', async () => {
        const res = await api.node.list();
        assert.equal(res.length, 1);
        const { 0: { ID } } = res;
        // assert.equal(ID, nodeID);
        assert.equal(ID, '7314889b-0aeb-00e1-8b67-98de3ef8e4db');
      });

      it('should read a single node', async () => {
        const res = await api.node.read(nodeID);
        assert.equal(res.ID, nodeID);
        assert.equal(res.Datacenter, 'dc1');
        assert.equal(res.Meta.region, 'ap-southeast-1');
        assert.equal(res.Meta.chain_role, 'sentry');
      });

      it('should throw if nodeID is not found for read', async () => {
        // TODO should throw if node is not found
        const missingNode = 'de888c16-29b1-4d35-221e-332b5b9097f4';
        try {
          await api.node.read(missingNode);
        } catch (e) {
          assert.equal(e.statusCode, 404);
        }
      });

      it('should get a single node\'s allocations', async () => {
        // TODO should throw if node is not found
        const res = await api.node.allocations(nodeID);
        assert.equal(res.length, 0);
      });
    });
    describe('## Jobs', () => {
      let normHCL1 = '';
      let normHCL2 = '';
      before(async () => {
        //
        const rawHCL1 = await fs.readFileAsync(path.join(__dirname, 'fixtures', 'blockchain-client.hcl'), 'utf-8');
        normHCL1 = scheduler.stripNewLine(rawHCL1);
        const rawHCL2 = await fs.readFileAsync(path.join(__dirname, 'fixtures', 'blockchain-client-new.hcl'), 'utf-8');
        normHCL2 = scheduler.stripNewLine(rawHCL2);
      });
      it('should list all jobs #1', async () => {
        const res = await api.job.list();
        assert.equal(res.length, 0);
      });

      it('should parse a single job', async () => {
        const res = await api.job.parse(`${normHCL1}`);
        assert.equal(res.TaskGroups.length, 1);
        assert.equal(res.Meta['node-project'], 'blockchain-client');
      });

      it('should plan a single job', async () => {
        const jobDef = await api.job.parse(`${normHCL1}`);
        const res = await api.job.plan(jobDef.ID, jobDef, { diff: true });
        assert.equal(res.Diff.Type, 'Added');
        assert.equal(res.FailedTGAllocs, null);
        assert.equal(res.Index, 0);
        assert.equal(res.JobModifyIndex, 0);
      });

      it('should create a single job', async () => {
        const jobDef = await api.job.parse(`${normHCL1}`);
        const res = await api.job.create(jobDef.ID, jobDef, {});
        assert.property(res, 'EvalCreateIndex');
        assert.property(res, 'EvalID');
      });

      it('should read a single job', async () => {
        const jobId = 'blockchain-client';
        const res = await api.job.read(jobId);
        assert.property(res, 'JobModifyIndex');
        assert.equal(res.ID, 'blockchain-client');
      });

      it('should plan an update for a single job', async () => {
        const jobDef = await api.job.parse(`${normHCL2}`);
        const res = await api.job.plan(jobDef.ID, jobDef, { diff: true });
        assert.equal(res.Diff.Type, 'Edited');
        assert.equal(res.Diff.TaskGroups[0].Type, 'Edited');
        assert.equal(res.Diff.TaskGroups[0].Tasks[0].Type, 'Edited');
        assert.equal(res.Diff.TaskGroups[0].Tasks[0].Fields[0].Type, 'Edited');
        assert.equal(res.Diff.TaskGroups[0].Tasks[0].Fields[0].Old, 'commit-hub');
        assert.equal(res.Diff.TaskGroups[0].Tasks[0].Fields[0].New, 'commit-hub-prod');
      });

      it('should update a single job', async () => {
        const jobDef = await api.job.parse(`${normHCL2}`);
        const res = await api.job.update(jobDef.ID, jobDef, {});
        assert.property(res, 'EvalCreateIndex');
        assert.property(res, 'EvalID');
        assert.property(res, 'JobModifyIndex');
      });

      it('should get a single job\'s allocations', async () => {
        const jobDef = await api.job.parse(`${normHCL2}`);
        const res = await api.job.allocations(jobDef.ID);
        assert.equal(res.length, 2);
        assert.equal(res[1].DesiredStatus, 'run');
        assert.equal(res[1].JobVersion, 1);
        assert.equal(res[1].JobID, 'blockchain-client');
        assert.equal(res[1].JobType, 'service');
        assert.equal(res[1].TaskGroup, 'commit-hub');
      });
    });
  }); // End of Nomad API
  describe('# Nomad Job', () => {
    it('should be able to read it\'s own configuration', (done) => {
      done(-1);
    });

    it('should get a summary', (done) => {
      done(-1);
    });

    it('should get it\'s own allocations', (done) => {
      done(-1);
    });
  }); // End of Nomad API
});
