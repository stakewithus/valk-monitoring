import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import {
  promisify,
} from 'util';
import vault, {
  encodeUsername,
} from './vault-request';

export const generateSecret = () => speakeasy.generateSecret({
  name: 'Valk',
});

export const generateSecretQRCode = (otpauthUrl) => promisify(QRCode.toDataURL)(otpauthUrl);

export const getSecretByUser = async (username) => {
  const ret = await vault()(`/v1/2fa/data/${encodeUsername(username)}`, 'GET')({});
  return ret.data && ret.data.data && ret.data.data.secret;
};

export const setSecretByUser = async (username, secret) => vault()(`/v1/2fa/data/${encodeUsername(username)}`, 'POST')({
  body: {
    data: {
      username,
      secret,
    },
  },
});

export const removeUserSecret = async (username) => vault()(`/v1/2fa/metadata/${encodeUsername(username)}`, 'DELETE')({});

export const verifyUserToken = (base32Secret, userToken) => speakeasy.totp.verify({
  secret: base32Secret,
  encoding: 'base32',
  token: userToken,
});
