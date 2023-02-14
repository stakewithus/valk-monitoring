import Api from "../../common/services/apmApiRequest.service";
import StakeApi from "../../common/services/stakeApiRequest.service";
import { isEmpty } from "../../common/utils";
import DateHelper from "../../common/utils/date";

const mutationTypes = {
  GET_NETWORKS_INFO: "GET_NETWORKS_INFO",
  GET_NETWORKS_INFO_UPDATE: "GET_NETWORKS_INFO_UPDATE",
  GET_META_DATA: "GET_META_DATA",
  GET_MISSED_BLOCKS: "GET_MISSED_BLOCKS",
  GET_NODE_STATUS: "GET_NODE_STATUS",
  GET_PROJECTS: "GET_PROJECTS",
  GET_HOSTS: "GET_HOSTS",
  GET_STATISTICS: "GET_STATISTICS",
  GET_MUTED_NODES: "GET_MUTED_NODES",
  GET_ALERTING_THRESHOLD_SETTINGS: "GET_ALERTING_THRESHOLD_SETTINGS",
  GET_VALIDATOR_MAPPING: "GET_VALIDATOR_MAPPING",
  SET_LATEST_CHAIN_IDS: "SET_LATEST_CHAIN_IDS"
};

const state = {
  networks: [],
  metadata: [],
  intervalId: null,
  missedBlocks: {
    totalCount: 0,
    history: [],
    byTimeOfDay: []
  },
  nodeStatus: [],
  nodeStatusInterval: null,
  projects: [],
  hosts: [],
  statistics: {
    missedBlocks: [],
    missedBlocksAlert: [],
    peerCount: [],
    lateBlockTimeAlert: [],
    blockHeights: []
  },
  mutedNotes: "",
  alertingThresholdSettings: {},
  validatorMapping: [],
  latestChainIds: {}
};

const getters = {
  getNetworks(state) {
    const out = [];
    state.networks.forEach(network => {
      if (Array.isArray(network.commits)) {
        network.commits.forEach(commit => {
          out.push({
            ...network,
            lastUpdated: DateHelper.timeDifference(
              Date.now(),
              network.blockTime * 1000
            ),
            status: network.catchingUp === "0" ? "Synced" : "Syncing..",
            uptime:
              Math.floor(
                (commit.values.filter(c => c).length / commit.values.length) *
                  100
              ) || 0,
            commits: commit.values.map((c, ind) => ({
              height: network.blockHeight - ind - 1,
              commit: c
            })),
            validatorName: commit.name
          });
        });
      }
    });
    return out;
  },
  getMissedBlocks(state) {
    return state.missedBlocks;
  },
  getNodeStatus(state) {
    return state.nodeStatus;
  },
  getProjects(state) {
    return state.projects;
  },
  getHosts(state) {
    return state.hosts;
  },
  getStatistics(state) {
    return state.statistics;
  },
  getMutedNodes(state) {
    return state.mutedNotes;
  },
  getAlertingThresholdSettings(state) {
    return state.alertingThresholdSettings;
  },
  getValidatorMapping(state) {
    return state.validatorMapping;
  },
  latestChainIds: state => state.latestChainIds
};

