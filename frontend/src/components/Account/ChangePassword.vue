<template>
  <b-container fluid>
    <b-col md="8" offset-md="2" sm="10" offset-sm="1" xs="12" offset-xs="0">
      <h2 class="text-center">Change password</h2>
      <b-form @submit.prevent="onSubmit" v-if="show" class="mt-4 position-relative">
        <b-form-group
          id="current-password-group"
          label="Current password:"
          label-for="currentPassword"
        >
          <b-form-input
            id="currentPassword"
            type="password"
            v-model.trim="form.currentPassword"
            required
            placeholder="Enter your current password"
            aria-describedby="input-current-password-feedback"
            @blur="validateCurrentPassword($event.target.value)"
            :state="formValid.currentPassword"
          ></b-form-input>
          <b-form-invalid-feedback id="input-current-password-feedback">Required.</b-form-invalid-feedback>
        </b-form-group>
        <b-form-group id="password-group" label="New password:" label-for="password">
          <b-form-input
            id="password"
            type="password"
            v-model.trim="form.newPassword"
            required
            placeholder="Enter your password"
            aria-describedby="input-password-feedback"
            @blur="validatePassword($event.target.value)"
            @input="onPasswordChange"
            :state="formValid.newPassword"
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
          v-if="account && account.changePassword && account.changePassword.submitted"
          class="text-success mb-3"
        >Password changed.</div>
        <div
          v-if="account && account.changePassword && account.changePassword.error"
          class="text-danger mb-3"
        >{{account.changePassword.error.message}}</div>
        <div class="mt-4">
          <b-button type="submit" variant="info" class="w-100">Submit</b-button>
        </div>
        <v-loading v-if="account.changePassword.submitting" />
      </b-form>
    </b-col>
  </b-container>
</template>
<script>
import { mapGetters } from "vuex";
import { CHANGE_PASSWORD } from "../../store/types/actions.type";
import { isPasswordValid } from "../../common/utils";

export default {
  name: "change-password",
  data() {
    return {
      form: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      },
      show: true,
      formValid: {
        currentPassword: null,
        newPassword: null,
        confirmPassword: null
      }
    };
  },
  computed: {
    ...mapGetters(["account"])
  },
  methods: {
    validateCurrentPassword(value) {
      this.formValid.currentPassword = !!value;
    },
    validatePassword(value) {
      this.formValid.newPassword = isPasswordValid(value);
    },
    onPasswordChange(value) {
      if (isPasswordValid(value)) {
        this.formValid.newPassword = true;
      }
      if (this.form.confirmPassword && this.form.confirmPassword !== value) {
        this.formValid.confirmPassword = false;
      }
    },
    validateConfirmPassword(value) {
      if (!this.form.newPassword && !value) return;
      this.formValid.confirmPassword = this.form.newPassword === value;
    },
    isFormValid(form) {
      return !Object.values(form).some(v => !v);
    },
    onSubmit() {
      this.validateCurrentPassword(this.form.currentPassword);
      this.validatePassword(this.form.newPassword);
      this.validateConfirmPassword(this.form.confirmPassword);
      if (!this.isFormValid(this.formValid)) return;
      this.$store.dispatch(CHANGE_PASSWORD, this.form);
    }
  }
};
</script>