import devConf from './dev';
import prodConf from './prod';

const mergeDeep = (...objects) => {
  const isObject = (obj) => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal); // eslint-disable-line
      } else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal); // eslint-disable-line
      } else {
        prev[key] = oVal; // eslint-disable-line
      }
    });

    return prev;
  }, {});
};

let config = devConf; // eslint-disable-line
if (process.env.NODE_ENV === 'production') {
  config = mergeDeep(devConf, prodConf);
}

export default config;
