<template>
  <div class="p-3 bg-light border rounded d-flex flex-column align-items-center flex-1">
    <apexchart type="donut" width="180" :options="chartOptions" :series="series" />
    <div>Health checks</div>
  </div>
</template>

<script>
import { arraySum } from "../../common/utils";
export default {
  name: "terra-oracle-health-check",
  props: {
    series: {
      type: Array
    }
  },
  data() {
    return {
      chartOptions: {
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
                  fontSize: "40px",
                  offsetY: 10,
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
      }
    };
  }
};
</script>