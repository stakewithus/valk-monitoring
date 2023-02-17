<template>
  <b-card header="Missed blocks" class="w-100">
    <apexchart type="line" height="350" :options="chartOptions" :series="newSeries" />
  </b-card>
</template>

<script>
export default {
  name: "missed-blocks-chart",
  props: {
    series: {
      type: Array,
      default: []
    },
    options: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      chartOptions: {
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [4, 2]
        },
        tooltip: {
          x: {
            show: true,
            format: this.series[0].data.length ? "dd/MM/yyyy HH:mm" : ""
          },
          y: {
            formatter(value, { seriesIndex }) {
              return seriesIndex === 1 ? value + "%" : value;
            }
          }
        },
        grid: {
          borderColor: "#e7e7e7",
          row: {
            colors: ["#f3f3f3", "transparent"],
            opacity: 0.5
          }
        },
        xaxis: {
          type: "datetime"
        },
        yaxis: [
          {
            title: {
              text: "Count"
            },
            labels: {
              formatter: value => Number(value)
            },
            ...this.options.yaxis
          },
          {
            opposite: true,
            title: {
              text: "UpTime(%)"
            },
            min: 0,
            max: 100,
            labels: {
              formatter: value => Number(value)
            }
          }
        ],
        legend: {
          position: "top",
          horizontalAlign: "left",
          floating: true,
          offsetY: -5,
          offsetX: 50,
        }
      }
    };
  },
  computed: {
    newSeries() {
      return [
        {
          name: "Missed Blocks",
          type: "column",
          data: this.series[0].data
        },
        {
          name: "UpTime",
          type: "line",
          data: this.series[1].data
        }
      ];
    }
  }
};
</script>
