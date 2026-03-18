const { loadFetchCaches } = require('../fetch-cache');
const { formatWeakReport, buildWeakReport } = require('../weak');
const { writeLine } = require('../terminal');
const { loadTrainingResources } = require('../training');

async function runWeakCommand(context) {
  const caches = loadFetchCaches(context.paths.cacheDir);
  const trainingConfig = loadTrainingResources();
  const report = buildWeakReport(caches, trainingConfig, {
    handle: context.handle,
    logPath: context.paths.logPath,
    topicOverrides: context.config?.topicOverrides || {},
  });

  writeLine(context.stdout, formatWeakReport(report));

  return 0;
}

module.exports = {
  runWeakCommand,
};
