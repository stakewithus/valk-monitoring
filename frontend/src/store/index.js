import Vue from "vue";
import Vuex from "vuex";

import auth from "./modules/auth.module";
import users from "./modules/users.module";
import policy from "./modules/policy.module";
import account from "./modules/account.module";
import networks from "./modules/networks.module";
import terraOracle from "./modules/terra-oracle.module";
import monit from "./modules/monit.module";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    auth,
    users,
    policy,
    account,
    networks
  }
});
