<template>
  <div class="p-3 bg-light border rounded d-flex flex-column align-items-center flex-1">
    <div class="value">{{value | number}}</div>
    <p class="text text-capitalize">misses</p>
  </div>
</template>

<script>
export default {
  name: "terra-oracle-misses",
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