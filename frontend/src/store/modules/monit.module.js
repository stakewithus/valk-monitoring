import ApiRequest from "../../common/services/monitApiRequest.service";

const state = {};

const actions = {
  async fetchStatus({}, path) {
    return ApiRequest.get(path);
  },
  async fetchMutingState({}, project) {
    return ApiRequest.get(`/setting/muting-state/${project}`);
  },
  async updateMutingState({ }, { project, muted }) {
    return ApiRequest.post(`/setting/change-muting-state/${project}`, { muted });
  }
};

const mutations = {};

const getters = {};

export default {
  namespaced: true,
  state,
  actions,
  mutations,
  getters
};
