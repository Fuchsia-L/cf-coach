const fs = require('fs');

const { DEFAULT_CONFIG } = require('./constants');
const { readJsonFile, writeJsonFile } = require('./json-file');
const { getAppPaths } = require('./paths');

function ensureAppHome(env = process.env) {
  const paths = getAppPaths(env);

  fs.mkdirSync(paths.appDir, { recursive: true });
  fs.mkdirSync(paths.cacheDir, { recursive: true });

  if (!fs.existsSync(paths.configPath)) {
    writeJsonFile(paths.configPath, DEFAULT_CONFIG);
  }

  return paths;
}

function loadConfig(env = process.env) {
  const paths = ensureAppHome(env);

  try {
    return {
      paths,
      config: readJsonFile(paths.configPath),
    };
  } catch (error) {
    throw new Error(`加载配置失败：${error.message}`);
  }
}

module.exports = {
  ensureAppHome,
  loadConfig,
};
