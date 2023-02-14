<template>
  <div :class="classNames({'loading-global':global})">
    <div id="loading">
      <b-spinner label="Loading..."></b-spinner>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    global: {
      type: Boolean,
      default: false
    }
  },
  name: "v-loading"
};
</script>

<style>
#loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 100;
}
.loading-global {
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  height: calc(100% - 56px);
  z-index: 100;
}
</style>