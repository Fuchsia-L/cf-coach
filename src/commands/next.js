const { loadFetchCaches } = require('../fetch-cache');
const {
  buildNextReport,
  buildReviewRecommendations,
  formatNextReport,
  formatReviewReport,
  parseNextCommandArgs,
} = require('../next');
const { writeLine } = require('../terminal');
const { loadTrainingResources } = require('../training');

async function runNextCommand(context) {
  const parsed = parseNextCommandArgs(context.args || []);

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  const caches = loadFetchCaches(context.paths.cacheDir);
  const trainingConfig = loadTrainingResources();
  const options = {
    handle: context.handle,
    topic: parsed.options.topic,
    topicOverrides: context.config?.topicOverrides || {},
  };
  const report = parsed.options.review
    ? buildReviewRecommendations(caches, trainingConfig, options)
    : buildNextReport(caches, trainingConfig, options);

  writeLine(context.stdout, parsed.options.review ? formatReviewReport(report) : formatNextReport(report));

  return 0;
}

module.exports = {
  runNextCommand,
};
