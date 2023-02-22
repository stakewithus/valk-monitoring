import twilio from 'twilio';
import pino from 'pino';

const logger = pino().child({ module: 'notification/twilio' });

const generateMessage = (rows) => rows.reduce((acc, r) => {
  const keys = Object.keys(r);
  const line = keys.reduce((acc1, key) => {
    const text = `${key}: ${r[key]}\n`;
    return `${acc1}${text}`;
  }, '');
  return `${acc}${acc ? '\n\n' : ''}${line}`;
}, '');

const sendSMS = async (message) => {
  const Client = twilio(process.env.TWILIO_ACCOUNT_ID, process.env.TWILIO_SECRET_TOKEN);
  try {
    const res = await Client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_PHONE,
      to: process.env.TWILIO_TO_PHONE,
    });
    if (res) {
      return res.sid;
    }
    return null;
  } catch (e) {
    logger.error('Twilio send SMS error', e && e.toString());
    return null;
  }
};

const sendCall = async (message, toPhone) => {
  if (!toPhone) {
    logger.error('Twilio phone is empty');
    return null;
  }
  const Client = twilio(process.env.TWILIO_ACCOUNT_ID, process.env.TWILIO_SECRET_TOKEN);
  try {
    const res = await Client.calls.create({
      url: `${process.env.API_DOMAIN}/api/v1/twilio/${message}`,
      from: process.env.TWILIO_FROM_PHONE,
      to: toPhone,
    });
    if (res) {
      return res.sid;
    }
    return null;
  } catch (e) {
    logger.error('Twilio send call error', e && e.toString());
    return null;
  }
};

export default {
  sendSMS,
  sendCall,
  generateMessage,
};
