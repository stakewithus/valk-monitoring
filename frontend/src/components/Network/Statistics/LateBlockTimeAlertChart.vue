<template>
  <b-card header="Late block time alert" class="w-100">
    <apexchart type="heatmap" height="350" :options="chartOptions" :series="series" />
  </b-card>
</template>

<script>
import { weekdaysShort } from "moment";
const DAYS = weekdaysShort().reverse();
export default {
  name: "late-block-time-alert-chart",
  props: {
    series: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      chartOptions: {
        dataLabels: {
          enabled: false
        },
        plotOptions: {
          heatmap: {
            enableShades: false,
            colorScale: {
              ranges: [
                {
                  from: 1,
                  to: 1,
                  color: "#FFC107",
                  name: "Warning"
                },
                {
                  from: 2,
                  to: Infinity,
                  color: "#DC3545",
                  name: "Critical"
                }
              ]
            }
          }
        },
        xaxis: {
          tickAmount: 24
        },
        tooltip: {
          followCursor: false,
          y: {
            formatter(val, { series, seriesIndex, dataPointIndex, w }) {
              const meta =
                w.config.series[seriesIndex].data[dataPointIndex].meta;
              return `
                    <div>
                      <div>${DAYS[seriesIndex]} at ${dataPointIndex}</div>
                      <hr class="mb-2 mt-1"/>
                      <div class="text-danger">Critical: ${meta.CRITICAL || 0}</div>
                      <div class="text-warning">Warning: ${meta.WARNING || 0}</div>
                    </div>
                `;
            },
            title: {
              formatter: seriesName => undefined
            }
          }
        },
        colors: ["#FFF"],
        grid: {
          show: true,
          borderColor: "#EEE",
          strokeDashArray: 0
        },
        legend: {
          // show: false
        },
        stroke: {
          width: 1,
          colors: ["#EEE"]
        }
      }
    };
  }
};
</script>
