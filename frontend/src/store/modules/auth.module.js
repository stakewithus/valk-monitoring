import {
  LOGIN,
  CHECK_AUTH,
  LOGOUT,
  SIGNUP,
  VERIFY_EMAIL,
  RESEND_VERIFICATION_EMAIL,
  RESET_VERIFICATION_EMAIL_FORM,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
} from '../types/actions.type';
import {
  SET_AUTH,
  PURGE_AUTH,
  SET_AUTH_ERROR,
  SET_REGISTRATION_ERROR,
  SET_EMAIL_VERIFICATION,
  SET_FORGOT_PASSWORD,
  SET_RESET_PASSWORD,
} from '../types/muations.type';
import * as jwt from '../../common/services/jwt.service';
import ApiRequest, {
  setAuthorizationHeader,
  removeAuthorizationHeader
} from '../../common/services/apiRequest.service';
import router from '../../router';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoggingIn: false,
  loginError: null,
  registrationError: null,
  isSigningUp: false,
  emailVerification: {
    verifying: false,
    verified: false,
    verifyingError: null,
    resending: false,
    resent: false,
    resendingError: null,
  },
  forgotPassword: {
    submitting: false,
    submitted: false,
    error: null,
  },
  resetPassword: {
    submitting: false,
    submitted: false,
    error: null,
  }
};

export const state = {
  ...initialState
};

export const actions = {
  async [LOGIN](context, payload) {
    context.commit(PURGE_AUTH);
    context.commit(LOGIN);
    try {
      const {
        token: accessToken,
        refreshToken
      } = await ApiRequest
        .post('/auth/login', {
          username: payload.username,
          password: payload.password,
          verificationCode: payload.verificationCode
        });
      context.commit(SET_AUTH, {
        accessToken,
        refreshToken,
        user: jwt.decodeToken(accessToken)
      });
      redirectToHomePage();
    } catch (error) {
      context.commit(SET_AUTH_ERROR, error);
    }
  },
  async [SIGNUP](context, payload) {
    context.commit(PURGE_AUTH);
    context.commit(SIGNUP);
    try {
      await ApiRequest
        .post('/auth/register', {
          username: payload.username,
          password: payload.password
        });
      router.push({
        name: 'signup-success',
        query: {
          sent: true,
          email: payload.username
        }
      });
    } catch (error) {
      context.commit(SET_REGISTRATION_ERROR, error);
    }
  },
  async [CHECK_AUTH](context, to = {}) {
    let user = context.state.user;
    if (!user) {
      let accessToken = jwt.getToken();
      if (accessToken) {
        const ret = await checkTokenValid(accessToken);
        if (!ret.valid) {
          return context.commit(PURGE_AUTH);
        }
        user = ret.user;
        context.commit(SET_AUTH, {
          accessToken: ret.accessToken,
          user,
        });
      } else {
        return context.commit(PURGE_AUTH);
      }
    }
    if (to.meta) {
      const allowedRoles = to.meta.roles;
      if (!allowedRoles) return;
      if (!allowedRoles.some(role => role.toLowerCase() === user.role.toLowerCase())) {
        router.push({
          name: 'permission-denied'
        });
      }
    }
  },
  async [LOGOUT](context) {
    context.commit(PURGE_AUTH);
  },
  async [VERIFY_EMAIL](context, token) {
    context.commit(SET_EMAIL_VERIFICATION, {
      verifying: true,
      verified: false,
      verifyingError: null
    });
    try {
      await ApiRequest
        .post('/auth/verify-email', null, {
          headers: {
            Authorization: 'Bearer ' + token
          }
        });
      context.commit(SET_EMAIL_VERIFICATION, {
        verifying: false,
        verifyingError: null,
        verified: true
      });
      setTimeout(() => {
        router.push({
          name: 'login'
        });
      }, 1000);
    } catch (error) {
      context.commit(SET_EMAIL_VERIFICATION, {
        verifying: false,
        verifyingError: error,
        verified: false
      });
    }
  },
  async [RESEND_VERIFICATION_EMAIL](context, payload) {
    context.commit(SET_EMAIL_VERIFICATION, {
      resending: true,
      resent: false,
      resendingError: null,
    });
    try {
      await ApiRequest
        .post('/auth/resend-verification-email', {
          username: payload.username
        });
      context.commit(SET_EMAIL_VERIFICATION, {
        resending: false,
        resent: true,
      });
    } catch (error) {
      context.commit(SET_EMAIL_VERIFICATION, {
        resending: false,
        resent: true,
        resendingError: error,
      });
    }
  },
  [RESET_VERIFICATION_EMAIL_FORM](context) {
    context.commit(SET_EMAIL_VERIFICATION, {
      verifying: false,
      verified: false,
      verifyingError: null,
      resending: false,
      resent: false,
      resendingError: null,
    });
  },
  async [FORGOT_PASSWORD](context, username) {
    context.commit(SET_FORGOT_PASSWORD, {
      submitting: true,
      submitted: false,
      error: null
    });
    try {
      await ApiRequest
        .post('/auth/forgot-password', {
          username
        });
      context.commit(SET_FORGOT_PASSWORD, {
        submitting: false,
        submitted: true,
      });
    } catch (error) {
      context.commit(SET_FORGOT_PASSWORD, {
        submitting: false,
        error
      });
    }
  },
  async [RESET_PASSWORD](context, {
    password,
    token
  }) {
    context.commit(SET_RESET_PASSWORD, {
      submitting: true,
      submitted: false,
      error: null
    });
    try {
      await ApiRequest
        .post('/auth/reset-password', {
          password
        }, {
          headers: {
            Authorization: 'Bearer ' + token
          }
        });
      context.commit(SET_RESET_PASSWORD, {
        submitting: false,
        submitted: true,
      });
      setTimeout(() => {
        router.push({
          name: 'login'
        });
      }, 1000);
    } catch (error) {
      context.commit(SET_RESET_PASSWORD, {
        submitting: false,
        error
      });
    }
  }
};

