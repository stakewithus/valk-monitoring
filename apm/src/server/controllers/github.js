import pino from 'pino';
import crypto from 'crypto';
import ChildProcess from 'child_process';
import SyncCommand from '../../sync2';

const logger = pino().child({ module: 'controllers/github' });

const validateToken = ({ rawBody, headers }) => {
  const token = headers['X-Hub-Signature'] || headers['x-hub-signature'];
  const githubSecret = process.env.GITHUB_SECRET_TOKEN;
  const hash = `sha1=${crypto.createHmac('sha1', githubSecret).update(rawBody).digest('hex')}`;
  return token === hash;
};

const validateEvent = ({ headers }) => {
  const event = headers['X-Github-Event'] || headers['x-github-event'];
  return event === 'push';
};

const validateBranch = ({ body }) => body.ref.includes(process.env.GITHUB_BRANCH);

const runCommand = async function execute(command) {
  return new Promise((resolve, reject) => {
    const bash = ChildProcess.spawn(command, {
      shell: true,
    });
    let result = '';
    bash.stdout.on('data', (data) => {
      result += data.toString();
      console.log(`stdout: ${data.toString()}`);
    });

    bash.stderr.on('data', (data) => {
      console.log(`stderr: ${data.toString()}`);
    });

    bash.on('exit', (code) => {
      console.log(`child process exited with code ${code.toString()}`);
      if (code === 0) {
        resolve(result);
      } else {
        reject();
      }
    });
  });
};

const getCommands = async (githubUrl) => {
  const rawAbsolutePath = await runCommand('pwd');
  const absolutePath = rawAbsolutePath.replace(/\r?\n|\r/g, '');
  const protocol = 'https://';
  const [, url] = githubUrl.split(protocol);
  const urlWithAuth = `${protocol}${process.env.GITHUB_TOKEN}@${url}`;
  const fetchSourceCodeCommand = `mkdir ${absolutePath}/source-code-tmp && git clone --single-branch --branch ${process.env.GITHUB_BRANCH} ${urlWithAuth} ${absolutePath}/source-code-tmp`;
  return {
    configDir: `${absolutePath}/source-code-tmp/config`,
    fetch: fetchSourceCodeCommand,
    remove: `rm -rf ${absolutePath}/source-code-tmp`,
  };
};

const handle = (req, res) => async ({ node }) => {
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
  const commands = await getCommands(req.body.repository.url);
  try {
    await runCommand(commands.remove);
    await runCommand(commands.fetch);
    await SyncCommand(node, 4646, 8500, commands.configDir, {});
  } catch (e) {
    logger.error('Github handle error', e && e.toString());
  }
  res.write('ok');
  return res;
};

export default {
  handle,
  getCommands,
  runCommand,
};
