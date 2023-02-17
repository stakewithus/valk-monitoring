import classNames from 'classnames';

export default {
  install(Vue, options) {
    Vue.prototype.classNames = classNames;
  }
};