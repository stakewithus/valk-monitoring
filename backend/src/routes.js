import Joi from 'joi';
import Controllers from './controllers';
import PreHandlers from './pre-handlers';
import Constant from './common/constant';

/* eslint-disable */
const getRouteHandlers = {
  GET: {
    '^\/$': (req, res) => args => {
      res.write('ok');
      return res
    },
    '^\/api\/v1\/users$': {
      handler: (req, res) => args => Controllers.User.list(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkAdminAccess(req, res),
    },
    '^\/api\/v1\/users\/:username$': {
      handler: (req, res) => args => Controllers.User.get(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkAdminAccess(req, res),
    },
    '^\/api\/v1\/policies$': {
      handler: (req, res) => args => Controllers.Policy.list(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkAdminAccess(req, res),
    },
    '^\/api\/v1\/me$': {
      handler: (req, res) => args => Controllers.User.getOwnInfo(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkUserAccess(req, res),
    },
  },
  POST: {
    '^\/api\/v1\/auth/login$': {
      handler: (req, res) => args => Controllers.User.login(req, res)(args),
      validate: {
        payload: {
          username: Joi.string().email().required().error(new Error('Email is not valid')),
          password: Joi.string().required(),
          verificationCode: Joi.string().optional().allow(''),
        }
      },
    },
    '^\/api\/v1\/auth/register$': {
      handler: (req, res) => args => Controllers.User.create(req, res)(args),
      validate: {
        payload: {
          username: Joi.string().email().required().error(new Error('Email is not valid')),
          password: Joi.string().regex(Constant.PASSWORD_STRENGTH_REGEX).required().error(new Error(Constant.PASSWORD_STRENGTH_MSG)),
        },
      },
    },
    '^\/api\/v1\/auth/refresh-auth-token$': {
      handler: (req, res) => args => Controllers.User.refreshAuthToken(req, res)(args),
      validate: {
        payload: {
          username: Joi.string().required(),
        },
      },
    },
    '^\/api\/v1\/auth/resend-verification-email$': {
      handler: (req, res) => args => Controllers.User.resendVerificationEmail(req, res)(args),
      validate: {
        payload: {
          username: Joi.string().email().required(),
        },
      },
    },
    '^\/api\/v1\/auth/verify-email$': {
      handler: (req, res) => args => Controllers.User.verifyEmail(req, res)(args),
    },
    '^\/api\/v1\/users$': {
      handler: (req, res) => args => Controllers.User.create(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkAdminAccess(req, res),
      validate: {
        payload: {
          username: Joi.string().email().required().error(new Error('Email is not valid')),
          password: Joi.string().regex(Constant.PASSWORD_STRENGTH_REGEX).required().error(new Error(Constant.PASSWORD_STRENGTH_MSG)),
          policies: Joi.string().optional().allow(''),
        },
      },
    },
    '^\/api\/v1\/auth/forgot-password$': {
      handler: (req, res) => args => Controllers.User.forgotPassword(req, res)(args),
      validate: {
        payload: {
          username: Joi.string().email().required().error(new Error('Email is not valid')),
        }
      }
    },
    '^\/api\/v1\/auth/reset-password$': {
      handler: (req, res) => args => Controllers.User.resetPassword(req, res)(args),
      validate: {
        payload: {
          password: Joi.string().regex(Constant.PASSWORD_STRENGTH_REGEX).required().error(new Error(Constant.PASSWORD_STRENGTH_MSG)),
        }
      }
    },
    '^\/api\/v1\/me/enable-2fa$': {
      handler: (req, res) => args => Controllers.User.enable2FA(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkUserAccess(req, res),
    },
    '^\/api\/v1\/me/confirm-enable-2fa$': {
      handler: (req, res) => args => Controllers.User.confirmEnable2FA(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkUserAccess(req, res),
      validate: {
        payload: {
          verificationCode: Joi.string().required()
        }
      }
    },
    '^\/api\/v1\/me/disable-2fa$': {
      handler: (req, res) => args => Controllers.User.disable2FA(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkUserAccess(req, res),
      validate: {
        payload: {
          verificationCode: Joi.string().required()
        }
      }
    },
    '^\/api\/v1\/me/change-password$': {
      handler: (req, res) => args => Controllers.User.changePassword(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkUserAccess(req, res),
      validate: {
        payload: {
          currentPassword: Joi.string().required(),
          newPassword: Joi.string().regex(Constant.PASSWORD_STRENGTH_REGEX).required().error(new Error(Constant.PASSWORD_STRENGTH_MSG)),
        }
      }
    },
  },
  PUT: {
    '^\/api\/v1\/users/:username$': {
      handler: (req, res) => args => Controllers.User.update(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkAdminAccess(req, res),
      validate: {
        payload: {
          username: Joi.string().email().optional().allow(''),
          password: Joi.string().regex(Constant.PASSWORD_STRENGTH_REGEX).optional().error(new Error(Constant.PASSWORD_STRENGTH_MSG)),
          policies: Joi.string().optional().allow(''),
        },
      },
    },
  },
  DELETE: {
    '^\/api\/v1\/users/:username$': {
      handler: (req, res) => args => Controllers.User.remove(req, res)(args),
      preHandler: (req, res) => PreHandlers.Auth.checkAdminAccess(req, res),
    },
  }
};

export {
  getRouteHandlers,
};
/* eslint-enable */
