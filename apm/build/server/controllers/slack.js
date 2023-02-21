'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _markdownTable = require('markdown-table');

var _markdownTable2 = _interopRequireDefault(_markdownTable);

var _health = require('../../health');

var _health2 = _interopRequireDefault(_health);

var _status = require('./status');

var _status2 = _interopRequireDefault(_status);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'controllers/slack' });

var validateToken = function validateToken(_ref) {
  var rawBody = _ref.rawBody,
      headers = _ref.headers;

  var slackSignature = headers['X-Slack-Signature'] || headers['x-slack-signature'];
  var githubSecret = process.env.SLACK_SECRET_TOKEN;
  var timestamp = headers['X-Slack-Request-Timestamp'] || headers['x-slack-request-timestamp'];
  var hashReq = 'v0:' + timestamp + ':' + rawBody;
  var hash = 'v0=' + _crypto2.default.createHmac('sha256', githubSecret).update(hashReq).digest('hex');
  return slackSignature === hash;
};

var validateTimestamp = function validateTimestamp(_ref2) {
  var headers = _ref2.headers;

  var timestamp = headers['X-Slack-Request-Timestamp'] || headers['x-slack-request-timestamp'];
  var time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return false;
  }
  return true;
};

var parseRequest = function parseRequest(_ref3) {
  var rawBody = _ref3.rawBody;

  var requestArr = rawBody.split('&');
  var request = requestArr.reduce(function (acc, data) {
    var _data$split = data.split('='),
        _data$split2 = (0, _slicedToArray3.default)(_data$split, 2),
        key = _data$split2[0],
        value = _data$split2[1];

    acc[key] = value;
    return acc;
  }, {});
  return request;
};

var generateTableData = function generateTableData(data) {
  var tableData = (0, _assign2.default)(data.body);
  tableData.unshift(data.header);
  return (0, _markdownTable2.default)(tableData);
};

var generateResponse = function generateResponse(text, error) {
  var result = {
    response_type: 'in_channel',
    text: '```' + text + '```'
  };
  if (error) {
    result.attachments = [{
      text: error
    }];
  }
  return result;
};

var reply = function reply(res, result) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.write((0, _stringify2.default)(result));
  return res;
};

var handleHealthCommand = async function handleHealthCommand(args, request, res) {
  try {
    if (!request.text) {
      var health = await (0, _health2.default)((0, _extends3.default)({}, args, { showRawData: true }));
      var healthText = generateTableData(health);
      return reply(res, generateResponse(healthText));
    }
    var params = request.text.trim(' ');

    var _params$split = params.split('+'),
        _params$split2 = (0, _slicedToArray3.default)(_params$split, 2),
        project = _params$split2[0],
        serviceName = _params$split2[1];

    if (project && serviceName) {
      var healthNodeService = await (0, _health2.default)((0, _extends3.default)({}, args, { service: project, output: serviceName
      }));
      var healthNodeServiceText = generateTableData(healthNodeService);
      return reply(res, generateResponse(healthNodeServiceText));
    }
    var healthService = await (0, _health2.default)((0, _extends3.default)({}, args, { service: project }));
    var healthServiceText = generateTableData(healthService);
    return reply(res, generateResponse(healthServiceText));
  } catch (e) {
    logger.error('handleHealthCommand', e && e.toString());
    return reply(res, generateResponse('Some error occurred', e && e.toString()));
  }
};

var getTableBody = function getTableBody(data) {
  if (data.region) {
    return [data.projectName, data.networkName, data.region, data.blockHeight, data.blockTime, data.catchingUp, data.peersTotal, data.peersInbound, data.peersOutbound];
  }
  return [data.projectName, data.networkName, data.blockHeight, data.blockTime, data.catchingUp, data.peersTotal, data.peersInbound, data.peersOutbound];
};

var handleStatusCommand = async function handleStatusCommand(args, request, res) {
  try {
    if (request.text) {
      var _tableHeader = ['Project', 'Network', 'Region', 'BlockHeight', 'BlockTime', 'CatchingUp', 'Peers Total', 'Inbound', 'Outbound'];

      var _request$text$split = request.text.split('+'),
          _request$text$split2 = (0, _slicedToArray3.default)(_request$text$split, 3),
          project = _request$text$split2[0],
          network = _request$text$split2[1],
          region = _request$text$split2[2];

      if (!project) {
        return reply(res, generateResponse('Invalid command'));
      }
      var _result = await _status2.default.filterProjectByRegion(args)(project, network, region);
      if (!_result) {
        return reply(res, generateResponse('Not found'));
      }
      var _tableBody = _result.map(function (r) {
        return getTableBody(r);
      });
      var projectStatusText = generateTableData({
        header: _tableHeader,
        body: _tableBody
      });
      return reply(res, generateResponse(projectStatusText));
    }
    var tableHeader = ['Project', 'Network', 'BlockHeight', 'BlockTime', 'CatchingUp', 'Peers Total', 'Inbound', 'Outbound'];
    var result = await _status2.default.getAllProjectStatus(args);
    var tableBody = result.reduce(function (acc, row) {
      acc.push(getTableBody(row));
      return acc;
    }, []);
    var statusText = generateTableData({
      header: tableHeader,
      body: tableBody
    });
    return reply(res, generateResponse(statusText));
  } catch (e) {
    logger.error('handleStatusCommand', e && e.toString());
    return reply(res, generateResponse('Some error occurred', e && e.toString()));
  }
};

var handle = function handle(req, res) {
  return async function (args) {
    if (!validateToken(req) || !validateTimestamp(req)) {
      res.writeHead(401);
      res.write('Invalid request!');
      return res;
    }
    var request = parseRequest(req);
    if (request.command.includes('health')) {
      return handleHealthCommand(args, request, res);
    }if (request.command.includes('status')) {
      return handleStatusCommand(args, request, res);
    }
    res.writeHead(401);
    return res.write('Invalid request!');
  };
};

exports.default = {
  handle: handle
};
//# sourceMappingURL=slack.js.map
