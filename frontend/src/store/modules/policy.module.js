import {
  FETCH_POLICY_LIST
} from '../types/actions.type';
import {
  SET_POLICY_LIST
} from '../types/muations.type';
import ApiRequest from '../../common/services/apiRequest.service';

const initialState = {
  list: {
    fetching: false,
    items: [],
    error: null
  },
};

export const state = {
  ...initialState
};

export const actions = {
  async [FETCH_POLICY_LIST](context) {
    context.commit(SET_POLICY_LIST, {
      fetching: true,
      items: [],
      error: null
    });
    try {
      const data = await ApiRequest.get('/policies');
      context.commit(SET_POLICY_LIST, {
        fetching: false,
        items: data.policies
      });
    } catch (error) {
      context.commit(SET_POLICY_LIST, {
        fetching: false,
        items: [],
        error: error
      });
    }
  },
};

export const mutations = {
  [SET_POLICY_LIST](state, data) {
    state.list = {
      ...state.list,
      ...data
    };
  },
};

const getters = {
  policy(state) {
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