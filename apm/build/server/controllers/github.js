'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _sync = require('../../sync2');

var _sync2 = _interopRequireDefault(_sync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'controllers/github' });

var validateToken = function validateToken(_ref) {
  var rawBody = _ref.rawBody,
      headers = _ref.headers;

  var token = headers['X-Hub-Signature'] || headers['x-hub-signature'];
  var githubSecret = process.env.GITHUB_SECRET_TOKEN;
  var hash = 'sha1=' + _crypto2.default.createHmac('sha1', githubSecret).update(rawBody).digest('hex');
  return token === hash;
};

var validateEvent = function validateEvent(_ref2) {
  var headers = _ref2.headers;

  var event = headers['X-Github-Event'] || headers['x-github-event'];
  return event === 'push';
};

var validateBranch = function validateBranch(_ref3) {
  var body = _ref3.body;
  return body.ref.includes(process.env.GITHUB_BRANCH);
};

var runCommand = async function execute(command) {
  return new _promise2.default(function (resolve, reject) {
    var bash = _child_process2.default.spawn(command, {
      shell: true
    });
    var result = '';
    bash.stdout.on('data', function (data) {
      result += data.toString();
      console.log('stdout: ' + data.toString());
    });

    bash.stderr.on('data', function (data) {
      console.log('stderr: ' + data.toString());
    });

    bash.on('exit', function (code) {
      console.log('child process exited with code ' + code.toString());
      if (code === 0) {
        resolve(result);
      } else {
        reject();
      }
    });
  });
};

var getCommands = async function getCommands(githubUrl) {
  var rawAbsolutePath = await runCommand('pwd');
  var absolutePath = rawAbsolutePath.replace(/\r?\n|\r/g, '');
  var protocol = 'https://';

  var _githubUrl$split = githubUrl.split(protocol),
      _githubUrl$split2 = (0, _slicedToArray3.default)(_githubUrl$split, 2),
      url = _githubUrl$split2[1];

  var urlWithAuth = '' + protocol + process.env.GITHUB_TOKEN + '@' + url;
  var fetchSourceCodeCommand = 'mkdir ' + absolutePath + '/source-code-tmp && git clone --single-branch --branch ' + process.env.GITHUB_BRANCH + ' ' + urlWithAuth + ' ' + absolutePath + '/source-code-tmp';
  return {
    configDir: absolutePath + '/source-code-tmp/config',
    fetch: fetchSourceCodeCommand,
    remove: 'rm -rf ' + absolutePath + '/source-code-tmp'
  };
};

var handle = function handle(req, res) {
  return async function (_ref4) {
    var node = _ref4.node;

    if (!validateToken(req) || !validateEvent(req) || !validateBranch(req)) {
      res.writeHead(401);
      res.write('Invalid request!');
      return res;
    }
    if (!req.body || !req.body.repository || !req.body.repository.url) {
      res.writeHead(400);
      res.writeHead('Invalid request payload');
      return res;
    }
    var commands = await getCommands(req.body.repository.url);
    try {
      await runCommand(commands.remove);
      await runCommand(commands.fetch);
      await (0, _sync2.default)(node, 4646, 8500, commands.configDir, {});
    } catch (e) {
      logger.error('Github handle error', e && e.toString());
    }
    res.write('ok');
    return res;
  };
};

exports.default = {
  handle: handle,
  getCommands: getCommands,
  runCommand: runCommand
};
//# sourceMappingURL=github.js.map
