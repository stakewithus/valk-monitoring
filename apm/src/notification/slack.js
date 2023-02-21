import request from 'request';
import pino from 'pino';

const logger = pino().child({ module: 'notification/slack' });

const generateMessage = (obj) => {
  const keys = Object.keys(obj);
  return keys.reduce((acc, key) => {
    let value = obj[key] !== undefined ? obj[key] : '';
    if (key === 'type' || key === 'status' || key === 'project' || key === 'region') {
      value = `*${value}*`;
    }
    const text = `${key.slice(0, 1).toUpperCase()}${key.slice(1, key.length)}: ${value}\n`;
    return `${acc}${text}`;
  }, '');
};

const postToChannel = (webhookUrl, message) => {
  const body = {
    text: message,
  };
  return new Promise((resolve, reject) => request({
    uri: webhookUrl, method: 'POST', json: body,
  }, (err, res) => {
    if (err) {
      logger.error('Slack send error', err && err.toString());
      return reject(err);
    }
    return resolve(res);
  }));
};

export default {
  postToChannel,
  generateMessage,
};
