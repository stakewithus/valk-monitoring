'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _routes = require('./routes');

var _api = require('../plugins/backends/consul2/api');

var _api2 = _interopRequireDefault(_api);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_events2.default.EventEmitter.defaultMaxListeners = 30;

var getRouter = new _events2.default();

getRouter.on('request', function (args, req, resp) {
  var reqUrl = req.url,
      headers = req.headers,
      body = req.body,
      rawBody = req.rawBody;

  var Url = new _url2.default.URL(reqUrl, 'http://127.0.0.1:3000');
  var pathname = Url.pathname,
      query = Url.searchParams;

  var matcher = async function matcher() {
    var anyMatch = (0, _keys2.default)(_routes.getRouteHandlers[req.method]).map(function (re) {
      var mapRes = pathname.match(re);
      if (mapRes === null) return null;
      return { capture: mapRes, routeKey: re };
    }).filter(function (m) {
      return m !== null;
    });
    if (anyMatch.length === 0) {
      resp.writeHead(404, {
        'content-type': 'application/json'
      });
      return resp;
    }
    var _anyMatch$ = anyMatch[0],
        capture = _anyMatch$.capture,
        routeKey = _anyMatch$.routeKey;

    return _routes.getRouteHandlers[req.method][routeKey]({
      body: body,
      rawBody: rawBody,
      query: query,
      capture: capture,
      headers: headers
    }, resp)(args);
  };
  matcher().then(function (r) {
    return r.end();
  }).catch(function (err) {
    if (err) console.log(err);
    resp.end();
  });
});

var routeTo = {
  GET: function GET(args) {
    return function (req, resp) {
      return getRouter.emit('request', args, req, resp);
    };
  },
  POST: function POST(args) {
    return function (req, resp) {
      return getRouter.emit('request', args, req, resp);
    };
  }
};

var bodyParser = function bodyParser(req) {
  return new _promise2.default(function (resolve) {
    var data = '';
    req.on('data', function (chunk) {
      data += chunk;
    });
    req.on('end', function () {
      req.rawBody = data;
      req.body = data;
      if (data && data.indexOf('{') > -1) {
        req.body = JSON.parse(data);
      }
      resolve();
    });
  });
};

var router = function router(args) {
  return async function (req, resp) {
    resp.setHeader('Access-Control-Allow-Origin', '*');
    resp.setHeader('Access-Control-Request-Method', '*');
    resp.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    resp.setHeader('Access-Control-Allow-Headers', 'access-control-allow-headers, access-control-allow-origin, content-type');
    if (req.method === 'OPTIONS') {
      resp.writeHead(200);
      resp.end();
      return;
    }
    var method = req.method;

    if (method === 'POST') {
      await bodyParser(req);
    }
    var allowedMethods = (0, _keys2.default)(routeTo);
    if (allowedMethods.indexOf(method) > -1) {
      routeTo[method](args)(req, resp);
    } else {
      resp.writeHead(403, {
        'content-type': 'application/json'
      });
      resp.end();
    }
  };
};

var clientErrorHandler = function clientErrorHandler(err, socket) {
  return socket.end('HTTP/1.1 400 Bad Request \r\n\r\n');
};

var upgradeHandler = function upgradeHandler(wss) {
  return function (request, socket, head) {
    var _url$parse = _url2.default.parse(request.url),
        pathname = _url$parse.pathname;

    if (pathname === '/api/ws') {
      wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  };
};

var app = function app(_ref) {
  var node = _ref.node,
      consulPort = _ref.consulPort,
      nomadPort = _ref.nomadPort,
      production = _ref.production,
      prodConfigFile = _ref.prodConfigFile;

  console.log('Before consul');
  var Backend = (0, _api2.default)(node, consulPort).Api;
  console.log('After consul');
  var wss = new _ws2.default.Server({
    noServer: true
  });
  console.log('Server routing...');
  var server = _http2.default.createServer(router({
    Backend: Backend, wss: wss, node: node, consulPort: consulPort, nomadPort: nomadPort, production: production, prodConfigFile: prodConfigFile
  }));
  console.log('Server route inited');
  server.on('upgrade', upgradeHandler(wss));
  server.on('clientError', clientErrorHandler);
  return server;
};

exports.default = app;
//# sourceMappingURL=server.js.map