export const mutations = {
  [SET_AUTH](state, {
    accessToken,
    refreshToken,
    user
  } = {}) {
    state.isAuthenticated = true;
    state.user = user;
    state.isLoggingIn = false;
    state.isSigningUp = false;
    setAuthorizationHeader(accessToken);
    jwt.saveToken(accessToken);
    refreshToken && jwt.saveRefreshToken(refreshToken);
  },
  [SET_AUTH_ERROR](state, error) {
    state.isAuthenticated = false;
    state.loginError = error;
    state.isLoggingIn = false;
    jwt.destroyToken();
  },
  [SET_REGISTRATION_ERROR](state, error) {
    state.isAuthenticated = false;
    state.registrationError = error;
    state.isSigningUp = false;
    jwt.destroyToken();
  },
  [PURGE_AUTH](state) {
    state.user = null;
    state.isAuthenticated = false;
    state.loginError = null;
    state.registrationError = null;
    state.isLoggingIn = false;
    state.isSigningUp = false;
    jwt.destroyToken();
    jwt.destroyRefreshToken();
    removeAuthorizationHeader();
    redirectToAuthPage();
  },
  [LOGIN](state) {
    state.isLoggingIn = true;
  },
  [SIGNUP](state) {
    state.isSigningUp = true;
  },
  [SET_EMAIL_VERIFICATION](state, data) {
    state.emailVerification = {
      ...state.emailVerification,
      ...data
    };
  },
  [SET_FORGOT_PASSWORD](state, data) {
    state.forgotPassword = {
      ...state.forgotPassword,
      ...data
    };
  },
  [SET_RESET_PASSWORD](state, data) {
    state.resetPassword = {
      ...state.resetPassword,
      ...data
    };
  }
};

const getters = {
  auth(state) {
    return {
      ...state
    };
  }
};

const checkTokenValid = async (token) => {
  let user = jwt.decodeToken(token);
  if (!user) return {
    valid: false
  };
  if (['role', 'user', 'exp'].some(key => !user[key])) {
    return {
      valid: false
    };
  }
  try {
    await ApiRequest.get('/me', {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });
  } catch (error) {
    return {
      valid: false
    }
  }
  if (tokenExpired(user)) {
    try {
      const {
        token: accessToken,
      } = await ApiRequest
        .post('/auth/refresh-auth-token', {
          username: user.user,
        }, {
          headers: {
            Authorization: 'Bearer ' + jwt.getRefreshToken()
          }
        });
      user = jwt.decodeToken(accessToken);
      token = accessToken;
    } catch (error) {
      return {
        valid: false
      };
    }
  }
  return {
    valid: true,
    accessToken: token,
    user
  };
};

const tokenExpired = (user) => {
  return user.exp * 1000 - new Date().valueOf() < 0;
};

const redirectToAuthPage = () => {
  setTimeout(() => {
    const currentRoute = router.currentRoute;
    if (!currentRoute.meta || currentRoute.meta.requiresAuth !== false) {
      router.push({
        name: 'login'
      });
    }
  }, 100);
};

const redirectToHomePage = () => {
  const currentRoute = router.currentRoute;
  if (currentRoute.name === 'login' || currentRoute.name === 'signup') {
    router.push({
      name: 'home'
    });
  }
};

export default {
  state,
  actions,
  mutations,
  getters
};