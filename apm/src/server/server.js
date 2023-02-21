import http from 'http';
import EventEmitter from 'events';
import url from 'url';
import WebSocket from 'ws';
import { getRouteHandlers } from './routes';
import Consul from '../plugins/backends/consul2/api';

EventEmitter.EventEmitter.defaultMaxListeners = 30;

const getRouter = new EventEmitter();

getRouter.on('request', (args, req, resp) => {
  const {
    url: reqUrl,
    headers,
    body,
    rawBody,
  } = req;
  const Url = new url.URL(reqUrl, 'http://127.0.0.1:3000');
  const { pathname, searchParams: query } = Url;
  const matcher = async () => {
    const anyMatch = Object.keys(getRouteHandlers[req.method]).map((re) => {
      const mapRes = pathname.match(re);
      if (mapRes === null) return null;
      return { capture: mapRes, routeKey: re };
    }).filter((m) => m !== null);
    if (anyMatch.length === 0) {
      resp.writeHead(404, {
        'content-type': 'application/json',
      });
      return resp;
    }
    const { 0: { capture, routeKey } } = anyMatch;
    return getRouteHandlers[req.method][routeKey]({
      body,
      rawBody,
      query,
      capture,
      headers,
    }, resp)(args);
  };
  matcher().then((r) => r.end()).catch((err) => {
    if (err) console.log(err);
    resp.end();
  });
});

const routeTo = {
  GET: (args) => (req, resp) => getRouter.emit('request', args, req, resp),
  POST: (args) => (req, resp) => getRouter.emit('request', args, req, resp),
};

const bodyParser = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    req.body = data;
    if (data && data.indexOf('{') > -1) {
      req.body = JSON.parse(data);
    }
    resolve();
  });
});

const router = (args) => async (req, resp) => {
  resp.setHeader('Access-Control-Allow-Origin', '*');
  resp.setHeader('Access-Control-Request-Method', '*');
  resp.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  resp.setHeader('Access-Control-Allow-Headers', 'access-control-allow-headers, access-control-allow-origin, content-type');
  if (req.method === 'OPTIONS') {
    resp.writeHead(200);
    resp.end();
    return;
  }
  const { method } = req;
  if (method === 'POST') {
    await bodyParser(req);
  }
  const allowedMethods = Object.keys(routeTo);
  if (allowedMethods.indexOf(method) > -1) {
    routeTo[method](args)(req, resp);
  } else {
    resp.writeHead(403, {
      'content-type': 'application/json',
    });
    resp.end();
  }
};

const clientErrorHandler = (err, socket) => socket.end('HTTP/1.1 400 Bad Request \r\n\r\n');

const upgradeHandler = (wss) => (request, socket, head) => {
  const { pathname } = url.parse(request.url);
  if (pathname === '/api/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
};

const app = ({
  node, consulPort, nomadPort, production, prodConfigFile,
}) => {
  console.log('Before consul');
  const Backend = Consul(node, consulPort).Api;
  console.log('After consul');
  const wss = new WebSocket.Server({
    noServer: true,
  });
  console.log('Server routing...')
  const server = http.createServer(router({
    Backend, wss, node, consulPort, nomadPort, production, prodConfigFile,
  }));
  console.log('Server route inited')
  server.on('upgrade', upgradeHandler(wss));
  server.on('clientError', clientErrorHandler);
  return server;
};

export default app;
