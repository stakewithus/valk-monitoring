'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _pino = require('pino');

var _pino2 = _interopRequireDefault(_pino);

var _constant = require('./constant');

var _constant2 = _interopRequireDefault(_constant);

var _util = require('../common/util');

var _util2 = _interopRequireDefault(_util);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _tendermint = require('../plugins/chains/tendermint');

var _tendermint2 = _interopRequireDefault(_tendermint);

var _influxStore = require('./influx-store');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var kvStoreKeys = _constant2.default.KV_STORE_KEY_TYPES;
var logger = (0, _pino2.default)().child({
  module: 'kv-store'
});

var generateConsulKey = function generateConsulKey(_ref) {
  var type = _ref.type,
      blockHeight = _ref.blockHeight,
      _ref$metaData = _ref.metaData,
      projectName = _ref$metaData.projectName,
      networkName = _ref$metaData.networkName,
      region = _ref$metaData.region,
      validatorAddress = _ref$metaData.validatorAddress;

  var nodeStatusPrefix = 'projects/nodes/' + projectName + '/' + networkName + '/' + region;
  var globalStatusPrefix = 'projects/global/' + projectName + '/' + networkName;
  switch (type) {
    case kvStoreKeys.NODE_STATUS_BLOCK_HEIGHT:
      return nodeStatusPrefix + '/status/block-height';
    case kvStoreKeys.NODE_STATUS_BLOCK_TIME:
      return nodeStatusPrefix + '/status/block-time';
    case kvStoreKeys.NODE_STATUS_PEERS_TOTAL:
      return nodeStatusPrefix + '/status/peers-total';
    case kvStoreKeys.NODE_STATUS_PEERS_INBOUND:
      return nodeStatusPrefix + '/status/peers-inbound';
    case kvStoreKeys.NODE_STATUS_PEERS_OUTBOUND:
      return nodeStatusPrefix + '/status/peers-outbound';
    case kvStoreKeys.NODE_STATUS_CATCHING_UP:
      return nodeStatusPrefix + '/status/catching-up';
    case kvStoreKeys.GLOBAL_STATUS_BLOCK_HEIGHT:
      return globalStatusPrefix + '/status/block-height';
    case kvStoreKeys.GLOBAL_STATUS_BLOCK_TIME:
      return globalStatusPrefix + '/status/block-time';
    case kvStoreKeys.GLOBAL_STATUS_PEERS_TOTAL:
      return globalStatusPrefix + '/status/peers-total';
    case kvStoreKeys.GLOBAL_STATUS_PEERS_INBOUND:
      return globalStatusPrefix + '/status/peers-inbound';
    case kvStoreKeys.GLOBAL_STATUS_PEERS_OUTBOUND:
      return globalStatusPrefix + '/status/peers-outbound';
    case kvStoreKeys.GLOBAL_COMMIT_BY_BLOCK_HEIGHT:
      return globalStatusPrefix + '/commits/' + blockHeight + '/' + validatorAddress;
    case kvStoreKeys.GLOBAL_STATUS_CATCHING_UP:
      return globalStatusPrefix + '/status/catching-up';
    default:
      return '';
  }
};

var upsertMultipleKeys = function upsertMultipleKeys(Backend) {
  return async function (data) {
    var chunks = _util2.default.splitArray(data, _config2.default.maxKVStoreTransactions);
    var promises = chunks.map(function (ch) {
      var payload = ch.map(function (d) {
        return {
          KV: {
            Verb: 'set',
            Key: d.key,
            Value: Buffer.from(d.value.toString()).toString('base64')
          }
        };
      });
      return Backend.kv.txn(payload);
    });
    return _promise2.default.all(promises);
  };
};

var deleteMultipleKeys = function deleteMultipleKeys(Backend) {
  return async function (data) {
    var chunks = _util2.default.splitArray(data, _config2.default.maxKVStoreTransactions);
    var promises = chunks.map(function (ch) {
      var payload = ch.map(function (d) {
        return {
          KV: {
            Verb: 'delete',
            Key: d
          }
        };
      });
      return Backend.kv.txn(payload);
    });
    return _promise2.default.all(promises);
  };
};

