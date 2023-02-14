<template>
  <b-card header="Misses Chart by 50 Blocks" class="w-100">
    <apexchart type="bar" height="350" :options="chartOptions" :series="missesSeries" />
  </b-card>
</template>

<script>
export default {
  name: "terra-oracle-misses-chart",
  props: {
    series: {
      type: Array,
      default: () => []
    },
    options: {
      type: Object
    },
    maxColumnsDisplayed: {
      type: Number
    }
  },
  data() {
    return {
      chartOptions: {
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "40%"
          }
        },
        dataLabels: {
          enabled: false
        },
        xaxis: {
          title: {
            text: "Block height"
          }
        },
        yaxis: {
          title: {
            text: "Misses"
          },
          min: 0,
          ...this.options.yaxis
        }
      }
    };
  },
  computed: {
    missesSeries() {
      return [
        {
          name: "Misses",
          data: this.series.slice(-this.maxColumnsDisplayed).map(s => ({
            x: Number(s.x).toLocaleString(),
            y: s.y
          }))
        }
      ];
    }
  }
};
</script>