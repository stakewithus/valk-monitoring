<template>
  <b-card header="Peer count" class="w-100">
    <apexchart type="line" height="350" :options="chartOptions" :series="fullSeries" />
  </b-card>
</template>

<script>
import randomcolor from "randomcolor";

export default {
  name: "peer-count-chart",
  props: {
    series: {
      type: Array,
      default: []
    },
    options: {
      type: Object,
      default: {}
    },
    alert: {
      type: Object,
      default: {}
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
            text: "Peer count(total)"
          },
          min: 0,
          ...this.options.yaxis
        },
        legend: {
          position: "right",
          offsetY: 5
        },
        stroke: {
          width: 2,
        },
        markers: {
          size: 0,
          hover: {
            size: 4
          }
        },
        colors: [
          "#FFC107",
          "#DC3545",
          ...randomcolor({
            count: this.series.length,
            hue: "blue"
          })
        ]
      }
    };
  },
  computed: {
    fullSeries() {
      const firstXs = this.series.map(sr => {
        return sr.data[0].x;
      });
      const lastXs = this.series.map(sr => {
        return sr.data.slice(-1)[0].x;
      });
      const min = Math.min(...firstXs);
      const max = Math.max(...lastXs);

      return [
        {
          name: `Warning`,
          data: [
            {
              x: min,
              y: this.alert.warning
            },
            {
              x: max,
              y: this.alert.warning
            }
          ]
        },
        {
          name: `Critical`,
          data: [
            {
              x: min,
              y: this.alert.critical
            },
            {
              x: max,
              y: this.alert.critical
            }
          ]
        },
        ...this.series
      ];
    }
  }
};
</script>
