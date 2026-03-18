const os = require('os');
const path = require('path');

function resolveHomeDir(env = process.env) {
  return env.CF_COACH_HOME || env.HOME || env.USERPROFILE || os.homedir();
}

function getAppPaths(env = process.env) {
  const homeDir = resolveHomeDir(env);
  const appDir = path.join(homeDir, '.cf-coach');

  return {
    homeDir,
    appDir,
    cacheDir: path.join(appDir, 'cache'),
    configPath: path.join(appDir, 'config.json'),
    logPath: path.join(appDir, 'log.json'),
  };
}

module.exports = {
  getAppPaths,
  resolveHomeDir,
};