var updateNodeStatuses = function updateNodeStatuses(Backend) {
  return async function (_ref2) {
    var nodeState = _ref2.nodeState,
        metaData = _ref2.metaData;

    var statuses = [{
      key: kvStoreKeys.NODE_STATUS_BLOCK_HEIGHT,
      value: nodeState.block_height
    }, {
      key: kvStoreKeys.NODE_STATUS_BLOCK_TIME,
      value: nodeState.block_time
    }, {
      key: kvStoreKeys.NODE_STATUS_PEERS_INBOUND,
      value: nodeState.inbound_peers
    }, {
      key: kvStoreKeys.NODE_STATUS_PEERS_OUTBOUND,
      value: nodeState.outbound_peers
    }, {
      key: kvStoreKeys.NODE_STATUS_PEERS_TOTAL,
      value: nodeState.total_peers
    }, {
      key: kvStoreKeys.NODE_STATUS_CATCHING_UP,
      value: nodeState.catching_up ? 1 : 0
    }];

    // save peer counts into influx db
    (0, _influxStore.savePeerCounts)({
      network: metaData.networkName,
      project: metaData.projectName,
      region: metaData.region,
      inbound: nodeState.inbound_peers,
      outbound: nodeState.outbound_peers,
      total: nodeState.total_peers
    });
    // save block height into influx db
    (0, _influxStore.saveBlockHeights)({
      network: metaData.networkName,
      project: metaData.projectName,
      region: metaData.region,
      height: nodeState.block_height,
      time: nodeState.block_time * 1000
    });

    var keyValues = statuses.map(function (status) {
      return {
        key: generateConsulKey({
          type: status.key,
          metaData: metaData
        }),
        value: status.value
      };
    });
    await upsertMultipleKeys(Backend)(keyValues);
    return keyValues.reduce(function (acc, row) {
      acc[row.key] = {
        type: 'upsert',
        value: row.value
      };
      return acc;
    }, {});
  };
};

var updateGlobalStatuses = function updateGlobalStatuses(Backend) {
  return async function (_ref3) {
    var nodeState = _ref3.nodeState,
        metaData = _ref3.metaData;

    var statuses = [{
      key: kvStoreKeys.GLOBAL_STATUS_BLOCK_HEIGHT,
      value: nodeState.block_height
    }, {
      key: kvStoreKeys.GLOBAL_STATUS_BLOCK_TIME,
      value: nodeState.block_time
    }, {
      key: kvStoreKeys.GLOBAL_STATUS_PEERS_INBOUND,
      value: nodeState.inbound_peers
    }, {
      key: kvStoreKeys.GLOBAL_STATUS_PEERS_OUTBOUND,
      value: nodeState.outbound_peers
    }, {
      key: kvStoreKeys.GLOBAL_STATUS_PEERS_TOTAL,
      value: nodeState.total_peers
    }, {
      key: kvStoreKeys.GLOBAL_STATUS_CATCHING_UP,
      value: nodeState.catching_up ? 1 : 0
    }];
    var keyValues = statuses.map(function (status) {
      return {
        key: generateConsulKey({
          type: status.key,
          metaData: metaData
        }),
        value: status.value
      };
    });
    await upsertMultipleKeys(Backend)(keyValues);
    return keyValues.reduce(function (acc, row) {
      acc[row.key] = {
        type: 'upsert',
        value: row.value
      };
      return acc;
    }, {});
  };
};

var getOldKeys = function getOldKeys(Backend) {
  return async function (_ref4) {
    var keyType = _ref4.keyType,
        minBlockHeight = _ref4.minBlockHeight,
        metaData = _ref4.metaData;

    try {
      var keys = await Backend.kv.list('projects/global/' + metaData.projectName + '/' + metaData.networkName + '/commits');
      return keys.filter(function (key) {
        var arr = key.split('/');
        var blockHeight = arr[arr.length - 2];
        if (+blockHeight < +minBlockHeight) {
          return true;
        }
        return false;
      }).map(function (key) {
        var arr = key.split('/');
        var blockHeight = +arr[arr.length - 2];
        return generateConsulKey({
          type: keyType,
          metaData: metaData,
          blockHeight: blockHeight
        });
      });
    } catch (e) {
      return [];
    }
  };
};

