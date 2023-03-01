import dotenv from 'dotenv';
import pino from 'pino';
import vault, {
  encodeUsername,
  createUserEntity,
} from './common/vault-request';

dotenv.config();
const logger = pino().child({
  module: 'boostrap',
});

const enableUserpassAuth = (res) => {
  return new Promise(async (resolve, reject) => {
    try {
      await vault()('/v1/sys/auth/userpass', 'POST')({
        body: {
          type: 'userpass',
        },
      });
      res ? res() : resolve();
    } catch (error) {
      logger.error(error);
      setTimeout(() => {
        enableUserpassAuth(resolve);
      }, 1000);
    }
  });
};

const createAdminAccount = ({
  username,
  password,
  policies,
}, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await vault()(`/v1/auth/userpass/users/${encodeUsername(username)}`, 'GET')({});
      if (data.data) return resolve();
      await vault()(`/v1/auth/userpass/users/${encodeUsername(username)}`, 'POST')({
        body: {
          password,
          policies,
          token_no_default_policy: true,
        },
      });
      createUserEntity(username, {
        metadata: {
          username,
          // isEmailVerified: 'true',
          is2FAEnabled: 'false',
        },
      });
      res ? res() : resolve();
    } catch (error) {
      logger.error(error);
      setTimeout(() => {
        enableUserpassAuth({
          username,
          password,
          policies,
        }, resolve);
      }, 1000);
    }
  });
};

const enable2FaSecret = (path = '2fa', res) => {
  return new Promise(async (resolve, reject) => {
    try {
      await vault()(`/v1/sys/mounts/${path}`, 'POST')({
        body: {
          type: 'kv-v2',
        },
      });
      res ? res() : resolve();
    } catch (error) {
      logger.error(error);
      setTimeout(() => {
        enable2FaSecret(null, resolve)
      }, 1000);
    }
  });
};

export default async () => {
  const Config = require('./config').default;
  await Promise.all([
    enableUserpassAuth(),
    enable2FaSecret(),
  ]);
  await createAdminAccount(Config.adminCredential);
};