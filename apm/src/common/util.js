import fs from 'fs';
import Bluebird from 'bluebird';
import Config from '../config';
import Constant from '../monit/constant';

Bluebird.promisifyAll(fs);

const convertKebabToCamelCase = (s) => s && s.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

const getProjectName = (project) => (project.includes('bcl-') ? project : `bcl-${project}`);

const getServiceName = (project, production, region) => {
  const projectName = project.includes('bcl-') ? project : `bcl-${project}`;
  if (!production) {
    return projectName;
  }
  return `${projectName}:${region}`;
};

const getValidatorAddress = (settings, projectName, networkName) => {
  const fullProjectName = getProjectName(projectName);
  const proj = settings && settings
    .find((s) => s.project === fullProjectName && s.network === networkName);
  if (!proj || !proj.validators || proj.validators.length === 0) {
    throw new Error(`Missing config for ${projectName} ${networkName}`);
  }
  return proj.validators;
};

const getProductionFileConfig = async (prodConfigFile) => {
  if (!prodConfigFile) {
    throw new Error('Config file is missing');
  }
  const configContent = await fs.readFileSync(prodConfigFile);
  if (!configContent) {
    throw new Error('Can not get config file content');
  }
  try {
    return JSON.parse(configContent);
  } catch (e) {
    throw new Error('Can not parse config file');
  }
};

const getHealthCheckConfigs = async (production, prodConfigFile) => {
  if (!production) {
    return {
      defaultSettings: Config.thresholdLimits,
      customSettings: {},
    };
  }
  const config = await getProductionFileConfig(prodConfigFile);
  return {
    defaultSettings: config.heathChecksThresholdLimits,
    customSettings: config.customHealthCheckThresholdLimits,
  };
};

const splitArray = (arr, size) => {
  const newArr = [];
  for (let i = 0; i < arr.length; i += size) {
    newArr.push(arr.slice(i, i + size));
  }
  return newArr;
};
export const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1));

export const roundFloatNumber = (
  input,
  precision,
) => Math.round(input * (10 ** precision)) / (10 ** precision);

const getProjectList = async (prodConfigFile) => {
  const config = await getProductionFileConfig(prodConfigFile);
  return config.nodes.reduce((acc, n) => acc.concat(n.projects), []).reduce((acc, proj) => {
    const exist = acc.find((a) => a.project === proj.name && a.network === proj.network);
    if (exist) {
      return acc;
    }
    return acc.concat({
      project: proj.name,
      network: proj.network,
    });
  }, []);
};

const getMissedBlockName = (validatorName) => `${Constant.CHECK_NAMES.TM_MISSED_BLOCK}-${validatorName}`;

const getMissedBlockCheckId = (svcName, validatorName) => `service:${svcName}:${validatorName}`;

const getProjectNameSimple = (projectName) => {
  if (!projectName.includes('bcl-')) {
    return projectName;
  }
  const [, project] = projectName.split('bcl-');
  return project;
};

export default {
  convertKebabToCamelCase,
  getProjectName,
  getValidatorAddress,
  getProductionFileConfig,
  getHealthCheckConfigs,
  getServiceName,
  splitArray,
  randomInteger,
  roundFloatNumber,
  getProjectList,
  getMissedBlockName,
  getProjectNameSimple,
  getMissedBlockCheckId,
};