var updateAndRemoveKeys = function updateAndRemoveKeys(Backend) {
  return async function (_ref5) {
    var keyType = _ref5.keyType,
        blocks = _ref5.blocks,
        metaData = _ref5.metaData,
        minBlockHeight = _ref5.minBlockHeight;

    var removeKeys = await getOldKeys(Backend)({ keyType: keyType, metaData: metaData, minBlockHeight: minBlockHeight });
    var upsertKeys = blocks.map(function (blk) {
      var key = generateConsulKey({
        type: keyType,
        metaData: metaData,
        blockHeight: blk.key
      });
      return {
        key: key,
        value: blk.value
      };
    });
    await _promise2.default.all([upsertMultipleKeys(Backend)(upsertKeys), deleteMultipleKeys(Backend)(removeKeys)]);
    var upsertResult = upsertKeys.reduce(function (acc, row) {
      acc[row.key] = {
        type: 'upsert',
        value: row.value
      };
      return acc;
    }, {});
    var removeResult = removeKeys.reduce(function (acc, key) {
      acc[key] = {
        type: 'del'
      };
      return acc;
    }, {});
    return (0, _extends3.default)({}, upsertResult, removeResult);
  };
};

var getValueByKey = function getValueByKey(Backend) {
  return async function (keyType, metaData) {
    var key = generateConsulKey({
      type: keyType,
      metaData: metaData
    });
    return Backend.kv.getValue(key);
  };
};

var updateBlockCommitByValidator = function updateBlockCommitByValidator(Backend) {
  return async function (_ref6) {
    var nodeState = _ref6.nodeState,
        metaData = _ref6.metaData,
        blocks = _ref6.blocks,
        validatorAddress = _ref6.validatorAddress,
        minBlockHeight = _ref6.minBlockHeight;

    var blockCommits = blocks.filter(function (b) {
      return b;
    }).map(function (blk) {
      var block = blk.block_meta || blk.block;
      var blockHeight = block.header.height - 1; // pre-commit of previous block
      var blockPreCommits = blk.block.last_commit.precommits || blk.block.last_commit.signatures;
      var validatorAddressInCommits = blockPreCommits.find(function (c) {
        return c && c.validator_address === validatorAddress;
      });
      var value = validatorAddressInCommits ? 1 : 0;
      return {
        key: blockHeight,
        value: value,
        time: block.header.time
      };
    });
    var validatorCommit = nodeState.validator_commits.find(function (vc) {
      return vc.address === validatorAddress;
    });
    var commitBlockValue = validatorCommit && validatorCommit.commit ? 1 : 0;
    blockCommits.push({
      key: nodeState.block_height - 1,
      value: commitBlockValue,
      time: nodeState.block_time * 1000
    });
    // save to influxdb
    (0, _influxStore.saveBlockCommits)({
      network: metaData.networkName,
      project: metaData.projectName,
      blockCommits: blockCommits.map(function (bc) {
        return {
          height: bc.key,
          missed: !bc.value,
          time: new Date(bc.time).valueOf()
        };
      })
    });
    var res = await _promise2.default.all([updateAndRemoveKeys(Backend)({
      keyType: kvStoreKeys.GLOBAL_COMMIT_BY_BLOCK_HEIGHT,
      blocks: blockCommits,
      metaData: (0, _extends3.default)({}, metaData, { validatorAddress: validatorAddress }),
      minBlockHeight: minBlockHeight
    })]);
    return res.filter(function (r) {
      return r;
    }).reduce(function (acc, r) {
      return (0, _extends3.default)({}, acc, r);
    }, {});
  };
};

