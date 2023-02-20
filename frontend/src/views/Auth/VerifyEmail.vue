<template>
  <b-container fluid class="auth-container">
    <b-col md="4" offset-md="4" sm="10" offset-sm="1" xs="12" offset-xs="0" class="auth-wrapper">
      <h2 class="text-center">Email Verification</h2>
      <div class="text-center text-info my-2 mt-4 mb-4" v-if="auth.emailVerification.verifying">
        <b-spinner class="align-middle"></b-spinner>
      </div>
      <p
        class="text-center mt-3 mb-0"
        v-if="auth.emailVerification.verifying"
      >We are verifying your email. Please wait for a few seconds...</p>
      <p
        class="text-center text-danger mt-5 mb-0"
        v-if="auth.emailVerification && auth.emailVerification.verifyingError"
      >{{auth.emailVerification.verifyingError.message}}</p>
      <p
        class="text-center mt-5 mb-0"
        v-if="auth.emailVerification.verified"
      >Your email has been verified. Redirecting to <router-link :to="{name:'login'}">Login</router-link>...</p>
      <div class="text-center mt-5" v-if="!auth.emailVerification.verifying">
        <router-link :to="{name:'login'}">Back to Login</router-link>
      </div>
    </b-col>
  </b-container>
</template>

<style scoped>
.auth-container {
  display: flex;
  height: 100%;
  align-items: center;
  background-color: gray;
}
.auth-wrapper {
  background-color: white;
  padding: 40px;
}
</style>

<script>
import { mapGetters } from "vuex";
import { VERIFY_EMAIL, CHECK_AUTH } from "../../store/types/actions.type";

export default {
  name: "verify-email",
  computed: {
    ...mapGetters(["auth"])
  },
  mounted() {
    this.$store.dispatch(CHECK_AUTH).then(() => {
      if (this.auth && this.auth.isAuthenticated) {
        return this.$router.push({ name: "home" });
      }
      this.$store.dispatch(VERIFY_EMAIL, this.$router.currentRoute.query.token);
    });
  }
};
</script>