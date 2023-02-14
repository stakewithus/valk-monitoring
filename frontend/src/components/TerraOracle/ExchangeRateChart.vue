<template>
  <b-card :header="`Exchange Rate Chart - ${name.toUpperCase()}`" class="w-100">
    <apexchart type="line" height="350" :options="chartOptions" :series="getSeries" />
  </b-card>
</template>

<script>
export default {
  name: "terra-oracle-exchange-rate-chart",
  props: {
    series: {
      type: Array,
      default: () => []
    },
    name: {
      type: String
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
        stroke: {
          width: 2
        },
        legend: {
          position: "top"
        },
        xaxis: {
          title: {
            text: "Block height"
          }
        },
        yaxis: {
          title: {
            text: "Amount"
          },
          labels: {
            formatter(value, { w, dataPointIndex, seriesIndex }) {
              const isAbstain =
                seriesIndex === 1 &&
                dataPointIndex > -1 &&
                w &&
                w.config &&
                w.config.series &&
                w.config.series.slice(-1)[0].data[dataPointIndex].abstain;
              return isAbstain ? "Abstained" : Number(value).toLocaleString();
            }
          },
          ...this.options.yaxis
        }
      }
    };
  },
  computed: {
    getSeries() {
      return [
        {
          name: "Terra Chain",
          data: this.mapData(
            this.series[0].data.slice(-this.maxColumnsDisplayed)
          ),
          type: "line"
        },
        {
          name: "SWU",
          data: this.mapData(
            this.series[1].data
              .slice(-this.maxColumnsDisplayed)
              .map((d, idx) => ({
                x: d.x,
                y: d.y === -1 ? this.series[0].data.slice(-this.maxColumnsDisplayed)[idx].y : d.y,
                abstain: d.y === -1
              }))
          ),
          type: "line"
        }
      ];
    }
  },
  methods: {
    mapData(data) {
      return data.map(d => ({
        ...d,
        x: Number(d.x).toLocaleString(),
        y: Number(d.y).toFixed(5)
      }));
    }
  }
};
</script>