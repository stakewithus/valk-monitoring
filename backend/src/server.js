import http from 'http';
import EventEmitter from 'events';
import url from 'url';
import Joi from 'joi';
import {
  getRouteHandlers,
} from './routes';
import Util from './common/util';

EventEmitter.EventEmitter.defaultMaxListeners = 30;

const getRouter = new EventEmitter();

const validateRequest = (req, validationConfig) => {
  if (validationConfig.payload) {
    const payloadVal = Joi.validate(req.body, validationConfig.payload);
    if (payloadVal.error) {
      return payloadVal.error.details || payloadVal.error.message;
    }
  }
  if (validationConfig.query) {
    const queryVal = Joi.validate(req.query, validationConfig.query);
    if (queryVal.error) {
      return queryVal.error;
    }
  }
  return null;
};

getRouter.on('request', (args, req, resp) => {
  const {
    url: reqUrl,
  } = req;
  const Url = new url.URL(reqUrl, 'http://127.0.0.1:3000');
  const {
    pathname,
    searchParams: query,
  } = Url;
  const matcher = async () => {
    const paramMap = [];
    const params = {};
    const anyMatch = Object.keys(getRouteHandlers[req.method]).map((re) => {
      const re2 = re.split('/').map((gr) => {
        if (gr.startsWith(':')) {
          const key = gr.substr(1).replace('$', '');
          paramMap.push(key);
          return '(.+)';
        }
        return gr;
      })
        .join('/');
      const mapRes = pathname.match(re2);
      if (mapRes) {
        const paramValues = Array.from(mapRes.values());
        for (let index = 1; index < paramValues.length; index++) {
          params[paramMap[index - 1]] = paramValues[index];
        }
      }
      if (mapRes === null) return null;
      return {
        // capture: mapRes,
        routeKey: re,
      };
    }).filter((m) => m !== null);
    if (anyMatch.length === 0) {
      resp.writeHead(404, {
        'content-type': 'application/json',
      });
      return resp;
    }
    const {
      0: {
        // capture,
        routeKey,
      },
    } = anyMatch;
    const router = getRouteHandlers[req.method][routeKey];
    const handler = router.handler || router;
    if (router.validate) {
      const validationError = validateRequest(req, router.validate);
      if (validationError) {
        Util.failResponse(400, resp, {
          error: 'VALIDATION_ERROR',
          message: validationError,
        });
        return resp;
      }
    }
    if (router.preHandler) {
      const preHandlerRes = await router.preHandler(req, resp);
      if (preHandlerRes && preHandlerRes.error) {
        Util.failResponse(preHandlerRes.code || 400, resp, preHandlerRes);
        return resp;
      }
    }
    return handler(Object.assign(req, {
      query,
      params,
    }),
    resp)(args);
  };
  matcher().then((r) => r.end()).catch((err) => {
    if (err) {
      Util.failResponse(500, resp, {
        error: err && err.toString(),
      });
    }
    resp.end();
  });
});

const routeTo = {
  GET: (args) => (req, resp) => getRouter.emit('request', args, req, resp),
  POST: (args) => (req, resp) => getRouter.emit('request', args, req, resp),
  PUT: (args) => (req, resp) => getRouter.emit('request', args, req, resp),
  DELETE: (args) => (req, resp) => getRouter.emit('request', args, req, resp),
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
  resp.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
  resp.setHeader('Access-Control-Allow-Headers', 'access-control-allow-headers, access-control-allow-origin, authorization, content-type');
  if (req.method === 'OPTIONS') {
    resp.writeHead(200);
    resp.end();
    return;
  }
  const {
    method,
  } = req;
  if (method === 'POST' || method === 'PUT') {
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

const app = () => {
  const server = http.createServer(router());
  server.on('clientError', clientErrorHandler);
  return server;
};

export default app;
