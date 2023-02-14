<template>
  <b-container fluid class="auth-container">
    <b-col md="4" offset-md="4" sm="10" offset-sm="1" xs="12" offset-xs="0" class="auth-wrapper">
      <h2 class="text-center">Reset your password</h2>
      <div v-if="!auth.forgotPassword || !auth.forgotPassword.submitted" class="mt-4">
        <b-form @submit.prevent="onSubmit" class="position-relative">
          <b-form-group id="username-group" label="Enter your email address and we will send you a link to reset your password." label-for="username">
            <b-form-input
              id="username"
              type="email"
              v-model.trim="form.username"
              required
              placeholder="Enter your email address"
              aria-describedby="input-username-feedback"
              @blur="validateUsername($event.target.value)"
              @input="onUsernameChange"
              :state="formValid.username"
            ></b-form-input>
            <b-form-invalid-feedback id="input-username-feedback">Must be a valid email.</b-form-invalid-feedback>
          </b-form-group>
          <div
            v-if="auth && auth.forgotPassword && auth.forgotPassword.error"
            class="text-danger mb-2"
          >{{auth.forgotPassword.error.message}}</div>
          <div class="mt-3">
            <b-button type="submit" variant="info" class="w-100">Send password reset email</b-button>
          </div>
          <v-loading v-if="auth.forgotPassword.submitting" />
        </b-form>
      </div>
      <div v-if="auth.forgotPassword && auth.forgotPassword.submitted" class="mt-4">
        <p>Check your email for a link to reset your password. If it doesn’t appear within a few minutes, check your spam folder.</p>
      </div>
      <div class="text-center mt-3">
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
import { isEmailValid } from "../../common/utils";
import {
  CHECK_AUTH,
  FORGOT_PASSWORD,
} from "../../store/types/actions.type";

export default {
  name: "forgot-password",
  data() {
    return {
      form: {
        username: ""
      },
      formValid: {
        username: null
      }
    };
  },
  computed: {
    ...mapGetters(["auth"])
  },
  methods: {
    validateUsername(value) {
      this.formValid.username = isEmailValid(value);
    },
    onUsernameChange(value) {
      if (isEmailValid(value)) {
        this.formValid.username = true;
      }
    },
    async onSubmit() {
      this.validateUsername(this.form.username);
      if (!this.formValid.username) return;
      await this.$store.dispatch(FORGOT_PASSWORD, this.form.username);
    }
  },
  async mounted() {
    await this.$store.dispatch(CHECK_AUTH);
    if (this.auth && this.auth.isAuthenticated) {
      this.$router.push({ name: "home" });
      return;
    }
  }
};
</script>