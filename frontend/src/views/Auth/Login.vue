<template>
  <b-container fluid class="auth-container">
    <b-col
      md="4"
      offset-md="4"
      sm="10"
      offset-sm="1"
      xs="12"
      offset-xs="0"
      class="auth-wrapper position-relative"
    >
      <h2 class="text-center">
        <span v-if="!isVerifyingCode">Log In</span>
        <span v-else>Two-Factor Authentication</span>
      </h2>
      <b-form @submit.prevent="onSubmit" v-if="!isVerifyingCode" class="mt-4">
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
        <b-form-group id="password-group" label="Password:" label-for="password">
          <b-form-input
            id="password"
            type="password"
            v-model="form.password"
            required
            placeholder="Enter your password"
            aria-describedby="input-password-feedback"
            @blur="validatePassword($event.target.value)"
            @input="validatePassword"
            :state="formValid.password"
          ></b-form-input>
          <b-form-invalid-feedback id="input-password-feedback">Required.</b-form-invalid-feedback>
        </b-form-group>
        <div v-if="auth && auth.loginError" class="mb-2">
          <span class="text-danger">{{auth.loginError.message}}</span>
          <router-link
            v-if="auth.loginError.code==='EMAIL_NOT_VERIFIED'"
            :to="{name:'send-email-verification'}"
          >&nbsp;Resend verification email</router-link>
          <span class="text-danger" v-if="auth.loginError.code==='ACCOUNT_LOCKED_EXCEED_ATTEMPTS'">
            Retry in
            <strong>{{retriesIn}} minutes.</strong>
          </span>
          <span class="text-danger" v-if="auth.loginError.code==='LOGIN_FAILED_WITH_ATTEMPTS'">
            You have
            <strong>{{attemptsLeft}}</strong> attempts left.
          </span>
        </div>
        <b-row class="justify-content-center">
          <b-button variant="link" :to="{name:'forgot-password'}">Don't remember your password?</b-button>
        </b-row>
        <div class="mt-3">
          <b-button type="submit" variant="info" class="w-100">Log In</b-button>
        </div>
      </b-form>
      <div class="mt-4" v-else>
        <p class="text-center">Enter the 6-digit verification code generated by your security app.</p>
        <b-col md="6" offset-md="3" sm="10" offset-sm="1" xs="12" offset-xs="0" class="mt-3">
          <b-form autocomplete="off" @submit.prevent="onSubmit2FA">
            <b-form-input
              autofocus
              id="verificationCode"
              type="text"
              v-model="form.verificationCode"
              placeholder="000000"
              aria-describedby="input-code-feedback"
              class="text-center"
              size="lg"
              @input="onVerificationCodeChange"
              :state="isCodeValid"
            ></b-form-input>
            <b-form-invalid-feedback id="input-code-feedback">Must be a 6-digit code.</b-form-invalid-feedback>
            <b-button variant="info" class="w-100 mt-3" size="lg" type="submit">Continue</b-button>
          </b-form>
        </b-col>
        <div
          class="mt-3 text-center"
          v-if="isVerifyingCode && auth.loginError && auth.loginError.code!=='2FA_REQUIRED'"
        >
          <span class="text-danger">{{auth.loginError.message}}</span>
        </div>
      </div>
      <v-loading v-if="auth.isLoggingIn" />
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
import { LOGIN, CHECK_AUTH } from "../../store/types/actions.type";
import { isEmailValid } from "../../common/utils";

export default {
  name: "login",
  data() {
    return {
      form: {
        username: "",
        password: "",
        verificationCode: ""
      },
      formValid: {
        username: null,
        password: null
      },
      isVerifyingCode: null,
      isCodeValid: null
    };
  },
  computed: {
    ...mapGetters(["auth"]),
    retriesIn() {
      if (
        this.auth &&
        this.auth.loginError &&
        this.auth.loginError.code === "ACCOUNT_LOCKED_EXCEED_ATTEMPTS" &&
        this.auth.loginError.extraInfo &&
        this.auth.loginError.extraInfo.lockedUntil
      ) {
        return Math.ceil(
          (new Date(this.auth.loginError.extraInfo.lockedUntil).valueOf() -
            new Date().valueOf()) /
            60000
        );
      }
      return null;
    },
    attemptsLeft() {
      return (
        this.auth &&
        this.auth.loginError &&
        this.auth.loginError.code === "LOGIN_FAILED_WITH_ATTEMPTS" &&
        this.auth.loginError.extraInfo &&
        this.auth.loginError.extraInfo.attemptsLeft
      );
    }
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
    validatePassword(value) {
      this.formValid.password = !!value;
    },
    isFormValid(form) {
      return !Object.values(form).some(v => !v);
    },
    async onSubmit() {
      if (!this.isFormValid(this.formValid)) {
        this.validateUsername(this.form.username);
        this.validatePassword(this.form.password);
        return;
      }
      await this.$store.dispatch(LOGIN, this.form);
      if (this.auth.loginError) {
        if (this.auth.loginError.code === "2FA_REQUIRED") {
          this.isVerifyingCode = true;
        }
      }
    },
    async onSubmit2FA() {
      if (this.form.verificationCode.length === 6) {
        await this.onSubmit();
        this.form.verificationCode = "";
      } else {
        this.isCodeValid = false;
      }
    },
    async onVerificationCodeChange(value) {
      if (!value) {
        return (this.isCodeValid = null);
      }
      if (isNaN(Number(value)) || value.length > 6) {
        return (this.isCodeValid = false);
      }
    }
  },
  mounted() {
    this.$store.dispatch(CHECK_AUTH).then(() => {
      if (this.auth && this.auth.isAuthenticated) {
        this.$router.push({ name: "home" });
      }
    });
  }
};
</script>