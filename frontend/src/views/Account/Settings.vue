<template>
  <b-col md="6" offset-md="3" sm="8" offset-sm="2" xs="12" offset-xs="0">
    <b-tabs content-class="mt-3">
      <b-tab title="Change password" active>
        <ChangePassword />
      </b-tab>
      <b-tab title="Two-Factor Authentication">
        <TwoFactorAuthentication :account="account" @enable2Fa="enable2Fa" @confirm2Fa="confirm2Fa" :disable2Fa="disable2Fa" />
      </b-tab>
    </b-tabs>
  </b-col>
</template>

<script>
import { mapGetters } from "vuex";
import {
  ChangePassword,
  TwoFactorAuthentication
} from "@/components/Account";
import {
  FETCH_OWN_PROFILE,
  ENABLE_2FA,
  CONFIRM_ENABLE_2FA,
  DISABLE_2FA,
} from "../../store/types/actions.type";

export default {
  name: "settings",
  components: {
    ChangePassword,
    TwoFactorAuthentication
  },
  computed: {
    ...mapGetters(["account"])
  },
  methods: {
    getOwnProfile() {
      this.$store.dispatch(FETCH_OWN_PROFILE);
    },
    async enable2Fa() {
      return this.$store.dispatch(ENABLE_2FA);
    },
    async confirm2Fa(verificationCode) {
      return this.$store.dispatch(CONFIRM_ENABLE_2FA, verificationCode);
    },
    async disable2Fa(verificationCode) {
      return this.$store.dispatch(DISABLE_2FA, verificationCode);
    }
  },
  mounted() {
    this.getOwnProfile();
  }
};
</script>