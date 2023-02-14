<template>
  <b-card header="Network Usage" class="w-100">
    <apexchart type="line" height="650" :options="chartOptions" :series="fullSeries" />
  </b-card>
</template>

<script>
import randomcolor from "randomcolor";

export default {
  name: "network-io-metric",
  props: {
    series: {
      type: Object,
      default: () => ({})
    },
    options: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      chartOptions: {
        grid: {
          borderColor: "#e7e7e7",
          row: {
            colors: ["#f3f3f3", "transparent"],
            opacity: 0.5
          }
        },
        tooltip: {
          x: {
            show: true,
            format: "dd/MM/yyyy HH:mm"
          }
        },
        xaxis: {
          type: "datetime"
        },
        yaxis: {
          title: {
            text: "MB"
          },
          min: 0,
          ...this.options.yaxis
        },
        legend: {
          position: "right",
          offsetY: 5
        },
        stroke: {
          width: 1
        },
        markers: {
          size: 0,
          hover: {
            size: 4
          }
        },
        colors: [
          ...randomcolor({
            count: this.series.received.length,
            hue: "blue"
          }),
          ...randomcolor({
            count: this.series.sent.length,
            hue: "red"
          })
        ],
        dataLabels: {
          enabled: false
        }
      }
    };
  },
  computed: {
    fullSeries() {
      return [...this.series.received, ...this.series.sent];
    }
  }
};
</script>
