<template>
  <b-container fluid class="auth-container">
    <b-col md="4" offset-md="4" sm="10" offset-sm="1" xs="12" offset-xs="0" class="auth-wrapper">
      <h2 class="text-center">Verify your email</h2>
      <div v-if="!state.sent" class="mt-4">
        <b-form @submit.prevent="onSubmit" class="position-relative">
          <b-form-group id="username-group" label="Email:" label-for="username">
            <b-form-input
              id="username"
              type="email"
              v-model="form.username"
              required
              placeholder="youremail@example.com"
              aria-describedby="input-username-feedback"
              @blur="validateUsername($event.target.value)"
              @input="onUsernameChange"
              :state="formValid.username"
            ></b-form-input>
            <b-form-invalid-feedback id="input-username-feedback">Must be a valid email.</b-form-invalid-feedback>
          </b-form-group>
          <div
            v-if="auth && auth.emailVerification && auth.emailVerification.resendingError"
            class="text-danger mb-2"
          >{{auth.emailVerification.resendingError.message}}</div>
          <div class="mt-3">
            <b-button type="submit" variant="info" class="w-100">Resend</b-button>
          </div>
          <v-loading v-if="auth.emailVerification.resending" />
        </b-form>
      </div>
      <div v-if="state.sent" class="mt-4">
        <p>
          An email has been sent to you inbox at
          <strong>{{state.email}}</strong>. Please check and confirm that.
        </p>
        <div class="d-flex align-items-center justify-content-center">
          Didn't receive it?&nbsp;
          <b-button variant="link" class="p-0" @click="onResend">Resend</b-button>
        </div>
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
  RESEND_VERIFICATION_EMAIL,
  RESET_VERIFICATION_EMAIL_FORM
} from "../../store/types/actions.type";

export default {
  name: "resend-email",
  data() {
    return {
      form: {
        username: ""
      },
      state: {
        email: null,
        sent: null
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
    onResend() {
      this.state.sent = false;
      this.form.username = this.state.email;
    },
    async onSubmit() {
      this.validateUsername(this.form.username);
      if (!this.formValid.username) return;
      await this.$store.dispatch(RESEND_VERIFICATION_EMAIL, this.form);
      if (!this.auth.emailVerification.resendingError) {
        this.state.sent = true;
      }
    }
  },
  async mounted() {
    await this.$store.dispatch(CHECK_AUTH);
    if (this.auth && this.auth.isAuthenticated) {
      this.$router.push({ name: "home" });
      return;
    }
    this.$store.dispatch(RESET_VERIFICATION_EMAIL_FORM);
    this.state.email = this.$router.currentRoute.query.email;
    this.state.sent = this.$router.currentRoute.query.sent;
  }
};
</script>