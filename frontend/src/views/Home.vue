<template>
  <div>
    <Header />
    <b-container fluid class="main-content-wrapper">
      <router-view></router-view>
    </b-container>
  </div>
</template>

<script>
import Header from "../components/Header.vue";

export default {
  name: "home",
  components: {
    Header
  }
};
</script>
<style scoped>
.main-content-wrapper {
  margin-top: 20px;
}
</style>