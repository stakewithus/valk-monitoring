'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _http_client = require('../../../common/http_client');

var _http_client2 = _interopRequireDefault(_http_client);

var _util = require('../../../common/util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = (0, _pino2.default)().child({ module: 'plugins/chain/tendermint' });

function getValidatorCommits(block, validatorSettings, projectName, networkName) {
  var validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, projectName, networkName);
  var lastCommit = block.result.block.last_commit;
  var validatorAddressInCommits = (lastCommit.precommits || lastCommit.signatures).filter(function (c) {
    return c;
  }).map(function (c) {
    return c.validator_address;
  });
  var uniqueValidatorAddresses = [].concat((0, _toConsumableArray3.default)(new _set2.default(validatorAddressInCommits)));
  return validatorAddresses.map(function (v) {
    return {
      name: v.name,
      address: v.address,
      commit: uniqueValidatorAddresses.includes(v.address)
    };
  });
}

var getNodeState = async function getNodeState(host, port, projectName, networkName, timeout, validatorSettings) {
  try {
    var hrstart = process.hrtime();

    var _ref = await _promise2.default.all([(0, _http_client2.default)(host, port, {})('/status')({ timeout: timeout }), (0, _http_client2.default)(host, port, {})('/net_info')({ timeout: timeout })]),
        _ref2 = (0, _slicedToArray3.default)(_ref, 2),
        status = _ref2[0],
        netInfo = _ref2[1];

    var hrend = process.hrtime(hrstart);
    if (!status || !netInfo || !netInfo.result) {
      return null;
    }
    var networkInfo = {
      projectName: projectName,
      networkName: networkName,
      meta: {
        id: status.result.node_info.id
      },
      block_height: +status.result.sync_info.latest_block_height,
      catching_up: status.result.sync_info.catching_up,
      validator_commits: [],
      block_time: Math.floor(new Date(status.result.sync_info.latest_block_time).getTime() / 1000),
      total_peers: netInfo.result.peers.length,
      inbound_peers: netInfo.result.peers.filter(function (p) {
        return !p.is_outbound;
      }).length,
      outbound_peers: netInfo.result.peers.filter(function (p) {
        return p.is_outbound;
      }).length,
      query_response_time_ms: Math.floor(hrend[1] / 1000000)
    };
    var block = await (0, _http_client2.default)(host, port, {})('/block')({
      timeout: timeout,
      qs: { height: networkInfo.block_height }
    });
    if (!block || !block.result || block.error) {
      return networkInfo;
    }
    networkInfo.validator_commits = getValidatorCommits(block, validatorSettings, projectName, networkName);
    return networkInfo;
  } catch (e) {
    logger.error('Tendermint get node state error', e && e.toString());
    console.log(host, port, projectName, networkName);
    return null;
  }
};

var getBlocks = function getBlocks(host, port, timeout) {
  return async function (fromBlock, toBlock) {
    var blockKeys = [];
    for (var i = +fromBlock; i <= +toBlock; i += 1) {
      blockKeys.push(i);
    }
    try {
      var result = await _promise2.default.all(blockKeys.map(function (key) {
        return (0, _http_client2.default)(host, port, {})('/block')({
          timeout: timeout,
          qs: { height: key }
        });
      }));
      return result.filter(function (r) {
        return r;
      }).map(function (r) {
        return r.result;
      });
    } catch (e) {
      logger.error('getBlocks', e && e.toString());
      return [];
    }
  };
};

exports.default = {
  getNodeState: getNodeState,
  getBlocks: getBlocks
};
//# sourceMappingURL=index.js.map
