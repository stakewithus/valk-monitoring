import http from 'http';
import querystring from 'querystring';
import pino from 'pino';

const logger = pino().child({ module: 'common/http_client' });

const wrapReply = () => (reply) => {
  const { body: rawBody } = reply;
  let body = '';
  try {
    body = rawBody && JSON.parse(rawBody);
  } catch (err) {
    body = rawBody;
  }
  return body;
};

const rawRequest = (nodeIP, nodePort, reqArgs) => (nodeEndpoint, nodeMethod = 'GET') => ({ body = {}, qs = {}, timeout }) => {
  const {
    headers: reqHeaders,
  } = reqArgs;
  const qString = querystring.encode(qs);
  let fPath = `${nodeEndpoint}`;
  if (qString !== '') {
    fPath = `${fPath}?${qString}`;
  }

  let reqOpts = {
    host: nodeIP,
    port: nodePort,
    path: fPath,
    method: nodeMethod,
    headers: {
      'content-type': 'application/json',
      ...reqHeaders,
    },
  };
  if (timeout) {
    reqOpts.timeout = timeout;
  }
  return new Promise((resolve, reject) => {
    let contentStr = '';
    let contentLen = 0;
    const validDataHeader = nodeMethod === 'POST' || nodeMethod === 'PUT';
    if (validDataHeader && Object.keys(body).length > 0) {
      contentStr = JSON.stringify(body);
      contentLen = contentStr.length;
      reqOpts = { ...reqOpts, 'content-length': contentLen };
    }
    const req = http.request(reqOpts, (res) => {
      const { statusCode } = res;
      res.setEncoding('utf-8');
      let respBody = '';
      res.on('data', (chunk) => { respBody += chunk; });
      res.on('end', () => {
        try {
          resolve(wrapReply(nodeEndpoint)({ body: respBody, statusCode }));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('timeout', () => {
      req.abort();
    });
    req.on('error', (err) => {
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

export default rawRequest;
