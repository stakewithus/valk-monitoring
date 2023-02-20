<template>
  <b-container>
    <h2 v-if="!isNew">Edit user</h2>
    <h2 v-else>Add user</h2>
    <br />
    <UserEdit
      :userInfo="users.detail"
      :submitInfo="users.submit"
      :onSubmit="submit"
      :policies="policy.list.items"
      :isNew="isNew"
    />
  </b-container>
</template>


<script>
import { mapGetters } from "vuex";
import UserEdit from "@/components/User/UserEdit";
import {
  FETCH_USER_DETAIL,
  CREATE_USER,
  UPDATE_USER,
  RESET_USER_EDIT_FORM,
  FETCH_POLICY_LIST
} from "../../store/types/actions.type";

import store from "../../store/";

export default {
  name: "user-edit",
  data() {
    return {};
  },
  components: {
    UserEdit
  },
  async beforeRouteEnter(to, from, next) {
    store.dispatch(FETCH_POLICY_LIST);
    if (to.params.id === "_new") {
      store.dispatch(RESET_USER_EDIT_FORM);
    } else {
      await store.dispatch(FETCH_USER_DETAIL, to.params.id);
    }
    next();
  },
  computed: {
    ...mapGetters(["users", "policy"]),
    isNew() {
      return this.$route.params.id === "_new";
    }
  },
  methods: {
    async submit(payload) {
      const action = this.isNew ? CREATE_USER : UPDATE_USER;
      await this.$store.dispatch(action, payload);
      if (!this.users.submit.error) {
        this.$router.push({
          name: "user"
        });
      }
    }
  }
};
</script>