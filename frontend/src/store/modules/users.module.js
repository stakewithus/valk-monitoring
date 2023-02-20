import {
  FETCH_USER_LIST,
  FETCH_USER_DETAIL,
  CREATE_USER,
  UPDATE_USER,
  RESET_USER_EDIT_FORM,
  DELETE_USER,
} from '../types/actions.type';
import {
  SET_USER_LIST,
  SET_USER_DETAIL,
  SET_USER_SUBMIT,
  SET_USER_DELETE,
} from '../types/muations.type';
import ApiRequest from '../../common/services/apiRequest.service';

const initialState = {
  list: {
    fetching: false,
    items: [],
    error: null
  },
  detail: {
    fetching: false,
    user: {
      policies: ["default"]
    },
    error: null,
  },
  submit: {
    submitting: false,
    error: null,
  },
  delete: {
    submitting: false,
    error: null,
  }
};

export const state = {
  ...initialState
};

export const actions = {
  async [FETCH_USER_LIST](context) {
    context.commit(SET_USER_LIST, {
      fetching: true,
      items: [],
      error: null
    });
    try {
      const data = await ApiRequest.get('/users');
      context.commit(SET_USER_LIST, {
        fetching: false,
        items: data.users
      });
    } catch (error) {
      context.commit(SET_USER_LIST, {
        fetching: false,
        items: [],
        error: error
      });
    }
  },
  async [FETCH_USER_DETAIL](context, id) {
    context.commit(SET_USER_DETAIL, {
      fetching: true,
      user: initialState.detail.user,
      error: null
    });
    try {
      const data = await ApiRequest.get('/users/' + id);
      context.commit(SET_USER_DETAIL, {
        fetching: false,
        user: data.user
      });
    } catch (error) {
      context.commit(SET_USER_DETAIL, {
        fetching: false,
        user: initialState.detail.user,
        error: error
      });
    }
  },
  async [CREATE_USER](context, payload) {
    context.commit(SET_USER_SUBMIT, {
      submitting: true,
      error: null
    });
    try {
      payload = {
        username: payload.username,
        password: payload.password,
        policies: (payload.policies || []).join(',')
      }
      await ApiRequest.post(`/users`, payload);
      context.commit(SET_USER_SUBMIT, {
        submitting: false,
        error: null
      });
    } catch (error) {
      context.commit(SET_USER_SUBMIT, {
        submitting: false,
        error: error
      });
    }
  },
  async [UPDATE_USER](context, payload) {
    context.commit(SET_USER_SUBMIT, {
      submitting: true,
      error: null
    });
    try {
      payload = {
        username: payload.username,
        password: payload.password,
        policies: (payload.policies || []).join(',')
      }
      if(!payload.password) delete payload.password;
      await ApiRequest.put(`/users/${payload.username}`, payload);
      context.commit(SET_USER_SUBMIT, {
        submitting: false,
        error: null
      });
    } catch (error) {
      context.commit(SET_USER_SUBMIT, {
        submitting: false,
        error: error
      });
    }
  },
  async [DELETE_USER](context, payload) {
    context.commit(SET_USER_DELETE, {
      submitting: true,
      error: null
    });
    try {
      await ApiRequest.delete(`/users/${payload.username}`);
      context.commit(SET_USER_DELETE, {
        submitting: false,
        error: null
      });
    } catch (error) {
      context.commit(SET_USER_DELETE, {
        submitting: false,
        error: error
      });
    }
  },
  async [RESET_USER_EDIT_FORM](context) {
    context.commit(SET_USER_DETAIL, {
      fetching: false,
      user: {
        policies: ['default']
      },
      error: null
    })
  }
};

export const mutations = {
  [SET_USER_LIST](state, data) {
    state.list = {
      ...state.list,
      ...data
    };
  },
  [SET_USER_DETAIL](state, data) {
    state.detail = {
      ...state.detail,
      ...data
    };
  },
  [SET_USER_SUBMIT](state, data) {
    state.submit = {
      ...state.submit,
      ...data
    };
  },
  [SET_USER_DELETE](state, data) {
    state.delete = {
      ...state.delete,
      ...data
    };
  }
};

const getters = {
  users(state) {
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