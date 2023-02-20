import { assert } from 'chai';
import request from 'supertest';
import nock from 'nock';
import sinon from 'sinon';
import Server from '../server';
import UserService from '../services/user';
import TestUtil from '../common/test-util';

process.env.VAULT_ADDRESS = '127.0.0.1:8200';
process.env.JWT_SECRET = 'L4dR990fmv';

const mockVaultApi = async () => {
  const baseUri = `http://${process.env.VAULT_ADDRESS}`;
  sinon.stub(UserService, 'list').returns(['username1']);
  const MockContents = await TestUtil.getFolderContent('controllers/fixtures');
  nock(baseUri)
    .post('/v1/auth/userpass/login/username1', { password: 'password1' })
    .reply(200, MockContents.UserLogin);
  nock(baseUri)
    .get('/v1/auth/userpass/users/username2')
    .reply(200, '');
  nock(baseUri)
    .put('/v1/sys/policy/username2_policy')
    .reply(200, '');
  sinon.stub(UserService, 'create').returns('');
};

describe('# Server API', () => {
  let server = {};

  before(async () => {
    server = Server();
    await mockVaultApi();
  });
  describe('# User Controller', () => {
    it('should require authorization', async () => {
      request(server)
        .get('/api/v1/users')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          assert.deepEqual(replyBody, {
            success: false,
            detail: {
              code: 401,
              error: 'INVALID_TOKEN',
              message: 'jwt must be provided',
            },
          });
        });
    });
    it('should should list user successfully', async () => {
      request(server)
        .get('/api/v1/users')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiVVNFUiIsInVzZXIiOiJ1c2VybmFtZTEiLCJ0eXBlIjoiUkVGUkVTSF9UT0tFTiIsImlhdCI6MTU2OTkxNTA2OH0.PcPU2HslEltNUkSwJgR5c0zdJOGtXb8RaMzohY57W0s')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          assert.deepEqual(replyBody, {
            success: true,
            detail: {
              users: [{
                username: 'username1',
              }],
            },
          });
        });
    });
    it('should should login user successfully', async () => {
      request(server)
        .post('/api/v1/auth/login')
        .send({ username: 'username1', password: 'password1' })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          assert.property(replyBody.detail, 'token');
          assert.property(replyBody.detail, 'refreshToken');
        });
    });
    it('should should register user successfully', async () => {
      request(server)
        .post('/api/v1/auth/register')
        .send({ username: 'username2', password: 'password2' })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) throw err;
          const { text } = res.toJSON();
          const replyBody = JSON.parse(text);
          assert.property(replyBody.detail, 'token');
          assert.property(replyBody.detail, 'refreshToken');
        });
    });
  });
});
