<template>
  <div>
    <b-container fluid class="pl-0 pr-0 pb-3">
      <h3>{{projectName}} statistics</h3>
      <div class="d-flex justify-content-start mt-3">
        <b-col cols="12" class="p-0">
          <b-form inline>
            <label for="projects" class="mb-0">Project</label>
            <v-select
              id="projects"
              class="project-select"
              placeholder="Filter by project"
              v-model="search.project"
              :options="projects"
              :reduce="item => item.code"
              label="label"
              :clearable="false"
            ></v-select>
          </b-form>
        </b-col>
      </div>
      <div class="d-flex justify-content-start mt-3">
        <b-col cols="12" class="p-0">
          <b-form inline>
            <label for="dateRange" class="mb-0">Date Range</label>
            <date-range-picker
              class="ml-2"
              id="dateRange"
              ref="picker"
              opens="right"
              v-model="search.dateRanges"
              :auto-apply="true"
              :locale-data="{ firstDay: 0, format: 'MM/DD/YYYY' }"
              :ranges="dateRanges"
            >
              <div slot="input" slot-scope="picker" class="datepicker-input">
                <div
                  class="text-left"
                  v-if="picker.startDate&&picker.endDate"
                >{{ picker.startDate | moment("MM/DD/YYYY") }} - {{ picker.endDate | moment("MM/DD/YYYY") }}</div>
                <div v-else class="placeholder">All time</div>
              </div>
            </date-range-picker>
            <b-button
              :disabled="!search.dateRanges.startDate||!search.dateRanges.endDate"
              class="ml-1"
              variant="light"
              size="sm"
              @click="search.dateRanges={}"
            >Clear</b-button>
          </b-form>
        </b-col>
      </div>
      <div class="position-relative">
        <div v-if="!fetching">
          <div class="mt-3 d-flex flex-wrap">
            <b-col md="6" sm="12" cols="12">
              <b-row class="pr-sm-1">
                <missed-blocks-chart
                  v-if="statistics.missedBlocks[0]"
                  :series="statistics.missedBlocks"
                  :options="missedBlocksOptions"
                ></missed-blocks-chart>
              </b-row>
            </b-col>
            <b-col md="6" sm="12" cols="12" class="mt-2 mt-sm-0">
              <b-row class="pl-sm-1">
                <block-heights-chart
                  :series="statistics.blockHeights"
                  :options="blockHeightsOptions"
                ></block-heights-chart>
              </b-row>
            </b-col>
          </div>
          <div class="mt-2 d-flex flex-wrap">
            <b-col md="6" sm="12" cols="12">
              <b-row class="pr-sm-1">
                <missed-blocks-alert-chart :series="statistics.missedBlocksAlert"></missed-blocks-alert-chart>
              </b-row>
            </b-col>
            <b-col md="6" sm="12" cols="12" class="mt-2 mt-sm-0">
              <b-row class="pl-sm-1">
                <late-block-time-alert-chart :series="statistics.lateBlockTimeAlert"></late-block-time-alert-chart>
              </b-row>
            </b-col>
          </div>
          <div class="mt-2 d-flex flex-wrap">
            <b-col md="6" sm="12" cols="12">
              <b-row class="pr-sm-1">
                <peer-count-chart
                  :series="statistics.peerCount"
                  :options="peerCountOptions"
                  :alert="peerCountThresholds"
                ></peer-count-chart>
              </b-row>
            </b-col>
          </div>
        </div>
        <div class="position-absolute w-100" style="top:200px;">
          <v-loading v-if="fetching" />
        </div>
      </div>
    </b-container>
  </div>
</template>
<style>
.project-select {
  margin-left: 43px;
  width: 273px;
}
.reportrange-text {
  height: 34px;
}
.datepicker-input {
  color: #333;
  width: 250px;
}
.datepicker-input .placeholder {
  opacity: 0.7;
}
</style>
<script>
import DateRangePicker from "vue2-daterange-picker";
import "vue2-daterange-picker/dist/vue2-daterange-picker.css";
import moment from "moment";
import { mapGetters } from "vuex";
import {
  MissedBlocksChart,
  MissedBlocksAlertChart,
  PeerCountChart,
  LateBlockTimeAlertChart,
  BlockHeightsChart
} from "@/components/Network/Statistics";
import _get from "lodash.get";

