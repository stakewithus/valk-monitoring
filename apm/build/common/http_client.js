'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'common/http_client' });

var HttpError = function HttpError(ctx) {
  var err = new Error();
  (0, _assign2.default)(err, ctx);
  return err;
};

var wrapReply = function wrapReply(uri) {
  return function (reply) {
    var statusCode = reply.statusCode,
        rawBody = reply.body;
    // TODO Make this neater
    // console.log(`statusCode: ${statusCode}`);
    // console.log(`body: ${rawBody}`);

    var validStatusCode = statusCode === 200 || statusCode === 429 || statusCode === 503;
    if (!validStatusCode) throw HttpError({ statusCode: statusCode, respBody: rawBody, uri: uri });
    var body = '';
    try {
      body = rawBody && JSON.parse(rawBody);
    } catch (err) {
      logger.warn('Unable to parse json!');
      body = rawBody;
    }
    return body;
  };
};

var rawRequest = function rawRequest(nodeIP, nodePort, reqArgs) {
  return function (nodeEndpoint) {
    var nodeMethod = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'GET';
    return function (_ref) {
      var _ref$body = _ref.body,
          body = _ref$body === undefined ? {} : _ref$body,
          _ref$qs = _ref.qs,
          qs = _ref$qs === undefined ? {} : _ref$qs,
          timeout = _ref.timeout;
      var reqHeaders = reqArgs.headers;

      var qString = _querystring2.default.encode(qs);
      var fPath = '' + nodeEndpoint;
      if (qString !== '') {
        fPath = fPath + '?' + qString;
      }

      var reqOpts = {
        host: nodeIP,
        port: nodePort,
        path: fPath,
        method: nodeMethod,
        headers: (0, _extends3.default)({
          'content-type': 'application/json'
        }, reqHeaders)
      };
      if (timeout) {
        reqOpts.timeout = timeout;
      }
      return new _promise2.default(function (resolve, reject) {
        var contentStr = '';
        var contentLen = 0;
        var validDataHeader = nodeMethod === 'POST' || nodeMethod === 'PUT';
        if (validDataHeader && (0, _keys2.default)(body).length > 0) {
          contentStr = (0, _stringify2.default)(body);
          contentLen = contentStr.length;
          reqOpts = (0, _extends3.default)({}, reqOpts, { 'content-length': contentLen });
        }
        var req = _http2.default.request(reqOpts, function (res) {
          var statusCode = res.statusCode;

          res.setEncoding('utf-8');
          var respBody = '';
          res.on('data', function (chunk) {
            respBody += chunk;
          });
          res.on('end', function () {
            try {
              resolve(wrapReply(nodeEndpoint)({ body: respBody, statusCode: statusCode }));
            } catch (err) {
              reject(err);
            }
          });
        });
        req.on('timeout', function () {
          req.abort();
        });
        req.on('error', function (err) {
          if (err) {
            logger.error(err);
            logger.info(reqOpts);
          }
          reject(err);
        });
        if (contentLen > 0) {
          req.write(contentStr);
        }
        req.end();
      });
    };
  };
};

exports.default = rawRequest;
//# sourceMappingURL=http_client.js.map
