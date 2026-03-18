const { createConfiguredCodeforcesApiClient } = require('../codeforces-api');
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

function validateHandle(handle) {
  if (!handle || !String(handle).trim()) {
    return '缺少 handle，请通过 --handle 或配置文件提供';
  }

  if (/\s/.test(handle)) {
    return `handle ${handle} 无效，不能包含空格`;
  }

  return null;
}

function formatFetchError(error, context) {
  const message = error.message || String(error);

  if (/user with handle .*not found/i.test(message)) {
    return `handle ${context.handle} 不存在，请检查拼写后重试`;
  }

  const hasExistingCache = Boolean(
    context.existingCaches?.user
    || context.existingCaches?.submissions
    || context.existingCaches?.rating
    || context.existingCaches?.problems
  );

  if (hasExistingCache) {
    return `${message}；现有缓存已保留`;
  }

  return message;
}

async function runFetchCommand(context) {
  const handleError = validateHandle(context.handle);

  if (handleError) {
    throw new Error(handleError);
  }

  const apiClient = context.apiClient || createConfiguredCodeforcesApiClient(context.env);
  const existingCaches = loadFetchCaches(context.paths.cacheDir);

  let user;
  let submissions;
  let rating;
  let problems;

  try {
    [user, submissions, rating, problems] = await Promise.all([
      apiClient.fetchUserInfo(context.handle),
      apiClient.fetchUserStatus(context.handle),
      apiClient.fetchUserRating(context.handle),
      apiClient.fetchProblemsetProblems(),
    ]);
  } catch (error) {
    throw new Error(formatFetchError(error, {
      handle: context.handle,
      existingCaches,
    }));
  }

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
