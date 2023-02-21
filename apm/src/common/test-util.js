import fs from 'fs';
import Bluebird from 'bluebird';
import path from 'path';

Bluebird.promisifyAll(fs);

const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const getFileContent = (fPath) => async (fName) => {
  const rawData = await fs.readFileAsync(path.join(fPath, fName));
  const fData = JSON.parse(rawData);
  const { 0: kName } = fName.split('.json');
  const [, ...listName] = kName.split('_');
  const name = listName.map(upperFirst).join('');
  return { [name]: fData };
};

const getFolderContent = async (folder, relative = '../') => {
  const fPath = path.join(__dirname, relative, folder);
  const fileList = await fs.readdirAsync(fPath);
  const pList = await Promise.all(fileList.filter((f) => f.indexOf('.json') > -1)
    .map(getFileContent(fPath)));
  const content = pList.reduce((acc, row) => ({ ...acc, ...row }), {});
  return content;
};

export default {
  getFolderContent,
};
