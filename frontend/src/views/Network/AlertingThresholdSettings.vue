<template>
  <div>
    <h3>Alerting threshold settings</h3>
    <br />
    <alerting-threshold-settings
      :settings="settings"
      :state="state"
      :projects="projects"
      @onUpdate="updateSettings"
    />
  </div>
</template>

<script>
import AlertingThresholdSettings from "@/components/Network/AlertingThresholdSettings";
import { mapGetters } from "vuex";
export default {
  name: "alerting-threshold-settings-view",
  components: {
    AlertingThresholdSettings
  },
  data() {
    return {
      state: {
        fetching: false,
        fetchingError: null,
        updating: false,
        updatingError: null
      }
    };
  },
  computed: {
    ...mapGetters({
      settings: "networks/getAlertingThresholdSettings",
      projects: "networks/getProjects"
    })
  },
  methods: {
    async fetchSettings() {
      this.state.fetching = true;
      this.state.fetchingError = null;
      try {
        await this.$store.dispatch("networks/fetchAlertingThresholdSettings");
      } catch (error) {
        this.state.fetchingError = error;
      }
      this.state.fetching = false;
    },
    async updateSettings(data) {
      this.state.updating = true;
      this.state.updatingError = null;
      try {
        await this.$store.dispatch(
          "networks/updateAlertingThresholdSettings",
          data
        );
      } catch (error) {
        this.state.updatingError = error;
      }
      this.state.updating = false;
    }
  },
  created() {
    this.fetchSettings();
    this.$store.dispatch("networks/getProjects");
  }
};
</script>