var updateBlockCommit = function updateBlockCommit(Backend) {
  return async function (_ref7) {
    var nodeState = _ref7.nodeState,
        metaData = _ref7.metaData;

    var currentBlockHeight = nodeState.block_height;
    var previousBlockHeightKey = generateConsulKey({
      type: kvStoreKeys.GLOBAL_STATUS_BLOCK_HEIGHT,
      metaData: metaData
    });
    var previousBlockHeight = await Backend.kv.getValue(previousBlockHeightKey);
    // eslint-disable-next-line eqeqeq
    if (previousBlockHeight && previousBlockHeight == currentBlockHeight) {
      return null;
    }
    var limitFromBlockHeight = currentBlockHeight - 1 - _config2.default.numberOfLastCommits;
    var fromBlk = previousBlockHeight > 0 ? Math.max(+previousBlockHeight + 1, limitFromBlockHeight) : limitFromBlockHeight;
    var blocks = await _tendermint2.default.getBlocks(metaData.host, metaData.port, _config2.default.requestTimeoutMs)(fromBlk, currentBlockHeight - 1); // avoid duplicate latest block height call
    var validatorAddresses = metaData.validatorAddresses;

    var res = await _promise2.default.all(validatorAddresses.map(function (v) {
      return updateBlockCommitByValidator(Backend)({
        nodeState: nodeState,
        metaData: metaData,
        blocks: blocks,
        validatorAddress: v.address,
        minBlockHeight: limitFromBlockHeight - 10
      });
    }));
    return res.filter(function (r) {
      return r;
    }).reduce(function (acc, r) {
      return (0, _extends3.default)({}, acc, r);
    }, {});
  };
};

var update = function update(Backend) {
  return async function (_ref8) {
    var nodeState = _ref8.nodeState,
        nodeMeta = _ref8.nodeMeta;

    var projectName = _util2.default.getProjectName(nodeMeta.projectName);
    var metaData = (0, _extends3.default)({}, nodeMeta, {
      projectName: projectName
    });
    var updateBC = [];
    if (nodeState.updateGlobal) {
      updateBC = await updateBlockCommit(Backend)({
        nodeState: nodeState,
        metaData: metaData
      });
    }
    var result = await _promise2.default.all([updateNodeStatuses(Backend)({
      nodeState: nodeState,
      metaData: metaData
    }), nodeState.updateGlobal && updateGlobalStatuses(Backend)({
      nodeState: nodeState,
      metaData: metaData
    })]);
    var finalResult = result.concat(updateBC);
    return finalResult.filter(function (r) {
      return r;
    }).reduce(function (acc, r) {
      return (0, _extends3.default)({}, acc, r);
    }, {});
  };
};

