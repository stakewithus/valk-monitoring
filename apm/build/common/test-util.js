'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _toArray2 = require('babel-runtime/helpers/toArray');

var _toArray3 = _interopRequireDefault(_toArray2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var upperFirst = function upperFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

var getFileContent = function getFileContent(fPath) {
  return async function (fName) {
    var rawData = await _fs2.default.readFileAsync(_path2.default.join(fPath, fName));
    var fData = JSON.parse(rawData);

    var _fName$split = fName.split('.json'),
        kName = _fName$split[0];

    var _kName$split = kName.split('_'),
        _kName$split2 = (0, _toArray3.default)(_kName$split),
        listName = _kName$split2.slice(1);

    var name = listName.map(upperFirst).join('');
    return (0, _defineProperty3.default)({}, name, fData);
  };
};

var getFolderContent = async function getFolderContent(folder) {
  var relative = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '../';

  var fPath = _path2.default.join(__dirname, relative, folder);
  var fileList = await _fs2.default.readdirAsync(fPath);
  var pList = await _promise2.default.all(fileList.filter(function (f) {
    return f.indexOf('.json') > -1;
  }).map(getFileContent(fPath)));
  var content = pList.reduce(function (acc, row) {
    return (0, _extends3.default)({}, acc, row);
  }, {});
  return content;
};

exports.default = {
  getFolderContent: getFolderContent
};
//# sourceMappingURL=test-util.js.map
