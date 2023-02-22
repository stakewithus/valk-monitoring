import pino from 'pino';
import httpRequest from '../../../common/http_client';
import Util from '../../../common/util';

const logger = pino().child({ module: 'plugins/chain/tendermint' });

function getValidatorCommits(block, validatorSettings, projectName, networkName) {
  const validatorAddresses = Util.getValidatorAddress(
    validatorSettings,
    projectName,
    networkName,
  );
  const lastCommit = block.result.block.last_commit;
  const validatorAddressInCommits = (lastCommit.precommits || lastCommit.signatures)
    .filter((c) => c)
    .map((c) => c.validator_address);
  const uniqueValidatorAddresses = [...new Set(validatorAddressInCommits)];
  return validatorAddresses.map((v) => ({
    name: v.name,
    address: v.address,
    commit: uniqueValidatorAddresses.includes(v.address),
  }));
}

const getNodeState = async (host, port, projectName, networkName, timeout, validatorSettings) => {
  try {
    const hrstart = process.hrtime();
    const [status, netInfo] = await Promise.all([
      httpRequest(host, port, {})('/status')({ timeout }),
      httpRequest(host, port, {})('/net_info')({ timeout }),
    ]);
    const hrend = process.hrtime(hrstart);
    if (!status || !netInfo || !netInfo.result) {
      return null;
    }
    const networkInfo = {
      projectName,
      networkName,
      meta: {
        id: status.result.node_info.id,
      },
      block_height: +status.result.sync_info.latest_block_height,
      catching_up: status.result.sync_info.catching_up,
      validator_commits: [],
      block_time: Math.floor(new Date(status.result.sync_info.latest_block_time).getTime() / 1000),
      total_peers: netInfo.result.peers.length,
      inbound_peers: netInfo.result.peers.filter((p) => !p.is_outbound).length,
      outbound_peers: netInfo.result.peers.filter((p) => p.is_outbound).length,
      query_response_time_ms: Math.floor(hrend[1] / 1000000),
    };
    const block = await httpRequest(host, port, {})('/block')({
      timeout,
      qs: { height: networkInfo.block_height },
    });
    if (!block || !block.result || block.error) {
      return networkInfo;
    }
    networkInfo.validator_commits = getValidatorCommits(
      block,
      validatorSettings,
      projectName,
      networkName,
    );
    return networkInfo;
  } catch (e) {
    logger.error('Tendermint get node state error', e && e.toString());
    console.log(host, port, projectName, networkName);
    return null;
  }
};

const getBlocks = (host, port, timeout) => async (fromBlock, toBlock) => {
  const blockKeys = [];
  for (let i = +fromBlock; i <= +toBlock; i += 1) {
    blockKeys.push(i);
  }
  try {
    const result = await Promise.all(blockKeys.map((key) => httpRequest(host, port, {})('/block')({
      timeout,
      qs: { height: key },
    })));
    return result.filter((r) => r).map((r) => r.result);
  } catch (e) {
    logger.error('getBlocks', e && e.toString());
    return [];
  }
};

export default {
  getNodeState,
  getBlocks,
};
