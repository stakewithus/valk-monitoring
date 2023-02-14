<template>
  <div class="p-3 bg-light border rounded d-flex flex-column align-items-center flex-1">
    <div class="value">{{value}}%</div>
    <div class="text">Uptime</div>
    <div class="text-2">Last 50 Voting Periods</div>
  </div>
</template>

<script>
export default {
  name: "terra-oracle-uptime",
  props: {
    value: {
      type: [Number, String]
    }
  }
};
</script>
<style>
.value {
  font-size: 50px;
}

.text {
  font-size: 30px;
}
</style>