export default {
  name: "statistics-view",
  components: {
    MissedBlocksChart,
    MissedBlocksAlertChart,
    PeerCountChart,
    LateBlockTimeAlertChart,
    DateRangePicker,
    BlockHeightsChart
  },
  data() {
    return {
      fetching: false,
      search: {
        project: "",
        dateRanges: {
          startDate: moment()
            .subtract(13, "day")
            .startOf("day")
            .toDate(),
          endDate: moment()
            .endOf("d")
            .toDate()
        }
      },
      dateRanges: {
        "This week": [moment().startOf("week"), moment().endOf("week")],
        "This month": [moment().startOf("month"), moment().endOf("month")],
        "This year": [moment().startOf("year"), moment().endOf("year")],
        "Last 7 days": [
          moment()
            .subtract(6, "day")
            .startOf("day"),
          moment().endOf("day")
        ],
        "Last 14 days": [
          moment()
            .subtract(13, "day")
            .startOf("day"),
          moment().endOf("day")
        ],
        "Last 30 days": [
          moment()
            .subtract(29, "day")
            .startOf("day"),
          moment().endOf("day")
        ],
        "Last 90 days": [
          moment()
            .subtract(89, "day")
            .startOf("day"),
          moment().endOf("day")
        ]
      }
    };
  },

  watch: {
    $route() {
      this.fetchProjects();
      this.fetchData();
      this.fetchAlertingThresholds();
    },
    ["search.project"](newProject, oldProject) {
      if (!oldProject) return;
      this.search.host = "";
      this.$router.replace({
        name: "network-statistics",
        params: {
          networkName: this.getNetworkByProject(newProject),
          projectName: newProject
        }
      });
    },
    ["search.dateRanges"]() {
      this.fetchData();
    }
  },
  methods: {
    async fetchData() {
      this.fetching = true;
      await this.$store.dispatch("networks/getStatistics", {
        network: this.networkName,
        project: this.projectName,
        from:
          this.search.dateRanges.startDate &&
          this.search.dateRanges.startDate.valueOf(),
        to:
          this.search.dateRanges.endDate &&
          this.search.dateRanges.endDate.valueOf()
      });
      this.fetching = false;
    },
    async fetchProjects() {
      this.$store.dispatch("networks/getProjects");
    },
    async fetchAlertingThresholds() {
      this.$store.dispatch("networks/fetchAlertingThresholdSettings");
    },
    getNetworkByProject(projectName) {
      const prj = this.rawProjects.find(pr => pr.project === projectName);
      return prj ? prj.network : "";
    }
  },
  computed: {
    networkName() {
      return this.$store.state.route.params.networkName;
    },
    projectName() {
      return this.$store.state.route.params.projectName;
    },
    ...mapGetters({
      statistics: "networks/getStatistics",
      rawProjects: "networks/getProjects",
      alertingThresholdSettings: "networks/getAlertingThresholdSettings"
    }),
    projects() {
      return this.rawProjects.map(pr => ({
        code: pr.project,
        label: pr.project
      }));
    },
    peerCountThresholds() {
      let warning = 0;
      let critical = 0;
      if (this.alertingThresholdSettings) {
        warning = _get(
          this.alertingThresholdSettings,
          "defaultSettings.peerCounts.warning",
          0
        );
        warning = _get(
          this.alertingThresholdSettings,
          `customSettings.${this.projectName.substring(4)}.peerCounts.warning`,
          warning
        );
        critical = _get(
          this.alertingThresholdSettings,
          "defaultSettings.peerCounts.critical",
          0
        );
        critical = _get(
          this.alertingThresholdSettings,
          `customSettings.${this.projectName.substring(4)}.peerCounts.critical`,
          critical
        );
      }
      return {
        warning,
        critical
      };
    },
    missedBlocksOptions() {
      const min = 0;
      let max = 0;
      let tickAmount = 10;
      let bucket = 500;
      const maxValue = Math.max(
        ...this.statistics.missedBlocks[0].data.map(({ x, y }) => y),
        0
      );
      if (maxValue <= 200) {
        bucket = 200;
      }
      if (maxValue <= 100) {
        bucket = 100;
        tickAmount = 5;
      }
      if (maxValue <= 50) {
        bucket = 50;
      }
      if (maxValue <= 20) {
        bucket = 25;
      }
      max = Math.ceil(maxValue / bucket) * bucket;
      return {
        yaxis: {
          tickAmount: tickAmount,
          min,
          max: !maxValue ? bucket : max
        }
      };
    },
    peerCountOptions() {
      const min = 0;
      let max = 0;
      let tickAmount = 10;
      const maxValue = Math.max(
        ...this.statistics.peerCount
          .reduce(
            (acc, cur) => {
              acc.data = acc.data.concat(cur.data);
              return acc;
            },
            { data: [] }
          )
          .data.map(({ x, y }) => y),
        0
      );
      max = Math.ceil(maxValue / 50) * 50;
      return {
        yaxis: {
          tickAmount: !max ? 10 : tickAmount,
          min,
          max: !max ? 50 : max
        }
      };
    },
    blockHeightsOptions() {
      let min = 0;
      let max = 0;
      let bucket = 1000;
      let tickAmount = 10;
      const blockHeightValues = this.statistics.blockHeights
        .reduce(
          (acc, cur) => {
            acc.data = acc.data.concat(cur.data);
            return acc;
          },
          { data: [] }
        )
        .data.map(({ x, y }) => y);
      const maxValue = Math.max(...blockHeightValues, 0);
      let minValue = Math.min(...blockHeightValues);
      if (minValue === Infinity) {
        minValue = 0;
      }
      min = Math.floor(minValue / bucket) * bucket;
      max = Math.ceil(maxValue / bucket) * bucket;
      return {
        yaxis: {
          tickAmount: !max ? 10 : tickAmount,
          min,
          max: !max ? bucket : max
        }
      };
    }
  },
  created() {
    this.search.project = this.projectName;
    this.fetchData();
    this.fetchProjects();
    this.fetchAlertingThresholds();
  }
};
</script>