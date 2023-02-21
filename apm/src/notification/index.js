import Slack from './slack';
import Twilio from './twilio';
import Constant from '../monit/constant';

const sendToSlack = (data) => {
  const slackMessage = Slack.generateMessage(data);
  return Slack.postToChannel(process.env.SLACK_INCOMING_WEBHOOK, slackMessage);
};

const sendToTwilio = (data) => {
  const criticalServer = data
    .find((e) => e.status === Constant.HEALTH_CHECK_STATUS.CRITICAL);
  if (criticalServer) {
    const callMessage = `apm-project-${criticalServer.project}`;
    const phones = process.env.TWILIO_TO_PHONE || '';
    const listPhone = phones.split(',');
    return Promise.all(listPhone
      .filter((phone) => phone)
      .map((phone) => Twilio.sendCall(callMessage, phone)));
  }
  return criticalServer;
};

export default {
  sendToSlack,
  sendToTwilio,
};
