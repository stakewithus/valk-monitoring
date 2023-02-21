import StatusController from './status';
import KVStoreController from './kvstore';
import SlackController from './slack';
import GithubController from './github';
import ClusterController from './cluster';
import TwilioController from './twilio';
import Statistics from './statistics';
import TerraController from './terra';

export default {
  Status: StatusController,
  KVStore: KVStoreController,
  Slack: SlackController,
  Github: GithubController,
  Cluster: ClusterController,
  Twilio: TwilioController,
  Terra: TerraController,
  Statistics,
};
