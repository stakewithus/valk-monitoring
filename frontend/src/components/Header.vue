<template>
  <div>
    <b-navbar toggleable="lg" type="dark" variant="info">
      <b-navbar-brand :to="{name:'home'}">Valk</b-navbar-brand>
      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <template v-for="item in displayedNavs">
            <b-nav-item
              v-if="!item.children"
              :key="item.name"
              :active="routePath.startsWith(item.name)"
              :to="{name: item.name}"
            >{{item.text}}</b-nav-item>
            <b-nav-item-dropdown
              v-else
              :key="item.name"
              :text="item.text"
              :class="classNames({'router-link-exact-active router-link-active active':routePath.startsWith(item.name)})"
            >
              <b-dropdown-item
                v-for="child in item.children"
                :key="child.name"
                :to="{name: child.name}"
              >{{child.text}}</b-dropdown-item>
            </b-nav-item-dropdown>
          </template>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto">
          <b-nav-item-dropdown right>
            <template v-slot:button-content>
              <em v-if="auth && auth.user">{{auth.user.user}}</em>
            </template>
            <b-dropdown-item :to="{name:'settings'}">Settings</b-dropdown-item>
            <b-dropdown-item @click="logout">Log Out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { LOGOUT } from "../store/types/actions.type";
import NAV_ITEMS from "../common/navItems";

export default {
  name: "Header",
  data() {
    return {
      navItems: NAV_ITEMS
    };
  },
  computed: {
    ...mapGetters(["auth"]),
    routePath() {
      return this.$store.state.route.path.substr(1);
    },
    displayedNavs() {
      return NAV_ITEMS.filter(
        nav =>
          !this.auth ||
          !this.auth.user ||
          nav.roles.some(
            role => role.toLowerCase() === this.auth.user.role.toLowerCase()
          )
      );
    }
  },
  methods: {
    logout(e) {
      e.preventDefault();
      this.$store.dispatch(LOGOUT);
    }
  }
};
</script>