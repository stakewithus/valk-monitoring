import Jwt from 'jsonwebtoken';
import Util from '../common/util';
import UserService from '../services/user';
import Constant from '../common/constant';
import Config from '../config';
import TokenManager from '../services/token-managers';

const generateToken = (username, userType = Constant.USER_TYPES.USER) => {
  const loginToken = Jwt.sign({
    role: userType,
    user: username,
    type: Constant.JWT_TOKEN_TYPES.LOGIN_TOKEN,
  }, Config.jwtSecret, {
    expiresIn: Config.jwtTokenExpiredTime,
  });
  const refreshToken = Jwt.sign({
    role: userType,
    user: username,
    type: Constant.JWT_TOKEN_TYPES.REFRESH_TOKEN,
  }, Config.jwtRefreshSecret);
  return {
    token: loginToken,
    refreshToken,
  };
};

const login = (req, res) => async () => {
  try {
    const {
      username,
      password,
      verificationCode,
    } = req.body;
    const loginRes = await UserService.login(username, password, verificationCode);
    if (loginRes.error) {
      return Util.failResponse(401, res, {
        code: loginRes.code,
        message: loginRes.error,
        extraInfo: loginRes.extraInfo,
      });
    }
    TokenManager.set('username', loginRes.client_token);
    return Util.successResponse(res, generateToken(username, username === Config.adminCredential.username ? Constant.USER_TYPES.ADMIN : Constant.USER_TYPES.USER));
  } catch (e) {
    return Util.failResponse(401, res, {
      message: e && e.toString(),
    });
  }
};

const refreshAuthToken = (req, res) => () => {
  const {
    username,
  } = req.body;
  const token = Util.getTokenInHeader(req);
  try {
    const decoded = Jwt.verify(token, Config.jwtRefreshSecret);
    if (!decoded || decoded.type !== Constant.JWT_TOKEN_TYPES.REFRESH_TOKEN
      || decoded.user !== username) {
      return Util.failResponse(401, res, {
        message: 'Invalid refresh token',
      });
    }
    return Util.successResponse(res, {
      token: generateToken(username).token,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const list = (req, res) => async () => {
  try {
    const users = await UserService.list();
    return Util.successResponse(res, {
      users,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const get = (req, res) => async () => {
  try {
    const {
      username,
    } = req.params;
    const user = await UserService.get(username);
    return Util.successResponse(res, {
      user: user ? {
        username,
        policies: user.policies,
        isEmailVerified: user.isEmailVerified,
      } : null,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const getOwnInfo = (req, res) => async () => {
  try {
    const username = req.user.user;
    const user = await UserService.get(username);
    if (!user) {
      return Util.failResponse(401, res, {
        message: 'Token is invalid or has expired',
      });
    }
    return Util.successResponse(res, {
      profile: user ? {
        username,
        policies: user.policies,
        isEmailVerified: user.isEmailVerified,
        is2FAEnabled: user.is2FAEnabled,
      } : null,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const create = (req, res) => async () => {
  try {
    const {
      username,
      password,
      policies,
    } = req.body;
    const user = await UserService.get(username);
    if (user) {
      return Util.failResponse(500, res, {
        message: 'User exists',
      });
    }
    const result = await UserService.create(username, password, policies);
    if (result && Util.isNotEmptyArray(result.errors)) {
      return Util.failResponse(500, res, {
        message: result.errors,
      });
    }
    return Util.successResponse(res, {});
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const update = (req, res) => async () => {
  try {
    const {
      username,
    } = req.params;
    const {
      password,
      policies,
    } = req.body;
    const ret = await UserService.update(username, password, policies);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {});
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const remove = (req, res) => async () => {
  try {
    const {
      username,
    } = req.params;
    await UserService.remove(username);
    return Util.successResponse(res, {});
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const resendVerificationEmail = (req, res) => async () => {
  const {
    username,
  } = req.body;
  const ret = await UserService.sendEmailVerification(username);
  if (ret.error) {
    return Util.failResponse(400, res, {
      message: ret.error,
    });
  }
  return Util.successResponse(res, ret);
};

const verifyEmail = (req, res) => async () => {
  try {
    const token = Util.getTokenInHeader(req) || req.query.token;
    const decoded = Jwt.verify(token, Config.jwtVerificationSecret);
    if (!decoded || decoded.type !== Constant.JWT_TOKEN_TYPES.VERIFICATION_TOKEN) {
      return Util.failResponse(401, res, {
        message: 'Token is not valid or had expired',
      });
    }
    const ret = await UserService.verifyEmail(decoded.user);
    if (!ret) {
      return Util.failResponse(400, res, {
        message: 'We cannot verify your email. Please try again.',
      });
    }
    return Util.successResponse(res, ret);
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const enable2FA = (req, res) => async () => {
  try {
    const ret = await UserService.enable2FA(req.user.user);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {
      url: ret.url,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const confirmEnable2FA = (req, res) => async () => {
  try {
    const ret = await UserService.confirmEnable2FA(req.user.user, req.body.verificationCode);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {
      ok: true,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const disable2FA = (req, res) => async () => {
  try {
    const ret = await UserService.disable2FA(req.user.user, req.body.verificationCode);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {
      ok: true,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const forgotPassword = (req, res) => async () => {
  try {
    const ret = await UserService.sendForgotPasswordEmail(req.body.username);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {
      ok: true,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const resetPassword = (req, res) => async () => {
  try {
    const token = Util.getTokenInHeader(req) || req.query.token;
    const decoded = Jwt.verify(token, Config.jwtForgotPwdSecret);
    if (!decoded || decoded.type !== Constant.JWT_TOKEN_TYPES.FORGOT_PASSWORD_TOKEN) {
      return Util.failResponse(401, res, {
        message: 'Token is not valid or had expired',
      });
    }
    const ret = await UserService.resetPassword(decoded.user, req.body.password);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {
      ok: true,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

const changePassword = (req, res) => async () => {
  try {
    const ret = await UserService.changePassword(req.user.user, req.body);
    if (ret.error) {
      return Util.failResponse(400, res, {
        message: ret.error,
      });
    }
    return Util.successResponse(res, {
      ok: true,
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

export default {
  list,
  get,
  update,
  create,
  remove,
  login,
  refreshAuthToken,
  verifyEmail,
  resendVerificationEmail,
  getOwnInfo,
  enable2FA,
  confirmEnable2FA,
  disable2FA,
  forgotPassword,
  resetPassword,
  changePassword,
};
