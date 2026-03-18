const { createCodeforcesApiClient } = require('../codeforces-api');
const {
  loadFetchCaches,
  mergeProblemsetCache,
  mergeRatingCache,
  mergeSubmissionsCache,
  mergeUserCache,
  writeFetchCaches,
} = require('../fetch-cache');
const { writeLine } = require('../terminal');

function formatFetchSummary(summary) {
  return `fetch 完成：新提交 ${summary.newSubmissionCount}，新增 AC ${summary.newAcProblemCount}，rating 更新 ${summary.newRatingCount}，新增题目 ${summary.newProblemCount}。`;
}

async function runFetchCommand(context) {
  if (!context.handle) {
    throw new Error('缺少 handle，请通过 --handle 或配置文件提供');
  }

  const apiClient = context.apiClient || createCodeforcesApiClient();
  const existingCaches = loadFetchCaches(context.paths.cacheDir);

  const [user, submissions, rating, problems] = await Promise.all([
    apiClient.fetchUserInfo(context.handle),
    apiClient.fetchUserStatus(context.handle),
    apiClient.fetchUserRating(context.handle),
    apiClient.fetchProblemsetProblems(),
  ]);

  const mergedUser = mergeUserCache(existingCaches.user, user);
  const mergedSubmissions = mergeSubmissionsCache(existingCaches.submissions, submissions);
  const mergedRating = mergeRatingCache(existingCaches.rating, rating);
  const mergedProblems = mergeProblemsetCache(existingCaches.problems, problems);

  writeFetchCaches(context.paths.cacheDir, {
    user: mergedUser.data,
    submissions: mergedSubmissions.data,
    rating: mergedRating.data,
    problems: mergedProblems.data,
  });

  const summary = {
    newSubmissionCount: mergedSubmissions.summary.newSubmissionCount,
    newAcProblemCount: mergedSubmissions.summary.newAcProblemCount,
    newRatingCount: mergedRating.summary.newRatingCount,
    newProblemCount: mergedProblems.summary.newProblemCount,
  };

  writeLine(context.stdout, formatFetchSummary(summary));

  return 0;
}

module.exports = {
  formatFetchSummary,
  runFetchCommand,
};
