import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import VueRouter from 'vue-router';
import VueApexCharts from 'vue-apexcharts';
import VueAxios from 'vue-axios';
import VueMoment from 'vue-moment';
import classNames from './classNames';
import apiRequest from '../services/apiRequest.service';

Vue.use(VueApexCharts)
Vue.use(VueRouter);
Vue.use(BootstrapVue);
Vue.use(VueAxios, apiRequest);
Vue.use(classNames);
Vue.use(VueMoment);
