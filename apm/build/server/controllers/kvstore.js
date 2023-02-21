'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _websocket = require('../websocket');

var _websocket2 = _interopRequireDefault(_websocket);

var _status = require('./status');

var _status2 = _interopRequireDefault(_status);

var _constant = require('../../monit/constant');

var _constant2 = _interopRequireDefault(_constant);

var _kvStore = require('../../monit/kv-store');

var _kvStore2 = _interopRequireDefault(_kvStore);

var _config = require('../../config');

var _config2 = _interopRequireDefault(_config);

var _util = require('../../common/util');

var _util2 = _interopRequireDefault(_util);

var _core = require('../../core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getKVStoreValueByKey = function getKVStoreValueByKey(rawData) {
  return rawData.reduce(function (acc, data) {
    var value = Buffer.from(data.Value, 'base64').toString('utf-8');
    acc[data.Key] = value;
    return acc;
  }, {});
};

var generateBroadcastData = async function generateBroadcastData(kvStoreData, validatorSettings) {
  var keys = (0, _keys2.default)(kvStoreData);
  var projectAndNetworkList = _status2.default.getProjectAndNetworkList(keys);
  var keyTypes = [_constant2.default.KV_STORE_KEY_TYPES.GLOBAL_STATUS_BLOCK_HEIGHT, _constant2.default.KV_STORE_KEY_TYPES.GLOBAL_STATUS_BLOCK_TIME, _constant2.default.KV_STORE_KEY_TYPES.GLOBAL_STATUS_PEERS_INBOUND, _constant2.default.KV_STORE_KEY_TYPES.GLOBAL_STATUS_PEERS_OUTBOUND, _constant2.default.KV_STORE_KEY_TYPES.GLOBAL_STATUS_PEERS_TOTAL, _constant2.default.KV_STORE_KEY_TYPES.GLOBAL_STATUS_CATCHING_UP];
  return _promise2.default.all(projectAndNetworkList.map(async function (row) {
    var validatorAddresses = await _util2.default.getValidatorAddress(validatorSettings, row.project, row.network);
    var metaData = { projectName: row.project, networkName: row.network };

    var _keyTypes$map = keyTypes.map(function (keyType) {
      return kvStoreData[_kvStore2.default.generateConsulKey({ type: keyType, metaData: metaData })];
    }),
        _keyTypes$map2 = (0, _slicedToArray3.default)(_keyTypes$map, 6),
        blockHeight = _keyTypes$map2[0],
        blockTime = _keyTypes$map2[1],
        peersInbound = _keyTypes$map2[2],
        peersOutbound = _keyTypes$map2[3],
        peersTotal = _keyTypes$map2[4],
        catchingUp = _keyTypes$map2[5];

    var blockCommits = [];
    if (blockHeight > 1) {
      var minimumBlock = Math.max(blockHeight - 50, 1);
      blockCommits = validatorAddresses.map(function (v) {
        var commits = [];
        for (var i = blockHeight - 1; i >= minimumBlock; i -= 1) {
          commits.push(kvStoreData[_kvStore2.default.generateConsulKey({
            type: _constant2.default.KV_STORE_KEY_TYPES.GLOBAL_COMMIT_BY_BLOCK_HEIGHT,
            blockHeight: i,
            metaData: (0, _extends3.default)({}, metaData, { validatorAddress: v.address })
          })]);
        }
        return {
          name: v.name,
          values: commits.filter(function (c) {
            return c;
          }).map(function (value) {
            return !!+value;
          })
        };
      });
    }
    return (0, _extends3.default)({}, metaData, {
      catchingUp: !!+catchingUp,
      blockTime: blockTime,
      blockHeight: blockHeight,
      peersInbound: peersInbound,
      peersOutbound: peersOutbound,
      peersTotal: peersTotal,
      commits: blockCommits
    });
  }));
};

var watch = function watch(req, res) {
  return async function (_ref) {
    var wss = _ref.wss,
        Backend = _ref.Backend,
        prodConfigFile = _ref.prodConfigFile;

    if (!req.body || req.body.length === 0) {
      return res;
    }
    var KVStoreData = getKVStoreValueByKey(req.body);
    var validatorSettings = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
    var formattedData = await generateBroadcastData(KVStoreData, validatorSettings);
    _websocket2.default.broadcast(wss)('GLOBAL_STATUS_UPDATE', formattedData);
    res.write('ok');
    return res;
  };
};

var listNodes = function listNodes(req, res) {
  return async function (_ref2) {
    var Backend = _ref2.Backend;

    var nodes = (await Backend.kv.getValue(_config2.default.mutedNodesKey)) || '';
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(nodes);
    return res;
  };
};

