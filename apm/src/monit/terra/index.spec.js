import {
  assert,
} from 'chai';
import Bluebird from 'bluebird';
import fs from 'fs';
import nock from 'nock';
import sinon from 'sinon';
import NockTerraApi from './nock/api';
import TerraMonitoring from './index';
import Twilio from '../../notification/twilio';
import Notification from '../../notification';
import service from './service';
import exchangeRate from './exchange-rates';

Bluebird.promisifyAll(fs);

const nockSlackCall = async () => {
  nock('https://hooks.slack.com')
    .post('/')
    .reply(200, true);
};

describe('# Monitoring Terra', () => {
  before(async () => {
    process.env.TERRA_LCD = '127.0.0.1:1321';
    process.env.TERRA_ORACLE_VALIDATOR_ADDRESS = 'terravaloper1emscfpz9jjtj8tj2nh70y25uywcakldsj76luz';
    process.env.SLACK_INCOMING_WEBHOOK = 'https://hooks.slack.com';
    const [host, port] = process.env.TERRA_LCD.split(':');
    await NockTerraApi(host, port);
    await nockSlackCall();
    sinon.stub(Twilio, 'sendSMS').returns(Promise.resolve());
    sinon.stub(Twilio, 'sendCall').returns(Promise.resolve());
  });
  it('Should run successfully', async () => {
    const slackSpy = sinon.spy(Notification, 'sendToSlack');
    const twilioSpy = sinon.spy(Notification, 'sendToTwilio');
    await TerraMonitoring.run({
      node: '127.0.0.1',
      consulPort: 8500,
    });
    assert.equal(slackSpy.calledOnce, true);
    assert.equal(twilioSpy.calledOnce, true);
  });
  it('Should fetch exchange rate without error', async () => {
    const activeDenoms = await service.getActiveDenoms();
    await exchangeRate.start(activeDenoms);
  });
});
