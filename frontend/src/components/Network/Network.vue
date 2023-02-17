<template>
  <b-card class="text-center shadow border-0 card-item">
    <h3>{{network.validatorName}}</h3>
    <h3 class="network-name mt-3">{{network.chainId}}</h3>
    <div class="uptime mt-3">
      <div class="value">{{network.uptime}}%</div>
      <div class="text">UpTime</div>
    </div>
    <div class="commits mt-3">
      <validators-commit
        :commits="network.commits"
        :networkName="network.networkName"
        :projectName="network.projectName"
      />
    </div>
    <div class="mt-2 block-height text-info" v-b-tooltip.bottom.hover title="Last block height">{{network.blockHeight|number}}</div>
    <div class="sentries d-flex align-items-center flex-column mt-2">
      <div>
        <apexchart type="donut" width="220" :options="donutChartOptions" :series="donutSeries" />
      </div>
      <div class="text">
        <router-link
          :to="{name: 'network-sentry-view', params: {networkName: network.networkName, projectName: network.projectName}}"
          v-b-tooltip.hover
          title="Click to view details"
        >Sentries</router-link>
      </div>
    </div>
    <div class="view-more mt-3">
      <b-button
        variant="info"
        :to="{name: 'network-statistics', params: {networkName: network.networkName, projectName: network.projectName}}"
      >Statistics</b-button>
    </div>
  </b-card>
</template>
<style>
.card-item:hover {
  background-color: #eee;
  transform: scale(1.01);
}
.uptime .value {
  line-height: initial;
  font-size: 60px;
}
.uptime .text {
  font-size: 18px;
}
.sentries .value {
  font-size: 60px;
  width: 120px;
  height: 120px;
  border: 2px solid gray;
}
.sentries .text {
  font-size: 20px;
}
.block-height {
  font-size: 50px;
}
</style>
<script>
import ValidatorsCommit from "./ValidatorsCommit.vue";
import { arraySum } from "../../common/utils";
export default {
  props: {
    network: {
      type: Object,
      default() {
        return {};
      }
    }
  },
  components: {
    ValidatorsCommit
  },
  watch: {
    "network.healthChecksBySentry": {
      immediate: true,
      handler(value) {
        if (value) {
          this.numberOfSentry = arraySum(Object.values(value));
          this.donutSeries = [value.passing, value.warning, value.critical];
        }
      }
    }
  },
  data() {
    return {
      donutChartOptions: {
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "",
                  formatter: function(w) {
                    return arraySum(w.globals.seriesTotals);
                  }
                },
                name: {
                  show: false
                },
                value: {
                  show: true,
                  fontSize: "50px",
                  offsetY: 15,
                  formatter: function(val, w) {
                    return arraySum(w.globals.seriesTotals);
                  }
                }
              }
            }
          }
        },
        labels: ["Passing", "Warning", "Critical"],
        colors: ["#28a745", "#ffc107", "#dc3545"],
        dataLabels: {
          enabled: false
        },
        legend: {
          show: false
        }
      },
      numberOfSentry: 0,
      donutSeries: []
    };
  }
};
</script>