var getAllByKeyPrefix = function getAllByKeyPrefix(Backend) {
  return async function (keyPrefix) {
    var payload = [{
      KV: {
        Verb: 'get-tree',
        Key: keyPrefix
      }
    }];
    try {
      var response = await Backend.kv.txn(payload);
      if (response.Errors) {
        logger.error('getAllByKeyPrefix ' + keyPrefix, response.Errors);
        return [];
      }
      return response.Results.map(function (r) {
        return {
          key: r.KV.Key,
          value: r.KV.Value && Buffer.from(r.KV.Value, 'base64').toString('utf-8').replace(/"/g, '')
        };
      });
    } catch (e) {
      logger.error('getAllByKeyPrefix ' + keyPrefix, e && e.toString());
      return [];
    }
  };
};

var getBlockCommitKeys = function getBlockCommitKeys(Backend) {
  return async function (_ref9) {
    var from = _ref9.from,
        to = _ref9.to,
        metaData = _ref9.metaData;

    var payload = [{
      KV: {
        Verb: 'get-tree',
        Key: 'projects/global/' + metaData.projectName + '/' + metaData.networkName + '/commits/'
      }
    }];
    try {
      var response = await Backend.kv.txn(payload);
      if (response.Errors) {
        logger.error('getBlockCommitKeys ' + from + '-' + to, response.Errors);
        return [];
      }
      var commits = (response.Results || []).map(function (r) {
        var arr = r.KV.Key.split('/');
        var blockHeight = arr[arr.length - 2];
        var address = arr[arr.length - 1];
        return {
          key: +blockHeight,
          address: address,
          value: r.KV.Value && Buffer.from(r.KV.Value, 'base64').toString('utf-8').replace(/"/g, '')
        };
      }).filter(function (c) {
        return c.address === metaData.validatorAddress && c.key >= from && c.key < to;
      });
      commits.sort(function (e1, e2) {
        return e1.key < e2.key ? 1 : -1;
      });
      return commits;
    } catch (e) {
      logger.error('getBlockCommitKeys ' + from + '-' + to, e && e.toString());
      return [];
    }
  };
};

var getThresholdSettings = function getThresholdSettings(Backend) {
  return async function (_ref10) {
    var production = _ref10.production,
        prodConfigFile = _ref10.prodConfigFile;

    var _ref11 = await _util2.default.getHealthCheckConfigs(production, prodConfigFile),
        defaultSettingInFile = _ref11.defaultSettings,
        customSettingInFile = _ref11.customSettings;

    var _ref12 = await _promise2.default.all([Backend.kv.getValue(_config2.default.thresholdDefaultSettingsKey), Backend.kv.getValue(_config2.default.thresholdCustomSettingsKey)]),
        _ref13 = (0, _slicedToArray3.default)(_ref12, 2),
        defaultSettingStr = _ref13[0],
        customSettingsStr = _ref13[1];

    var defaultSettingsArr = (defaultSettingStr || '').split(',');
    var defaultSettings = defaultSettingsArr.filter(function (s) {
      return s;
    }).reduce(function (acc, s) {
      var _s$split = s.split(':'),
          _s$split2 = (0, _slicedToArray3.default)(_s$split, 3),
          type = _s$split2[0],
          warning = _s$split2[1],
          critical = _s$split2[2];

      acc[type] = {
        warning: +warning,
        critical: +critical
      };
      return acc;
    }, {});

    var customSettingsArr = (customSettingsStr || '').split(',');
    var customSettings = customSettingsArr.filter(function (s) {
      return s;
    }).reduce(function (acc, s) {
      var _s$split3 = s.split(':'),
          _s$split4 = (0, _slicedToArray3.default)(_s$split3, 4),
          project = _s$split4[0],
          type = _s$split4[1],
          warning = _s$split4[2],
          critical = _s$split4[3];

      if (!acc[project]) {
        acc[project] = {};
      }
      acc[project][type] = {
        warning: +warning,
        critical: +critical
      };
      return acc;
    }, {});
    var finalDefaultSettings = (0, _assign2.default)(defaultSettingInFile, defaultSettings);
    var finalCustomSettings = (0, _assign2.default)(customSettingInFile, customSettings);
    return {
      defaultSettings: finalDefaultSettings,
      customSettings: finalCustomSettings
    };
  };
};

var getValidatorSettingsByProject = function getValidatorSettingsByProject(Backend) {
  return async function (project, network) {
    var fullProjectName = _util2.default.getProjectName(project);
    var validatorStr = (await Backend.kv.getValue(_config2.default.validatorAddressesPrefix + '/' + fullProjectName + '/' + network)) || '';
    var validatorAddresses = validatorStr.split(',').filter(function (v) {
      return v;
    }).reduce(function (acc, v) {
      var _v$split = v.split(':'),
          _v$split2 = (0, _slicedToArray3.default)(_v$split, 2),
          name = _v$split2[0],
          address = _v$split2[1];

      return acc.concat({ name: name, address: address });
    }, []);
    if (validatorAddresses.length > 0) {
      return {
        project: fullProjectName,
        network: network,
        validators: validatorAddresses
      };
    }
    var defaultValidatorAddresses = _config2.default.projectSettings[fullProjectName] && _config2.default.projectSettings[fullProjectName][network];
    return {
      project: fullProjectName,
      network: network,
      validators: defaultValidatorAddresses
    };
  };
};

var getValidatorAddressSettings = function getValidatorAddressSettings(Backend) {
  return async function (prodConfigFile) {
    var projectList = await _util2.default.getProjectList(prodConfigFile);
    var validatorAddressess = await _promise2.default.all(projectList.map(function (e) {
      return getValidatorSettingsByProject(Backend)(e.project, e.network);
    }));
    return validatorAddressess;
  };
};

exports.default = {
  update: update,
  getValueByKey: getValueByKey,
  generateConsulKey: generateConsulKey,
  getAllByKeyPrefix: getAllByKeyPrefix,
  getBlockCommitKeys: getBlockCommitKeys,
  getThresholdSettings: getThresholdSettings,
  getValidatorAddressSettings: getValidatorAddressSettings,
  deleteMultipleKeys: deleteMultipleKeys
};
//# sourceMappingURL=kv-store.js.map
