const get = ({ capture }, res) => async (args) => {
  const [, message] = capture;
  res.writeHead(200, { 'content-type': 'text/xml' });
  res.write(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>${message}</Say></Response>`);
  return res;
};

export default {
  get,
};
