'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _nock = require('nock');

var _nock2 = _interopRequireDefault(_nock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var nockConsulAPI = async function nockConsulAPI(host, port) {
  var baseUri = 'http://' + host + ':' + port;
  (0, _nock2.default)(baseUri).get('/v1/agent/services').times(2).reply(200, {
    'terra-backend': {
      ID: 'terra-backend',
      Service: 'terra-backend',
      Tags: [],
      Meta: {},
      Port: 0,
      Address: '',
      Weights: {
        Passing: 1,
        Warning: 1
      },
      EnableTagOverride: false
    }
  });
  (0, _nock2.default)(baseUri).put('/v1/agent/service/register').reply(200, '');
  (0, _nock2.default)(baseUri).get('/v1/agent/checks').times(3).reply(200, {});
  (0, _nock2.default)(baseUri).put('/v1/agent/check/register').times(2).reply(200, '');
};

exports.default = nockConsulAPI;
//# sourceMappingURL=oracle.js.map
