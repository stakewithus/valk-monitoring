import {
  mergeDeep
} from '../common/utils';
import devConfig from './dev';
import prodConfig from './prod';

let config = devConfig; // eslint-disable-line
if (process.env.NODE_ENV === 'production') {
  config = mergeDeep(devConfig, prodConfig);
}

export default config;