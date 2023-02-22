'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

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

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var upperFirst = function upperFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Thanks Tan for this snippet
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

var ConsulAPI = async function ConsulAPI(host, port) {
  var fPath = _path2.default.join(__dirname, '../', 'fixtures');
  var fileList = await _fs2.default.readdirAsync(fPath);
  var pList = await _promise2.default.all(fileList.filter(function (f) {
    return f.indexOf('.json') > -1;
  }).map(getFileContent(fPath)));
  var consulApi = pList.reduce(function (acc, row) {
    return (0, _extends3.default)({}, acc, row);
  }, {});

  var baseUri = 'http://' + host + ':' + port;
  (0, _nock2.default)(baseUri).get('/v1/catalog/nodes').times(3).reply(200, consulApi.CatalogList1);
  (0, _nock2.default)(baseUri).get('/v1/agent/services').reply(200, consulApi.AgentServiceList1);

  (0, _nock2.default)(baseUri).put('/v1/agent/service/register', function (body) {
    var ID = body.ID,
        Port = body.Port,
        Checks = body.Checks;

    if (typeof ID === 'undefined') return false;
    if (typeof Port === 'undefined') return false;
    if (typeof Checks === 'undefined') return false;
    return true;
  }).reply(200, '');

  (0, _nock2.default)(baseUri).get('/v1/agent/services').times(2).reply(200, consulApi.AgentServiceList2);
  (0, _nock2.default)(baseUri).get('/v1/agent/checks').times(2).reply(200, consulApi.AgentCheckList2);
  (0, _nock2.default)(baseUri).get('/v1/agent/checks').query({ filter: 'ServiceID == "bcl-commit-hub"' }).reply(200, consulApi.AgentCheckList3);

  (0, _nock2.default)(baseUri).put('/v1/agent/check/pass/service:bcl-commit-hub:3').query({ note: '1 missed blocks in last 100' }).reply(200, '');

  (0, _nock2.default)(baseUri).put('/v1/agent/check/warn/service:bcl-commit-hub:4').query({ note: 'Last block time is 40s behind current time' }).reply(200, '');

  (0, _nock2.default)(baseUri).put('/v1/agent/check/fail/service:bcl-commit-hub:5').query({ note: 'Peer count has dropped below 5' }).reply(200, '');

  var kvPrefix = '/v1/kv/projects/commit-hub/crust-2/';
  (0, _nock2.default)(baseUri).get('' + kvPrefix).query({ keys: true }).reply(404, '');

  (0, _nock2.default)(baseUri).put(kvPrefix + 'nodes/ap-southeast-1/block-height', function (body) {
    if (body === (0, _stringify2.default)(100)) return true;
    return false;
  }).query({ cas: 0 }).reply(200, true);

  (0, _nock2.default)(baseUri).get(kvPrefix + 'nodes/ap-southeast-1/block-height').reply(200, consulApi.KvNodeBlockHeight);

  (0, _nock2.default)(baseUri).get('/v1/kv/apm/settings/validator-addresses/bcl-commit-hub/unknown').reply(200, '');

  (0, _nock2.default)(baseUri).put(kvPrefix + 'nodes/ap-southeast-1/block-time', function (body) {
    if (body === (0, _stringify2.default)(1566884093)) return true;
    return false;
  }).query({ cas: 0 }).reply(200, true);

  (0, _nock2.default)(baseUri).get(kvPrefix + 'nodes/ap-southeast-1/block-time').reply(200, consulApi.KvNodeBlockTime);

  (0, _nock2.default)(baseUri).put(kvPrefix + 'commits/1000/swstest19', function (body) {
    if (body === (0, _stringify2.default)(true)) return true;
    return false;
  }).query({ cas: 0 }).reply(200, true);

  (0, _nock2.default)(baseUri).get(kvPrefix + 'commits/1000/swstest19').reply(200, consulApi.KvCommitBlockValidator);

  (0, _nock2.default)(baseUri).get('' + kvPrefix).query({ keys: true }).reply(200, consulApi.KvProjectLevel);

  (0, _nock2.default)(baseUri).delete('' + kvPrefix).query({ recurse: true }).reply(200, true);

  (0, _nock2.default)(baseUri).put('/v1/agent/service/deregister/bcl-commit-hub').reply(200, '');
};

exports.default = ConsulAPI;
//# sourceMappingURL=api.js.map
