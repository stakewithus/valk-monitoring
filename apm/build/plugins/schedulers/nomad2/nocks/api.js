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

var NomadAPI = async function NomadAPI(host, port) {
  var fPath = _path2.default.join(__dirname, '../', 'fixtures');
  var fileList = await _fs2.default.readdirAsync(fPath);
  var pList = await _promise2.default.all(fileList.filter(function (f) {
    return f.indexOf('.hcl') === -1;
  }).map(getFileContent(fPath)));
  var nomadApi = pList.reduce(function (acc, row) {
    return (0, _extends3.default)({}, acc, row);
  }, {});

  var baseUri = 'http://' + host + ':' + port;
  (0, _nock2.default)(baseUri).get('/v1/nodes').times(3).reply(200, nomadApi.NodeList1);
  (0, _nock2.default)(baseUri).get('/v1/node/7314889b-0aeb-00e1-8b67-98de3ef8e4db').times(3).reply(200, nomadApi.NodeRead1);
  (0, _nock2.default)(baseUri).get('/v1/node/de888c16-29b1-4d35-221e-332b5b9097f4').reply(404, {});
  (0, _nock2.default)(baseUri).get('/v1/node/7314889b-0aeb-00e1-8b67-98de3ef8e4db/allocations').reply(200, []);

  (0, _nock2.default)(baseUri).get('/v1/jobs').reply(200, []);

  (0, _nock2.default)(baseUri).post('/v1/jobs/parse', function (body) {
    var jobHCL = body.JobHCL;

    if (typeof jobHCL === 'undefined') return false;
    return true;
  }).times(3).reply(200, nomadApi.JobParse1);

  (0, _nock2.default)(baseUri).post('/v1/job/blockchain-client/plan', function (body) {
    var jobDef = body.Job;

    if (typeof jobDef === 'undefined') return false;
    var jobId = jobDef.ID;

    if (typeof jobId !== 'undefined') return true;
    return false;
  }).reply(200, nomadApi.JobPlan1);

  (0, _nock2.default)(baseUri).post('/v1/jobs', function (body) {
    var jobDef = body.Job;

    if (typeof jobDef === 'undefined') return false;
    var jobId = jobDef.ID;

    if (typeof jobId !== 'undefined') return true;
    return false;
  }).reply(200, nomadApi.JobCreate1);

  (0, _nock2.default)(baseUri).get('/v1/job/blockchain-client').reply(200, nomadApi.JobRead1);

  (0, _nock2.default)(baseUri).post('/v1/jobs/parse', function (body) {
    var jobHCL = body.JobHCL;

    if (typeof jobHCL === 'undefined') return false;
    return true;
  }).times(3).reply(200, nomadApi.JobParse2);

  (0, _nock2.default)(baseUri).post('/v1/job/blockchain-client/plan', function (body) {
    var jobDef = body.Job;

    if (typeof jobDef === 'undefined') return false;
    var jobId = jobDef.ID;

    if (typeof jobId !== 'undefined') return true;
    return false;
  }).reply(200, nomadApi.JobPlan2);

  (0, _nock2.default)(baseUri).post('/v1/job/blockchain-client', function (body) {
    var jobDef = body.Job;

    if (typeof jobDef === 'undefined') return false;
    var jobId = jobDef.ID;

    if (typeof jobId !== 'undefined') return true;
    return false;
  }).reply(200, nomadApi.JobUpdate1);

  (0, _nock2.default)(baseUri).get('/v1/job/blockchain-client/allocations').reply(200, nomadApi.JobAllocations1);

  console.log('Nocks done');
  return {};
};

exports.default = NomadAPI;
//# sourceMappingURL=api.js.map
