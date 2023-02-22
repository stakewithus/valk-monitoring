'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.roundFloatNumber = exports.randomInteger = undefined;

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _constant = require('../monit/constant');

var _constant2 = _interopRequireDefault(_constant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_bluebird2.default.promisifyAll(_fs2.default);

var convertKebabToCamelCase = function convertKebabToCamelCase(s) {
  return s && s.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
};

var getProjectName = function getProjectName(project) {
  return project.includes('bcl-') ? project : 'bcl-' + project;
};

var getServiceName = function getServiceName(project, production, region) {
  var projectName = project.includes('bcl-') ? project : 'bcl-' + project;
  if (!production) {
    return projectName;
  }
  return projectName + ':' + region;
};

var getValidatorAddress = function getValidatorAddress(settings, projectName, networkName) {
  var fullProjectName = getProjectName(projectName);
  var proj = settings && settings.find(function (s) {
    return s.project === fullProjectName && s.network === networkName;
  });
  if (!proj || !proj.validators || proj.validators.length === 0) {
    throw new Error('Missing config for ' + projectName + ' ' + networkName);
  }
  return proj.validators;
};

var getProductionFileConfig = async function getProductionFileConfig(prodConfigFile) {
  if (!prodConfigFile) {
    throw new Error('Config file is missing');
  }
  var configContent = await _fs2.default.readFileSync(prodConfigFile);
  if (!configContent) {
    throw new Error('Can not get config file content');
  }
  try {
    return JSON.parse(configContent);
  } catch (e) {
    throw new Error('Can not parse config file');
  }
};

var getHealthCheckConfigs = async function getHealthCheckConfigs(production, prodConfigFile) {
  if (!production) {
    return {
      defaultSettings: _config2.default.thresholdLimits,
      customSettings: {}
    };
  }
  var config = await getProductionFileConfig(prodConfigFile);
  return {
    defaultSettings: config.heathChecksThresholdLimits,
    customSettings: config.customHealthCheckThresholdLimits
  };
};

var splitArray = function splitArray(arr, size) {
  var newArr = [];
  for (var i = 0; i < arr.length; i += size) {
    newArr.push(arr.slice(i, i + size));
  }
  return newArr;
};
var randomInteger = exports.randomInteger = function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1));
};

var roundFloatNumber = exports.roundFloatNumber = function roundFloatNumber(input, precision) {
  return Math.round(input * 10 ** precision) / 10 ** precision;
};

var getProjectList = async function getProjectList(prodConfigFile) {
  var config = await getProductionFileConfig(prodConfigFile);
  return config.nodes.reduce(function (acc, n) {
    return acc.concat(n.projects);
  }, []).reduce(function (acc, proj) {
    var exist = acc.find(function (a) {
      return a.project === proj.name && a.network === proj.network;
    });
    if (exist) {
      return acc;
    }
    return acc.concat({
      project: proj.name,
      network: proj.network
    });
  }, []);
};

var getMissedBlockName = function getMissedBlockName(validatorName) {
  return _constant2.default.CHECK_NAMES.TM_MISSED_BLOCK + '-' + validatorName;
};

var getMissedBlockCheckId = function getMissedBlockCheckId(svcName, validatorName) {
  return 'service:' + svcName + ':' + validatorName;
};

var getProjectNameSimple = function getProjectNameSimple(projectName) {
  if (!projectName.includes('bcl-')) {
    return projectName;
  }

  var _projectName$split = projectName.split('bcl-'),
      _projectName$split2 = (0, _slicedToArray3.default)(_projectName$split, 2),
      project = _projectName$split2[1];

  return project;
};

exports.default = {
  convertKebabToCamelCase: convertKebabToCamelCase,
  getProjectName: getProjectName,
  getValidatorAddress: getValidatorAddress,
  getProductionFileConfig: getProductionFileConfig,
  getHealthCheckConfigs: getHealthCheckConfigs,
  getServiceName: getServiceName,
  splitArray: splitArray,
  randomInteger: randomInteger,
  roundFloatNumber: roundFloatNumber,
  getProjectList: getProjectList,
  getMissedBlockName: getMissedBlockName,
  getProjectNameSimple: getProjectNameSimple,
  getMissedBlockCheckId: getMissedBlockCheckId
};
//# sourceMappingURL=util.js.map
