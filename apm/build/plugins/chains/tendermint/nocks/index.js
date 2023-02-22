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

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var getFileContent = function getFileContent(fPath) {
  return async function (fName) {
    var rawData = await _fs2.default.readFileAsync(_path2.default.join(fPath, fName));
    var fData = JSON.parse(rawData);

    var _fName$split = fName.split('.json'),
        kName = _fName$split[0];

    return (0, _defineProperty3.default)({}, kName, fData);
  };
};

var TendermintApi = async function TendermintApi(host, port) {
  var fPath = _path2.default.join(__dirname, '../', 'fixtures');
  var fileList = await _fs2.default.readdirAsync(fPath);
  var pList = await _promise2.default.all(fileList.map(getFileContent(fPath)));
  var tendermintApi = pList.reduce(function (acc, row) {
    return (0, _extends3.default)({}, row, acc);
  }, {});
  var apmBlock = tendermintApi.apm_block,
      apmStatus = tendermintApi.apm_status,
      apmNetInfo = tendermintApi.apm_net_info;

  var baseUrl = 'http://' + host + ':' + port;
  (0, _nock2.default)(baseUrl).get('/status').reply(200, apmStatus);
  (0, _nock2.default)(baseUrl).get('/net_info').reply(200, apmNetInfo);
  (0, _nock2.default)(baseUrl).get('/block?height=958446').reply(200, apmBlock);
};

exports.default = TendermintApi;
//# sourceMappingURL=index.js.map