const actions = {
  async getLatestChainIds({ commit }) {
    const result = await StakeApi.get("/latest_chain_ids");
    result['cosmos'] = "cosmoshub-4";
    result['kava'] = "kava_2222-10";
    result['band'] = "laozi-mainnet";
    result['starname'] = "iov-mainnet-ibc";
    result['persistence'] = "core-1";
    result['sentinel'] = "sentinelhub-2";
    result['osmosis'] = "osmosis-1";
    result['certik'] = "shentu-2.2";
    result['juno'] = "juno-1";
    result['comdex'] = "comdex-1";
    result['lum'] = "lum-network-1";
    result['evmos'] = "evmos_9001-2";
    result['injective-mainnet'] = "injective-1";
    result['agoric'] = "agoric-3";
    result['akash'] = "akashnet-2";
    result['terrav2'] = "phoenix-1";
    result['celer-v2'] = "sgn-3";
    result['gravity'] = "gravity-bridge-3";
    result['sifchain'] = "sifchain-1";
    result['Tgrade'] = "tgrade-mainnet-1";
    result['stafi'] = "stafihub-1";
    result['passage'] = "passage-1";
    commit(mutationTypes.SET_LATEST_CHAIN_IDS, result);
  },
  async getNetworksInfo({ commit }) {
    const response = await Api.get("/status");
    if (!isEmpty(response)) {
      commit(mutationTypes.GET_NETWORKS_INFO, {
        networks: response
      });
    }
  },
  async liveUpdate({ commit }, { networks }) {
    commit(mutationTypes.GET_NETWORKS_INFO_UPDATE, {
      networks
    });
  },
  async liveUpdateUsingPolling({ commit }) {
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    state.intervalId = setInterval(async () => {
      const response = await Api.get("/status");
      if (!isEmpty(response)) {
        commit(mutationTypes.GET_NETWORKS_INFO_UPDATE, {
          networks: response
        });
      }
    }, 1000);
  },
  stopLiveUpdateUsingPolling({ state }) {
    clearInterval(state.intervalId);
  },
  async getMissedBlocksCount({ commit }, { project, network }) {
    const response = await Api.get(
      `/status/${project}/missed-blocks/count?network=${network}`
    );
    commit(mutationTypes.GET_MISSED_BLOCKS, {
      totalCount: response.count
    });
  },
  async getMissedBlocksHistory({ commit }, { project, network }) {
    const response = await Api.get(
      `/status/${project}/missed-blocks/history?network=${network}`
    );
    commit(mutationTypes.GET_MISSED_BLOCKS, {
      history: response
    });
  },
  async getMissedBlocksByTimeOfDay({ commit }, { project, network }) {
    const response = await Api.get(
      `/status/${project}/missed-blocks/by-time-of-day?network=${network}`
    );
    commit(mutationTypes.GET_MISSED_BLOCKS, {
      byTimeOfDay: response
    });
  },
  async getNodeStatus({ commit }, { project, network, host = "" }) {
    clearInterval(state.nodeStatusInterval);
    const response = await Api.get(
      `/node-status/${project}?network=${network}&host=${host}`
    );
    commit(mutationTypes.GET_NODE_STATUS, response);
    clearInterval(state.nodeStatusInterval);
    state.nodeStatusInterval = setInterval(async () => {
      const response = await Api.get(
        `/node-status/${project}?network=${network}&host=${host}`
      );
      commit(mutationTypes.GET_NODE_STATUS, response);
    }, 2000);
  },
  stopWatchingNodeStatus() {
    clearInterval(state.nodeStatusInterval);
  },
  async getProjects({ commit }) {
    const projects = await Api.get(`/status/projects`);
    commit(mutationTypes.GET_PROJECTS, projects);
  },
  async getHosts({ commit }) {
    const hosts = await Api.get(`/status/hosts`);
    commit(mutationTypes.GET_HOSTS, hosts);
  },
  async getStatistics({ commit }, { project, network, from = "", to = "" }) {
    const [
      missedBlocks,
      missedBlocksAlert,
      peerCount,
      lateBlockTimeAlert,
      blockHeights
    ] = await Promise.all([
      Api.get(
        `/status/statistics/charts/${project}/missed-blocks?network=${network}&from=${from}&to=${to}`
      ),
      Api.get(
        `/status/statistics/charts/${project}/missed-blocks-alert?network=${network}&from=${from}&to=${to}`
      ),
      Api.get(
        `/status/statistics/charts/${project}/peer-count?network=${network}&from=${from}&to=${to}`
      ),
      Api.get(
        `/status/statistics/charts/${project}/late-block-time-alert?network=${network}&from=${from}&to=${to}`
      ),
      Api.get(
        `/status/statistics/charts/${project}/block-heights?network=${network}&from=${from}&to=${to}`
      )
    ]);
    commit(mutationTypes.GET_STATISTICS, {
      missedBlocks,
      missedBlocksAlert,
      peerCount,
      lateBlockTimeAlert,
      blockHeights
    });
  },
  async getMutedNodes({ commit }) {
    const nodes = await Api.get(`/apm-muted-nodes/list`);
    commit(mutationTypes.GET_MUTED_NODES, nodes);
  },
  async muteNodes({ commit }, { node, unmuted }) {
    let nodes = await Api.get(`/apm-muted-nodes/list`);
    if (unmuted) {
      nodes = nodes
        .split(",")
        .filter(n => n !== node)
        .join(",");
    } else {
      if (!nodes.includes(node)) {
        nodes = nodes
          .split(",")
          .filter(n => !!n)
          .concat(node)
          .join(",");
      }
    }
    await Api.get(`/apm-muted-nodes/update?nodes=${nodes}`);
    commit(mutationTypes.GET_MUTED_NODES, nodes);
  },
  async fetchAlertingThresholdSettings({ commit }) {
    const response = await Api.get("/threshold-settings");
    commit(mutationTypes.GET_ALERTING_THRESHOLD_SETTINGS, response);
  },
  async updateAlertingThresholdSettings({ commit }, data) {
    await Api.post("/threshold-settings", data);
    commit(mutationTypes.GET_ALERTING_THRESHOLD_SETTINGS, data);
  },
  async fetchValidatorMapping({ commit }) {
    const data = await Api.get("/validator-addresses");
    commit(mutationTypes.GET_VALIDATOR_MAPPING, data);
  },
  async addValidator({ dispatch }, validator) {
    await Api.post("/validator-addresses", validator);
    await dispatch("fetchValidatorMapping");
  },
  async deleteValidator({ dispatch }, validator) {
    await Api.post("/deregister-validator-addresses", validator);
    await dispatch("fetchValidatorMapping");
  }
};

const mutations = {
  [mutationTypes.GET_NETWORKS_INFO](state, { networks }) {
    state.networks = networks;
  },
  [mutationTypes.GET_NETWORKS_INFO_UPDATE](state, { networks }) {
    state.networks = networks;
  },
  [mutationTypes.GET_META_DATA](state, { metadata }) {
    state.metadata = metadata;
  },
  [mutationTypes.GET_MISSED_BLOCKS](state, data) {
    state.missedBlocks = {
      ...state.missedBlocks,
      ...data
    };
  },
  [mutationTypes.GET_NODE_STATUS](state, data) {
    state.nodeStatus = data;
  },
  [mutationTypes.GET_PROJECTS](state, data) {
    state.projects = data;
  },
  [mutationTypes.GET_HOSTS](state, data) {
    state.hosts = data;
  },
  [mutationTypes.GET_STATISTICS](state, data) {
    state.statistics = data;
  },
  [mutationTypes.GET_MUTED_NODES](state, data) {
    state.mutedNotes = data || "";
  },
  [mutationTypes.GET_ALERTING_THRESHOLD_SETTINGS](state, data) {
    state.alertingThresholdSettings = data;
  },
  [mutationTypes.GET_VALIDATOR_MAPPING](state, data) {
    state.validatorMapping = data;
  },
  [mutationTypes.SET_LATEST_CHAIN_IDS](state, data) {
    state.latestChainIds = data;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
