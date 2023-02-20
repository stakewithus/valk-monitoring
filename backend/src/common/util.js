const successResponse = (res, data) => {
  res.writeHead(200, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify({
    success: true,
    detail: data,
  }));
  return res;
};

const failResponse = (statusCode = 500, res, data) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json',
  });
  res.write(JSON.stringify({
    success: false,
    detail: data,
  }));
  return res;
};

const getTokenInHeader = (req) => {
  if (!req || !req.headers || !req.headers.authorization) {
    return null;
  }
  const [, token] = req.headers.authorization.split(' ');
  return token;
};
const isNotEmptyArray = (arr) => arr && arr.length > 0;

export default {
  successResponse,
  failResponse,
  getTokenInHeader,
  isNotEmptyArray,
};