var updateNodes = function updateNodes(_ref3, res) {
  var query = _ref3.query;
  return async function (_ref4) {
    var Backend = _ref4.Backend;

    try {
      await Backend.kv.upsert(_config2.default.mutedNodesKey, query.get('nodes'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write(query.get('nodes'));
      return res;
    } catch (e) {
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var composeDefaultSettings = function composeDefaultSettings(updatingSettings) {
  var savedStr = (0, _keys2.default)(updatingSettings).reduce(function (acc, s) {
    var str = s + ':' + updatingSettings[s].warning + ':' + updatingSettings[s].critical;
    if (acc) {
      return acc + ',' + str;
    }
    return str;
  }, '');
  return savedStr;
};

var composeCustomSettings = function composeCustomSettings(updatingSettings) {
  var savedStr = (0, _keys2.default)(updatingSettings).reduce(function (acc, proj) {
    var str = (0, _keys2.default)(updatingSettings[proj]).reduce(function (acc2, s) {
      var setting = updatingSettings[proj][s];
      var str2 = proj + ':' + s + ':' + setting.warning + ':' + setting.critical;
      if (acc2) {
        return acc2 + ',' + str2;
      }
      return str2;
    }, '');
    if (acc) {
      return acc + ',' + str;
    }
    return str;
  }, '');
  return savedStr;
};

var updateThresholdSettings = function updateThresholdSettings(_ref5, res) {
  var body = _ref5.body;
  return async function (_ref6) {
    var Backend = _ref6.Backend,
        prodConfigFile = _ref6.prodConfigFile;

    try {
      var validatorAddresses = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
      var updateDefaultSettings = body.defaultSettings,
          updateCustomSettings = body.customSettings;

      var validTypes = (0, _keys2.default)(_config2.default.thresholdLimits);
      var validProjects = validatorAddresses.map(function (v) {
        return v.project;
      });
      var areSettingsValid = updateDefaultSettings && (0, _keys2.default)(updateDefaultSettings).every(function (s) {
        return validTypes.includes(s) && +updateDefaultSettings[s].warning > 0 && +updateDefaultSettings[s].critical > 0;
      });
      var areCustomSettingsValid = (0, _keys2.default)(updateCustomSettings || []).every(function (proj) {
        return validProjects.includes(_util2.default.getProjectName(proj)) && (0, _keys2.default)(updateCustomSettings[proj]).every(function (s) {
          return validTypes.includes(s) && +updateCustomSettings[proj][s].warning > 0 && +updateCustomSettings[proj][s].critical > 0;
        });
      });
      if (!areSettingsValid || !areCustomSettingsValid) {
        res.writeHead(400);
        res.write('Invalid payload');
        return res;
      }
      var defaultSettingsStr = composeDefaultSettings(updateDefaultSettings);
      var customSettingsStr = composeCustomSettings(updateCustomSettings);
      await _promise2.default.all([Backend.kv.upsert(_config2.default.thresholdDefaultSettingsKey, defaultSettingsStr), Backend.kv.upsert(_config2.default.thresholdCustomSettingsKey, customSettingsStr)]);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write((0, _stringify2.default)({ default: defaultSettingsStr, custom: customSettingsStr }));
      return res;
    } catch (e) {
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var getThresholdSettings = function getThresholdSettings(req, res) {
  return async function (_ref7) {
    var Backend = _ref7.Backend,
        production = _ref7.production,
        prodConfigFile = _ref7.prodConfigFile;

    try {
      var settings = await _kvStore2.default.getThresholdSettings(Backend)({ production: production, prodConfigFile: prodConfigFile });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write((0, _stringify2.default)(settings));
      return res;
    } catch (e) {
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var getValidatorAddresses = function getValidatorAddresses(req, res) {
  return async function (_ref8) {
    var Backend = _ref8.Backend,
        prodConfigFile = _ref8.prodConfigFile;

    try {
      var validatorAddressess = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write((0, _stringify2.default)(validatorAddressess));
      return res;
    } catch (e) {
      console.log(e);
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var addNewChecks = function addNewChecks(Backend) {
  return async function (nodeList, serverConfig, project, network, validator) {
    var projectName = _util2.default.getProjectNameSimple(project);
    var deregisteredRegions = serverConfig.deRegisterServices[projectName] || [];
    var nodes = nodeList.filter(function (node) {
      return !deregisteredRegions.includes(projectName) && node.projects.some(function (p) {
        return p.name === projectName && p.network === network;
      });
    }).map(function (node) {
      return {
        region: node.nodeRegion,
        project: projectName,
        network: network
      };
    });
    await _promise2.default.all(nodes.map(async function (node) {
      var svcName = _util2.default.getServiceName(node.project, true, node.region);
      var checkPayload = {
        Name: _util2.default.getMissedBlockName(validator.name),
        ID: _util2.default.getMissedBlockCheckId(svcName, validator.name),
        Notes: 'Tally for monitoring missed blocks threshold ' + validator.address,
        TTL: '20s',
        ServiceID: svcName,
        Status: 'critical'
      };
      var res = await Backend.agent.check.register(checkPayload);
      return res;
    }));
  };
};

var removeChecks = function removeChecks(Backend) {
  return async function (nodeList, serverConfig, project, network, validator) {
    var projectName = _util2.default.getProjectNameSimple(project);
    var deregisteredRegions = serverConfig.deRegisterServices[projectName] || [];
    var nodes = nodeList.filter(function (node) {
      return !deregisteredRegions.includes(projectName) && node.projects.some(function (p) {
        return p.name === projectName && p.network === network;
      });
    }).map(function (node) {
      return {
        region: node.nodeRegion,
        project: projectName,
        network: network
      };
    });
    await _promise2.default.all(nodes.map(async function (node) {
      var svcName = _util2.default.getServiceName(node.project, true, node.region);
      var checkId = _util2.default.getMissedBlockCheckId(svcName, validator.name);
      return Backend.agent.check.destroy(checkId);
    }));
  };
};

var updateValidatorAddressKVStore = function updateValidatorAddressKVStore(Backend) {
  return async function (validatorAddresses, project, network) {
    var validatorStr = validatorAddresses.reduce(function (acc, v) {
      var str = v.name + ':' + v.address;
      if (acc) {
        return acc + ',' + str;
      }
      return str;
    }, '');
    return Backend.kv.upsert(_config2.default.validatorAddressesPrefix + '/' + project + '/' + network, validatorStr);
  };
};

var updateValidatorAddress = function updateValidatorAddress(req, res) {
  return async function (_ref9) {
    var Backend = _ref9.Backend,
        nodeIp = _ref9.node,
        nomadPort = _ref9.nomadPort,
        consulPort = _ref9.consulPort,
        production = _ref9.production,
        prodConfigFile = _ref9.prodConfigFile;

    try {
      var _req$body = req.body,
          network = _req$body.network,
          project = _req$body.project,
          validator = _req$body.validator;

      var isPayloadValid = network && project && validator && validator.address && validator.address.length === 40 && validator.name;
      if (!isPayloadValid) {
        res.writeHead(400);
        res.write('Invalid payload');
        return res;
      }
      var validatorSettings = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
      var validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, project, network);
      var doesValidatorExist = validatorAddresses.find(function (v) {
        return v.address === validator.address || v.name === validator.name;
      });
      if (doesValidatorExist) {
        res.writeHead(400);
        res.write('Validator name or address exists!');
        return res;
      }
      var newValidatorAddress = validatorAddresses.concat({
        name: validator.name,
        address: validator.address
      });
      await updateValidatorAddressKVStore(Backend)(newValidatorAddress, project, network);

      var _ref10 = await _core2.default.getNodeInfos({
        nodeIp: nodeIp,
        nomadPort: nomadPort,
        consulPort: consulPort,
        production: production,
        prodConfigFile: prodConfigFile
      }),
          nodeList = _ref10.nodeList,
          serverConfig = _ref10.serverConfig;

      await addNewChecks(Backend)(nodeList, serverConfig, project, network, validator);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write((0, _stringify2.default)({
        project: project, network: network, validators: newValidatorAddress
      }));
      return res;
    } catch (e) {
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

var removeValidatorAddress = function removeValidatorAddress(req, res) {
  return async function (_ref11) {
    var Backend = _ref11.Backend,
        nodeIp = _ref11.node,
        nomadPort = _ref11.nomadPort,
        consulPort = _ref11.consulPort,
        production = _ref11.production,
        prodConfigFile = _ref11.prodConfigFile;

    try {
      var _req$body2 = req.body,
          network = _req$body2.network,
          project = _req$body2.project,
          validator = _req$body2.validator;

      var isPayloadValid = network && project && validator && validator.address && validator.address.length === 40 && validator.name;
      if (!isPayloadValid) {
        res.writeHead(400);
        res.write('Invalid payload');
        return res;
      }
      var validatorSettings = await _kvStore2.default.getValidatorAddressSettings(Backend)(prodConfigFile);
      var validatorAddresses = _util2.default.getValidatorAddress(validatorSettings, project, network);
      var matchValidatorIndex = validatorAddresses.findIndex(function (v) {
        return v.address === validator.address && v.name === validator.name;
      });
      if (matchValidatorIndex === -1) {
        res.writeHead(400);
        res.write('Validator not found!');
        return res;
      }
      validatorAddresses.splice(matchValidatorIndex, 1);
      await updateValidatorAddressKVStore(Backend)(validatorAddresses, project, network);

      var _ref12 = await _core2.default.getNodeInfos({
        nodeIp: nodeIp,
        nomadPort: nomadPort,
        consulPort: consulPort,
        production: production,
        prodConfigFile: prodConfigFile
      }),
          nodeList = _ref12.nodeList,
          serverConfig = _ref12.serverConfig;

      await removeChecks(Backend)(nodeList, serverConfig, project, network, validator);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write((0, _stringify2.default)({
        project: project, network: network, validators: validatorAddresses
      }));
      return res;
    } catch (e) {
      res.writeHead(500);
      res.write((0, _stringify2.default)(e && e.toString()));
      return res;
    }
  };
};

exports.default = {
  watch: watch,
  listNodes: listNodes,
  updateNodes: updateNodes,
  updateThresholdSettings: updateThresholdSettings,
  getThresholdSettings: getThresholdSettings,
  getValidatorAddresses: getValidatorAddresses,
  updateValidatorAddress: updateValidatorAddress,
  removeValidatorAddress: removeValidatorAddress
};
//# sourceMappingURL=kvstore.js.map
