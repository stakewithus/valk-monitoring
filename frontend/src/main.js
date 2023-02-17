import Vue from 'vue';
import {
  sync
} from 'vuex-router-sync';
import vSelect from 'vue-select';
import VueApexCharts from 'vue-apexcharts';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import App from './App.vue';
import router from './router';
import store from './store';
import './common/plugins';
import {
  CHECK_AUTH
} from './store//types/actions.type';
import vLoading from './components/Loading';
import './common/filters';
import './registerServiceWorker';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import './styles.css';
import 'vue-select/dist/vue-select.css';

sync(store, router);

Vue.component('v-select', vSelect);
Vue.component('v-loading', vLoading);
Vue.component('apexchart', VueApexCharts)
Vue.component('font-awesome-icon', FontAwesomeIcon)

Vue.config.productionTip = false;

router.beforeEach((to, from, next) => {
  if (to.meta && to.meta.requiresAuth === false) return next();
  return Promise.all([store.dispatch(CHECK_AUTH, to)]).then(next);
});

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');