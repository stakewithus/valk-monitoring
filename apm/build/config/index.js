'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _dev = require('./dev');

var _dev2 = _interopRequireDefault(_dev);

var _prod = require('./prod');

var _prod2 = _interopRequireDefault(_prod);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mergeDeep = function mergeDeep() {
  for (var _len = arguments.length, objects = Array(_len), _key = 0; _key < _len; _key++) {
    objects[_key] = arguments[_key];
  }

  var isObject = function isObject(obj) {
    return obj && (typeof obj === 'undefined' ? 'undefined' : (0, _typeof3.default)(obj)) === 'object';
  };

  return objects.reduce(function (prev, obj) {
    (0, _keys2.default)(obj).forEach(function (key) {
      var pVal = prev[key];
      var oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat.apply(pVal, (0, _toConsumableArray3.default)(oVal)); // eslint-disable-line
      } else if (isObject(pVal) && isObject(oVal)) {
        if (key === 'projectSettings') {
          prev[key] = oVal; // eslint-disable-line
        } else {
          prev[key] = mergeDeep(pVal, oVal); // eslint-disable-line
        }
      } else {
        prev[key] = oVal; // eslint-disable-line
      }
    });

    return prev;
  }, {});
};

var config = _dev2.default; // eslint-disable-line
if (process.env.NODE_ENV === 'production') {
  config = mergeDeep(_dev2.default, _prod2.default);
}
exports.default = config;
//# sourceMappingURL=index.js.map
