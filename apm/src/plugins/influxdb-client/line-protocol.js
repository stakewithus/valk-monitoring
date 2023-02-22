/* eslint-disable import/prefer-default-export */
const commaSeperator = (body, wrapper) => Object.keys(body).reduce((acc, key, idx) => {
  const valStr = String(body[key]);
  const val = valStr.replace(/[=${}()|[\]\\]/g, '\\$&');
  if (idx !== 0) {
    return `${acc},${key}=${val}`;
  }
  return `${key}=${val}`;
}, '');

const parsePoint = ({
  measurement,
  tags,
  fields,
  timestamp,
}) => {
  const tagStr = commaSeperator(tags);
  const fieldStr = commaSeperator(fields);
  const lineMsg = `${measurement},${tagStr} ${fieldStr}${timestamp ? ` ${timestamp}` : ''}`;
  return lineMsg;
};

const parse = (points) => points.reduce((acc, point, idx) => {
  const msg = parsePoint(point);
  if (idx !== 0) {
    return `${acc}\n${msg}`;
  }
  return msg;
}, '');

export {
  parse,
};
