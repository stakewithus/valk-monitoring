/* eslint-disable no-use-before-define */
import vault, {
  encodeUsername,
  decodeUsername,
  getUserEntity,
  createUserEntity,
  updateUserEntity,
  deleteUserEntity,
} from '../common/vault-request';
import mailer from '../common/mailer';
import Constant from '../common/constant';
import Util from '../common/util';
import Config from '../config';
import * as twoFa from '../common/two-fa';

const get = async (username) => {
  try {
    const user = await vault()(`/v1/auth/userpass/users/${encodeUsername(username)}`, 'GET')({});
    console.log(user);
    if (!user.data) return null;
    const entity = await getUserEntity(username);
    return {
      ...user.data,
      ...(entity.data ? (entity.data.metadata || {}) : {}),
      // isEmailVerified: (entity.data && entity.data.metadata && entity.data.metadata.isEmailVerified) || 'false',
      is2FAEnabled: (entity.data && entity.data.metadata && entity.data.metadata.is2FAEnabled) || 'false',
    };
  } catch (e) {
    return null;
  }
};

const create = async (username, password, policies) => {
  const ret = await vault()(`/v1/auth/userpass/users/${encodeUsername(username)}`, 'POST')({
    body: {
      password,
      policies: policies || Constant.VAULT.DEFAULT_POLICY,
      token_no_default_policy: true,
    },
  });
  createUserEntity(username, {
    metadata: {
      username,
      // isEmailVerified: 'false',
      is2FAEnabled: 'false',
    },
  });
  sendEmailVerification(username);
  return ret;
};

const update = async (username, password, policies) => {
  const user = await get(username);
  if (!user) {
    return {
      error: 'User not found',
    };
  }
  const promises = [vault()(`/v1/auth/userpass/users/${encodeUsername(username)}/policies`, 'POST')({
    body: {
      policies,
    },
  })];
  if (password) {
    promises.push(vault()(`/v1/auth/userpass/users/${encodeUsername(username)}/password`, 'POST')({
      body: {
        password,
      },
    }));
  }
  return Promise.all(promises);
};

const remove = async (username) => {
  const ret = await vault()(`/v1/auth/userpass/users/${encodeUsername(username)}`, 'DELETE')({});
  deleteUserEntity(username);
  twoFa.removeUserSecret(username);
  return ret;
};

const list = async () => {
  const res = await vault()('/v1/auth/userpass/users', 'LIST')({});
  if (!res || !res.data) {
    return [];
  }
  const promises = res.data.keys
    .filter((k) => k !== encodeUsername(Config.adminCredential.username)) // omit admin account
    .map(async (username) => {
      const [userInfo, entity] = await Promise.all([
        vault()(`/v1/auth/userpass/users/${username}`, 'GET')({}),
        getUserEntity(decodeUsername(username)),
      ]);
      return {
        username: decodeUsername(username),
        policies: userInfo.data.policies,
        // isEmailVerified: (entity.data && entity.data.metadata && entity.data.metadata.isEmailVerified) || 'false',
      };
    });
  return Promise.all(promises);
};

const login = async (username, password, verificationCode) => {
  const userEntity = await getUserEntity(username);
  console.log(userEntity);
  console.log(username);
  const userMetadata = (userEntity && userEntity.data && userEntity.data.metadata) || {};
  let logInAttemptsLeft = userMetadata.logInAttemptsLeft || Constant.MAX_LOGIN_ATTEMPTS;
  let {
    lockedUntil,
  } = userMetadata;

  // check if email is verified	
  // if (userMetadata.isEmailVerified !== 'true') {
  //   return {	
  //     code: 'EMAIL_NOT_VERIFIED',	
  //     error: 'Email is not verified.',	
  //   };	
  // }

  // check login attempts
  if (lockedUntil && lockedUntil > new Date().valueOf()) {
    return {
      code: 'ACCOUNT_LOCKED_EXCEED_ATTEMPTS',
      error: 'Your account has been locked due to too many failed login attempts.',
      extraInfo: {
        lockedUntil: Number(lockedUntil),
      },
    };
  }
  const ret = await vault()(`/v1/auth/userpass/login/${encodeUsername(username)}`, 'POST')({
    body: {
      password,
    },
  });
  // username/password not correct
  if (!ret.auth) {
    if (logInAttemptsLeft <= 1) {
      lockedUntil = new Date().valueOf() + Constant.LOCKS_ACCOUNT_IN * 60000;
      logInAttemptsLeft = Constant.MAX_LOGIN_ATTEMPTS;
    } else {
      logInAttemptsLeft--;
      lockedUntil = undefined;
    }
    await updateUserEntity(username, {
      metadata: {
        logInAttemptsLeft,
        lockedUntil,
      },
    });
    if (lockedUntil) {
      return {
        code: 'ACCOUNT_LOCKED_EXCEED_ATTEMPTS',
        error: 'Your account has been locked due to too many failed login attempts.',
        extraInfo: {
          lockedUntil: Number(lockedUntil),
        },
      };
    }
    return {
      code: 'LOGIN_FAILED_WITH_ATTEMPTS',
      error: 'Username or password is not correct.',
      extraInfo: {
        attemptsLeft: logInAttemptsLeft,
      },
    };
  }
  // username & password correct
  await updateUserEntity(username, {
    metadata: {
      lockedUntil: undefined,
      logInAttemptsLeft: undefined,
    },
  });
  // check 2fa
  if (userMetadata.is2FAEnabled === 'true') {
    if (!verificationCode) {
      return {
        code: '2FA_REQUIRED',
        error: 'Two-factor authentication required.',
      };
    }
    const verifiedRet = await verify2FACode(username, verificationCode);
    if (verifiedRet.error) {
      return {
        error: verifiedRet.error,
      };
    }
  }
  // ok
  return {
    ...ret.auth,
    metadata: userMetadata,
  };
};

