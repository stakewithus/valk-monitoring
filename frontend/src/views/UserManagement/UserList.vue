<template>
  <div>
    <div class="d-flex justify-content-between align-items-center">
      <h2>User listings</h2>
      <b-button
        type="button"
        :to="{ name: 'user-edit', params: { id: '_new' } }"
        variant="primary"
      >Add user</b-button>
    </div>
    <br />
    <UserList :list="users.list" @onDeleteUser="deleteUser" />
  </div>
</template>


<script>
import { mapGetters } from "vuex";
import { FETCH_USER_LIST, DELETE_USER } from "../../store/types/actions.type";
import UserList from "@/components/User/UserList";

export default {
  name: "user-list",
  components: {
    UserList
  },
  computed: {
    ...mapGetters(["users"])
  },
  mounted() {
    this.fetchUsers();
  },
  methods: {
    async fetchUsers(params) {
      await this.$store.dispatch(FETCH_USER_LIST, params);
    },
    async deleteUser(user) {
      const r = window.confirm(`Delete this user?`);
      if (r) {
        await this.$store.dispatch(DELETE_USER, user);
        if (this.users.delete.error) {
          alert(this.users.delete.error.message);
        } else {
          this.fetchUsers();
        }
      }
    }
  }
};
</script>