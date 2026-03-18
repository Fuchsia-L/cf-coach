const { loadFetchCaches } = require('../fetch-cache');
const { formatStatsReport, buildStatsReport } = require('../stats');
const { writeLine } = require('../terminal');

async function runStatsCommand(context) {
  const caches = loadFetchCaches(context.paths.cacheDir);
  const report = buildStatsReport(caches, {
    handle: context.handle,
  });

  writeLine(context.stdout, formatStatsReport(report));

  return 0;
}

module.exports = {
  runStatsCommand,
};
