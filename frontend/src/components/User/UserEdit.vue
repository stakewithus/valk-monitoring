<template>
  <div>
    <b-form @submit.prevent="_onSubmit" class="position-relative">
      <b-form-group id="email-group" label="Email:" label-for="email">
        <b-form-input
          id="email"
          type="email"
          v-model="userInfo.user.username"
          required
          :readonly="!isNew"
          placeholder="email@example.com"
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
          v-model="userInfo.user.password"
          :required="isNew"
          placeholder="Enter password"
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
          v-model.trim="confirmPassword"
          :required="isNew||!!userInfo.user.password"
          placeholder="Re-type password"
          aria-describedby="input-retypepwd-feedback"
          @blur="validateConfirmPassword($event.target.value)"
          :state="formValid.confirmPassword"
        ></b-form-input>
        <b-form-invalid-feedback id="input-retypepwd-feedback">Passwords don't match.</b-form-invalid-feedback>
      </b-form-group>
      <b-form-group id="policies-group" label="Policies:" label-for="policies">
        <v-select
          id="policies"
          v-model="userInfo.user.policies"
          placeholder="Add policies"
          :options="policies"
          :multiple="true"
        ></v-select>
      </b-form-group>
      <div class="d-flex justify-content-flex-end align-items-center">
        <div v-if="userInfo && userInfo.error" class="text-danger flex-1">{{userInfo.error.message}}</div>
        <div
          v-if="submitInfo && submitInfo.error"
          class="text-danger flex-1"
        >{{submitInfo.error.message}}</div>
        <b-button type="button" :to="{ name: 'user' }" class="mr-2">Back</b-button>
        <b-button type="submit" variant="primary">Submit</b-button>
      </div>
      <v-loading v-if="userInfo.fetching || submitInfo.submitting" />
    </b-form>
  </div>
</template>

<script>
import { isEmailValid, isPasswordValid } from "../../common/utils";

export default {
  props: {
    userInfo: {
      type: Object,
      required: true
    },
    submitInfo: {
      type: Object,
      required: true
    },
    onSubmit: {
      type: Function,
      required: true
    },
    policies: {
      type: Array,
      required: true
    },
    isNew: {
      type: Boolean
    }
  },
  data() {
    return {
      confirmPassword: "",
      formValid: {
        username: null,
        password: null,
        confirmPassword: null
      }
    };
  },
  methods: {
    validateUsername(value) {
      if (!this.isNew) return;
      this.formValid.username = isEmailValid(value);
    },
    onUsernameChange(value) {
      if (isEmailValid(value)) {
        this.formValid.username = true;
      }
    },
    validatePassword(value) {
      if (!this.isNew && !value) return;
      this.formValid.password = isPasswordValid(value);
    },
    onPasswordChange(value) {
      if (!this.isNew && !value) {
        this.formValid.password = null;
        return;
      }
      if (isPasswordValid(value)) {
        this.formValid.password = true;
      }
      if (this.confirmPassword && this.confirmPassword !== value) {
        this.formValid.confirmPassword = false;
      }
    },
    validateConfirmPassword(value) {
      if (!this.userInfo.user.password && !value) {
        if (!this.isNew) {
          this.formValid.confirmPassword = null;
        }
        return;
      }
      this.formValid.confirmPassword = this.userInfo.user.password === value;
    },
    isFormValid(form) {
      return !Object.values(form).some(v => v === false || (!v && this.isNew));
    },
    _onSubmit() {
      this.validateUsername(this.userInfo.user.username);
      this.validatePassword(this.userInfo.user.password);
      this.validateConfirmPassword(this.confirmPassword);
      if (!this.isFormValid(this.formValid)) return;
      this.onSubmit(this.userInfo.user);
    }
  }
};
</script>