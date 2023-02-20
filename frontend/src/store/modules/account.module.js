import {
  FETCH_OWN_PROFILE,
  ENABLE_2FA,
  CONFIRM_ENABLE_2FA,
  DISABLE_2FA,
  CHANGE_PASSWORD
} from '../types/actions.type';
import {
  SET_OWN_PROFILE,
  SET_2FA,
  SET_CHANGE_PASSWORD
} from '../types/muations.type';
import ApiRequest from '../../common/services/apiRequest.service';

const initialState = {
  profile: {
    fetching: false,
    info: {},
    error: null
  },
  twoFa: {
    enabling: false,
    enablingError: null,
    enabled: false,
    imgUrl: null,
    confirming: false,
    confirmingError: false,
    confirmed: false,
    disabling: false,
    disablingError: null,
    disabled: false,
  },
  changePassword: {
    submitting: false,
    submitted: false,
    error: null,
  }
};

export const state = {
  ...initialState
};

export const actions = {
  async [FETCH_OWN_PROFILE](context) {
    context.commit(SET_OWN_PROFILE, {
      fetching: true,
      info: {},
      error: null
    });
    try {
      const data = await ApiRequest.get('/me');
      context.commit(SET_OWN_PROFILE, {
        fetching: false,
        info: data.profile
      });
    } catch (error) {
      context.commit(SET_OWN_PROFILE, {
        fetching: false,
        error: error
      });
    }
  },
  async [ENABLE_2FA](context) {
    context.commit(SET_2FA, {
      enabling: true,
      enablingError: null,
      enabled: false,
      imgUrl: null,
      confirming: false,
      confirmingError: false,
      confirmed: false,
    });
    try {
      const {
        url: imgUrl
      } = await ApiRequest.post('/me/enable-2fa');
      context.commit(SET_2FA, {
        enabling: false,
        enabled: true,
        imgUrl,
      });
    } catch (error) {
      context.commit(SET_2FA, {
        enabling: false,
        error: error
      });
    }
  },
  async [CONFIRM_ENABLE_2FA](context, verificationCode) {
    context.commit(SET_2FA, {
      enabling: false,
      enablingError: null,
      confirming: true,
      confirmingError: false,
      confirmed: false
    });
    try {
      await ApiRequest.post('/me/confirm-enable-2fa', {
        verificationCode
      });
      context.commit(SET_2FA, {
        enabling: false,
        enablingError: null,
        enabled: false,
        imgUrl: null,
        confirming: false,
        confirmingError: false,
        confirmed: true
      });
      context.commit(SET_OWN_PROFILE, {
        info: {
          ...context.state.profile.info,
          is2FAEnabled: "true"
        }
      });
    } catch (error) {
      context.commit(SET_2FA, {
        confirming: false,
        confirmingError: error
      });
    }
  },
  async [DISABLE_2FA](context, verificationCode) {
    context.commit(SET_2FA, {
      disabling: true,
      disablingError: null,
      disabled: false,
    });
    try {
      await ApiRequest.post('/me/disable-2fa', {
        verificationCode
      });
      context.commit(SET_2FA, {
        disabling: false,
        disablingError: null,
        disabled: true,
      });
      context.commit(SET_OWN_PROFILE, {
        info: {
          ...context.state.profile.info,
          is2FAEnabled: "false"
        }
      });
    } catch (error) {
      context.commit(SET_2FA, {
        disabling: false,
        disablingError: error,
      });
    }
  },
  async [CHANGE_PASSWORD](context, payload) {
    context.commit(SET_CHANGE_PASSWORD, {
      error: null,
      submitting: true,
      submitted: false
    });
    try {
      await ApiRequest.post('/me/change-password', {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });
      context.commit(SET_CHANGE_PASSWORD, {
        submitting: false,
        submitted: true
      });
    } catch (error) {
      context.commit(SET_CHANGE_PASSWORD, {
        submitting: false,
        error: error
      });
    }
  }
};

export const mutations = {
  [SET_OWN_PROFILE](state, data) {
    state.profile = {
      ...state.profile,
      ...data
    };
  },
  [SET_2FA](state, data) {
    state.twoFa = {
      ...state.twoFa,
      ...data
    };
  },
  [SET_CHANGE_PASSWORD](state, data) {
    state.changePassword = {
      ...state.changePassword,
      ...data
    };
  },
};

const getters = {
  account(state) {
    return {
      ...state
    };
  }
};

export default {
  state,
  actions,
  mutations,
  getters
};