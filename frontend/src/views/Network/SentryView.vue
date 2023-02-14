<template>
  <div>
    <h3 v-if="!!this.search.project">Sentries of {{projectName}}</h3>
    <h3 v-if="!this.search.project">Sentries of {{hostFilterting}}</h3>
    <b-container fluid class="d-flex flex-wrap pl-0 pr-0">
      <b-col cols="12" sm="6" md="3" class="d-flex align-items-center p-0">
        <label class="mr-2 mb-0" for="projects">Project</label>
        <v-select
          id="projects"
          class="flex-1"
          placeholder="Filter by project"
          v-model="search.project"
          :options="projects"
          :reduce="item => item.code"
          label="label"
          :clearable="false"
        ></v-select>
      </b-col>
      <b-col cols="12" sm="6" md="3" class="d-flex align-items-center mt-2 mt-sm-0 p-0">
        <label class="ml-3 mr-2 mb-0" for="hosts">Host</label>
        <v-select
          id="hosts"
          class="flex-1"
          placeholder="Filter by host"
          v-model="search.host"
          :options="hosts"
          :reduce="item => item.code"
        ></v-select>
      </b-col>
    </b-container>
    <br />
    <sentry-table
      :nodeStatus="nodeStatus"
      :fetching="fetching"
      :muteNodes="muteNodes"
      :mutedNodes="mutedNodes"
      :filteringByProject="!!this.search.project"
    ></sentry-table>
    <div class="text-danger text-center mt-3" v-if="error">
      <p>{{error.message || error}}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import SentryTable from "@/components/Network/SentryView/SentryTable";

export default {
  name: "sentry-view",
  components: {
    SentryTable
  },
  data() {
    return {
      fetching: false,
      error: null,
      search: {
        project: "",
        host: ""
      }
    };
  },
  watch: {
    $route() {
      this.$store.dispatch("networks/stopWatchingNodeStatus");
      this.init();
    },
    ["search.project"](newProject, oldProject) {
      this.$store.dispatch("networks/stopWatchingNodeStatus");
      if (!newProject) return;
      if (!this.rawProjects || !this.rawProjects.length) return;
      this.$router.replace({
        name: "network-sentry-view",
        params: {
          networkName: this.getNetworkByProject(newProject),
          projectName: newProject
        }
      });
    },
    ["search.host"](newHost = "", oldHost) {
      this.$store.dispatch("networks/stopWatchingNodeStatus");
      this.$router.replace({
        name: "network-sentry-view",
        params: {
          networkName: this.getNetworkByProject(this.projectName),
          projectName: this.projectName
        },
        query: {
          host: newHost
        }
      });
    }
  },
  computed: {
    networkName() {
      return this.$store.state.route.params.networkName;
    },
    projectName() {
      return this.$store.state.route.params.projectName;
    },
    hostFilterting() {
      return this.$store.state.route.query.host || "";
    },
    ...mapGetters({
      nodeStatus: "networks/getNodeStatus",
      rawProjects: "networks/getProjects",
      rawHosts: "networks/getHosts",
      mutedNodes: "networks/getMutedNodes"
    }),
    projects() {
      return this.rawProjects.map(pr => ({
        code: pr.project,
        label: pr.project
      }));
    },
    hosts() {
      return this.rawHosts.map(host => ({
        code: host,
        label: host
      }));
    }
  },
  methods: {
    async fetchProjects() {
      this.$store.dispatch("networks/getProjects");
    },
    async fetchHosts() {
      this.$store.dispatch("networks/getHosts");
    },
    async fetchData() {
      this.error = null;
      this.fetching = true;
      try {
        await this.$store.dispatch("networks/getNodeStatus", {
          network: this.networkName,
          project: this.projectName,
          host: this.hostFilterting
        });
      } catch (error) {
        this.error = error;
      } finally {
        this.fetching = false;
      }
    },
    getNetworkByProject(projectName) {
      const prj = this.rawProjects.find(pr => pr.project === projectName);
      return prj ? prj.network : "";
    },
    async fetchMutedNodes() {
      await this.$store.dispatch("networks/getMutedNodes");
    },
    async muteNodes(node, unmuted) {
      await this.$store.dispatch("networks/muteNodes", { node, unmuted });
    },
    init() {
      this.fetchProjects();
      this.fetchHosts();
      this.fetchData();
      this.fetchMutedNodes();
      if (this.hostFilterting) {
        this.search.host = this.hostFilterting;
        this.search.project = "";
      } else {
        this.search.project = this.projectName;
        this.search.host = "";
      }
    }
  },
  created() {
    this.init();
  },
  destroyed() {
    this.$store.dispatch("networks/stopWatchingNodeStatus");
  }
};
</script>