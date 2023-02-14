<template>
  <b-card header="Block heights" class="w-100">
    <apexchart type="line" height="350" :options="chartOptions" :series="series" />
  </b-card>
</template>

<script>
export default {
  name: "block-height-chart",
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
            text: "Block height"
          },
          labels: {
            formatter: value => Number(value).toLocaleString()
          },
          min: 0,
          ...this.options.yaxis
        },
        legend: {
          position: "right",
          offsetY: 5
        },
        stroke: {
          width: 2
        },
        markers: {
          size: 0,
          hover: {
            size: 4
          }
        },
        colors: [
          "#007BFF",
          "#DC3545",
          "#6610F2",
          "#20C997",
          "#FFC107",
          "#343A40",
          "#17A2B8",
          "#28A745"
        ]
      }
    };
  }
};
</script>
