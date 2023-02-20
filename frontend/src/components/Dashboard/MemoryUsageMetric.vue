<template>
  <b-card header="Memory Usage" class="w-100">
    <apexchart type="area" height="350" :options="chartOptions" :series="fullSeries" />
  </b-card>
</template>

<script>
import randomcolor from "randomcolor";

export default {
  name: "cpu-usage-metric",
  props: {
    series: {
      type: Array,
      default: () => []
    },
    options: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      chartOptions: {
        chart: {
          stacked: true
        },
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
            text: undefined
          },
          // min: 10,
          // max: 50,
          // tickAmount: 5,
          labels: {
            formatter: value => Number(value) + " MB"
          }
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
            count: this.series.length,
            hue: "green"
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
      return this.series;
    }
  }
};
</script>
