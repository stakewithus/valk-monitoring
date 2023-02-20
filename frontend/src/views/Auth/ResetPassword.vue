<template>
  <b-container fluid class="auth-container">
    <b-col md="4" offset-md="4" sm="10" offset-sm="1" xs="12" offset-xs="0" class="auth-wrapper">
      <h2 class="text-center">Reset your password</h2>
      <b-form
        v-if="!auth.resetPassword || !auth.resetPassword.submitted"
        @submit.prevent="onSubmit"
        class="mt-4 position-relative"
      >
        <b-form-group id="password-group" label="Password:" label-for="password">
          <b-form-input
            id="password"
            type="password"
            v-model.trim="form.password"
            required
            placeholder="Enter your password"
            aria-describedby="input-password-feedback"
            @blur="validatePassword($event.target.value)"
            @input="onPasswordChange"
            :state="formValid.password"
          ></b-form-input>
          <b-form-invalid-feedback
            id="input-password-feedback"
          >Must have eight characters minimum and must contain at least one uppercase letter, one lowercase letter, one number and one special character.</b-form-invalid-feedback>
        </b-form-group>
        <b-form-group id="retypepwd-group" label="Confirm password:" label-for="retypepwd">
          <b-form-input
            id="retypepwd"
            type="password"
            v-model.trim="form.confirmPassword"
            required
            placeholder="Re-type your password"
            aria-describedby="input-retypepwd-feedback"
            @blur="validateConfirmPassword($event.target.value)"
            :state="formValid.confirmPassword"
          ></b-form-input>
          <b-form-invalid-feedback id="input-retypepwd-feedback">Passwords don't match.</b-form-invalid-feedback>
        </b-form-group>
        <div
          v-if="auth && auth.resetPassword && auth.resetPassword.error"
          class="error-msg"
        >{{auth.resetPassword.error.message}}</div>
        <div class="mt-4">
          <b-button type="submit" variant="info" class="w-100">Reset your password</b-button>
        </div>
        <v-loading v-if="auth.resetPassword.submitting" />
      </b-form>
      <div v-if="auth.resetPassword && auth.resetPassword.submitted">
        <p class="text-center mt-5 mb-0">
          Your password has been updated. Redirecting to
          <router-link :to="{name:'login'}">Login</router-link>...
        </p>
        <div class="text-center mt-5" v-if="!auth.emailVerification.verifying">
          <router-link :to="{name:'login'}">Back to Login</router-link>
        </div>
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
.error-msg {
  color: red;
  margin-bottom: 15px;
}
</style>
<script>
import { mapGetters } from "vuex";
import { RESET_PASSWORD, CHECK_AUTH } from "../../store/types/actions.type";
import { isPasswordValid } from "../../common/utils";

export default {
  name: "reset-password",
  data() {
    return {
      form: {
        password: "",
        confirmPassword: ""
      },
      formValid: {
        password: null,
        confirmPassword: null
      }
    };
  },
  computed: {
    ...mapGetters(["auth"])
  },
  methods: {
    validatePassword(value) {
      this.formValid.password = isPasswordValid(value);
    },
    onPasswordChange(value) {
      if (isPasswordValid(value)) {
        this.formValid.password = true;
      }
      if (this.form.confirmPassword && this.form.confirmPassword !== value) {
        this.formValid.confirmPassword = false;
      }
    },
    validateConfirmPassword(value) {
      if (!this.form.password && !value) return;
      this.formValid.confirmPassword = this.form.password === value;
    },
    isFormValid(form) {
      return !Object.values(form).some(v => !v);
    },
    onSubmit() {
      this.validatePassword(this.form.password);
      this.validateConfirmPassword(this.form.confirmPassword);
      if (!this.isFormValid(this.formValid)) return;
      this.$store.dispatch(RESET_PASSWORD, {
        password: this.form.password,
        token: this.$router.currentRoute.query.token
      });
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