const sendEmailVerification = async (username) => {
  const user = await get(username);
  if (!user) {
    return {
      error: 'The email you provided does not exist in our system.',
    };
  }
  // if (user.isEmailVerified === 'true') {
  //   return {
  //     error: 'Your email was already verified.',
  //   };
  // }
  try {
    return mailer.sendEmailVerification(username);
  } catch (error) {
    return {
      error: error.message,
    };
  }
};

const verifyEmail = async (username) => {
  const user = await get(username);
  if (!user) return null;
  // if (user.isEmailVerified !== 'true') {
  //   await updateUserEntity(username, {
  //     metadata: {
  //       isEmailVerified: 'true',
  //     },
  //   });
  // }
  return {
    ok: true,
  };
};

const enable2FA = async (username) => {
  const userEntity = await getUserEntity(username);
  if (userEntity && userEntity.data && userEntity.data.metadata && userEntity.data.metadata.is2FAEnabled === 'true') {
    return {
      error: '2FA has already been enabled.',
    };
  }
  const secret = twoFa.generateSecret();
  await twoFa.setSecretByUser(username, secret.base32);
  return {
    url: await twoFa.generateSecretQRCode(secret.otpauth_url),
  };
};

const confirmEnable2FA = async (username, userToken) => {
  const secret = await twoFa.getSecretByUser(username);
  if (!secret) {
    return {
      error: 'Secret not found. Please re-enable 2FA.',
    };
  }
  const verified = twoFa.verifyUserToken(secret, userToken);
  if (!verified) {
    return {
      error: 'Cannot verify this verfication code. Please try a different one.',
    };
  }
  updateUserEntity(username, {
    metadata: {
      is2FAEnabled: 'true',
    },
  });
  return {
    verified: true,
    error: null,
  };
};

const verify2FACode = async (username, code) => {
  const secret = await twoFa.getSecretByUser(username);
  if (!secret) {
    return {
      error: 'Two-factor authentication has not been enabled.',
    };
  }
  const verified = twoFa.verifyUserToken(secret, code);
  if (!verified) {
    return {
      error: 'Cannot verify this verfication code. Please try a different one.',
    };
  }
  return {
    verified: true,
    error: null,
  };
};

const disable2FA = async (username, verificationCode) => {
  const ret = await verify2FACode(username, verificationCode);
  if (ret.error) return ret;
  await twoFa.removeUserSecret(username);
  await updateUserEntity(username, {
    metadata: {
      is2FAEnabled: 'false',
    },
  });
  return {
    error: null,
  };
};

const sendForgotPasswordEmail = async (username) => {
  const user = await get(username);
  if (!user) {
    return {
      error: 'The email you provided does not exist in our system.',
    };
  }
  // if (user.isEmailVerified !== 'true') {
  //   return {
  //     error: 'Email is not verified.',
  //   };
  // }
  try {
    return mailer.sendForgotPasswordEmail(username);
  } catch (error) {
    return {
      error: error.message,
    };
  }
};

const resetPassword = async (username, password) => {
  const user = await get(username);
  if (!user) {
    return {
      error: 'User not found',
    };
  }
  // if (user.isEmailVerified !== 'true') {
  //   return {
  //     error: 'Email is not verified.',
  //   };
  // }
  return update(username, password);
};

const changePassword = async (username, {
  currentPassword,
  newPassword,
}) => {
  const user = await get(username);
  if (!user) {
    return {
      error: 'User not found',
    };
  }
  // if (user.isEmailVerified !== 'true') {
  //   return {
  //     error: 'Email is not verified.',
  //   };
  // }
  const ret = await login(username, currentPassword);
  if (!ret || Util.isNotEmptyArray(ret.errors)) {
    return {
      error: 'Current password is not correct.',
    };
  }
  return update(username, newPassword);
};

export default {
  get,
  create,
  update,
  remove,
  list,
  login,
  verifyEmail,
  sendEmailVerification,
  enable2FA,
  confirmEnable2FA,
  verify2FACode,
  disable2FA,
  sendForgotPasswordEmail,
  resetPassword,
  changePassword,
};
