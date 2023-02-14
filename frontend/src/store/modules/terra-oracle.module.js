import Api from '../../common/services/apmApiRequest.service';

const mutationTypes = {
  SET_STATUS: 'SET_STATUS',
  SET_EXCHANGE_RATE_CHART: 'SET_EXCHANGE_RATE_CHART',
  SET_MISSES_CHART: 'SET_MISSES_CHART',
  SET_HEALTH_CHECKS: 'SET_HEALTH_CHECKS',
  SET_ACTIVE_COINS: 'SET_ACTIVE_COINS',
};

const state = {
  status: {
    misses: null,
    uptime: null,
  },
  exchangeRateChart: null,
  missesChart: null,
  healthChecks: [],
  activeCoins: []
};

const getters = {
  getStatus(state) {
    return state.status;
  },
  getExchangeRateChart(state) {
    return state.exchangeRateChart;
  },
  getMissesChart(state) {
    return state.missesChart;
  },
  getHealthChecks(state) {
    return state.healthChecks;
  },
  getActiveCoins(state) {
    return state.activeCoins;
  }
};

const actions = {
  async getStatus({ commit }) {
    const data = await Api.get('/terra/oracle/status');
    commit(mutationTypes.SET_STATUS, data);
  },
  async getExchangeRateChart({ commit }, { dateRange, blockRange }) {
    const data = await Api.get(`/terra/oracle/exchange-rate-charts?from=${dateRange.startDate && dateRange.startDate.valueOf() || ''}&to=${dateRange.endDate && dateRange.endDate.valueOf() || ''}&from_block=${blockRange.from || ''}&to_block=${blockRange.to || ''}`);
    commit(mutationTypes.SET_EXCHANGE_RATE_CHART, data);
  },
  async getMissesChart({ commit }, { dateRange, blockRange }) {
    const data = await Api.get(`/terra/oracle/misses-chart?from=${dateRange.startDate && dateRange.startDate.valueOf() || ''}&to=${dateRange.endDate && dateRange.endDate.valueOf() || ''}&from_block=${blockRange.from || ''}&to_block=${blockRange.to || ''}`);
    commit(mutationTypes.SET_MISSES_CHART, data);
  },
  async getHealthChecks({ commit }) {
    const data = await Api.get('/terra/oracle/health-checks');
    commit(mutationTypes.SET_HEALTH_CHECKS, data);
  },
  async getActiveCoins({ commit }) {
    commit(mutationTypes.SET_ACTIVE_COINS, ['uusd', 'usdr', 'umnt', 'ukrw']);
  }
};

const mutations = {
  [mutationTypes.SET_STATUS](state, data) {
    state.status = data;
  },
  [mutationTypes.SET_EXCHANGE_RATE_CHART](state, data) {
    state.exchangeRateChart = data;
  },
  [mutationTypes.SET_MISSES_CHART](state, data) {
    state.missesChart = data;
  },
  [mutationTypes.SET_HEALTH_CHECKS](state, data) {
    state.healthChecks = data;
  },
  [mutationTypes.SET_ACTIVE_COINS](state, data) {
    state.activeCoins = data;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};