import pino from 'pino';
import crypto from 'crypto';
import table from 'markdown-table';
import healthCmd from '../../health';
import StatusController from './status';

const logger = pino().child({ module: 'controllers/slack' });

const validateToken = ({ rawBody, headers }) => {
  const slackSignature = headers['X-Slack-Signature'] || headers['x-slack-signature'];
  const githubSecret = process.env.SLACK_SECRET_TOKEN;
  const timestamp = headers['X-Slack-Request-Timestamp'] || headers['x-slack-request-timestamp'];
  const hashReq = `v0:${timestamp}:${rawBody}`;
  const hash = `v0=${crypto.createHmac('sha256', githubSecret).update(hashReq).digest('hex')}`;
  return slackSignature === hash;
};

const validateTimestamp = ({ headers }) => {
  const timestamp = headers['X-Slack-Request-Timestamp'] || headers['x-slack-request-timestamp'];
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return false;
  }
  return true;
};

const parseRequest = ({ rawBody }) => {
  const requestArr = rawBody.split('&');
  const request = requestArr.reduce((acc, data) => {
    const [key, value] = data.split('=');
    acc[key] = value;
    return acc;
  }, {});
  return request;
};

const generateTableData = (data) => {
  const tableData = Object.assign(data.body);
  tableData.unshift(data.header);
  return table(tableData);
};

const generateResponse = (text, error) => {
  const result = {
    response_type: 'in_channel',
    text: `\`\`\`${text}\`\`\``,
  };
  if (error) {
    result.attachments = [
      {
        text: error,
      },
    ];
  }
  return result;
};

const reply = (res, result) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.write(JSON.stringify(result));
  return res;
};

const handleHealthCommand = async (args, request, res) => {
  try {
    if (!request.text) {
      const health = await healthCmd({ ...args, showRawData: true });
      const healthText = generateTableData(health);
      return reply(res, generateResponse(healthText));
    }
    const params = request.text.trim(' ');
    const [project, serviceName] = params.split('+');
    if (project && serviceName) {
      const healthNodeService = await healthCmd({
        ...args, service: project, output: serviceName,
      });
      const healthNodeServiceText = generateTableData(healthNodeService);
      return reply(res, generateResponse(healthNodeServiceText));
    }
    const healthService = await healthCmd({ ...args, service: project });
    const healthServiceText = generateTableData(healthService);
    return reply(res, generateResponse(healthServiceText));
  } catch (e) {
    logger.error('handleHealthCommand', e && e.toString());
    return reply(res, generateResponse('Some error occurred', e && e.toString()));
  }
};

const getTableBody = (data) => {
  if (data.region) {
    return [
      data.projectName,
      data.networkName,
      data.region,
      data.blockHeight,
      data.blockTime,
      data.catchingUp,
      data.peersTotal,
      data.peersInbound,
      data.peersOutbound,
    ];
  }
  return [
    data.projectName,
    data.networkName,
    data.blockHeight,
    data.blockTime,
    data.catchingUp,
    data.peersTotal,
    data.peersInbound,
    data.peersOutbound,
  ];
};

const handleStatusCommand = async (args, request, res) => {
  try {
    if (request.text) {
      const tableHeader = ['Project', 'Network', 'Region', 'BlockHeight', 'BlockTime', 'CatchingUp', 'Peers Total',
        'Inbound', 'Outbound'];
      const [project, network, region] = request.text.split('+');
      if (!project) {
        return reply(res, generateResponse('Invalid command'));
      }
      const result = await StatusController.filterProjectByRegion(args)(project, network, region);
      if (!result) {
        return reply(res, generateResponse('Not found'));
      }
      const tableBody = result.map((r) => getTableBody(r));
      const projectStatusText = generateTableData({
        header: tableHeader,
        body: tableBody,
      });
      return reply(res, generateResponse(projectStatusText));
    }
    const tableHeader = ['Project', 'Network', 'BlockHeight', 'BlockTime', 'CatchingUp', 'Peers Total',
      'Inbound', 'Outbound'];
    const result = await StatusController.getAllProjectStatus(args);
    const tableBody = result.reduce((acc, row) => {
      acc.push(getTableBody(row));
      return acc;
    }, []);
    const statusText = generateTableData({
      header: tableHeader,
      body: tableBody,
    });
    return reply(res, generateResponse(statusText));
  } catch (e) {
    logger.error('handleStatusCommand', e && e.toString());
    return reply(res, generateResponse('Some error occurred', e && e.toString()));
  }
};

const handle = (req, res) => async (args) => {
  if (!validateToken(req) || !validateTimestamp(req)) {
    res.writeHead(401);
    res.write('Invalid request!');
    return res;
  }
  const request = parseRequest(req);
  if (request.command.includes('health')) {
    return handleHealthCommand(args, request, res);
  } if (request.command.includes('status')) {
    return handleStatusCommand(args, request, res);
  }
  res.writeHead(401);
  return res.write('Invalid request!');
};

export default {
  handle,
};
