const TREND_LIMIT = 8;
const TREND_BAR_WIDTH = 20;
const RATING_BUCKET_LABELS = ['800', '900', '1000', '1100', '1200', '1300', '1400', '1500', '1600+'];
const {
  formatRating,
  getCacheHandle,
  hasAnyCache,
  isFiniteNumber,
  normalizeTags,
} = require('./utils');

const PRESERVE_TAG_CASE = Object.freeze({ lowerCase: false });

function dedupeSubmissions(items = []) {
  const seenIds = new Set();
  const deduped = [];

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    if (item.id !== undefined && item.id !== null) {
      if (seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
    }

    deduped.push(item);
  }

  return deduped.sort((left, right) => {
    const leftTime = left.creationTimeSeconds ?? 0;
    const rightTime = right.creationTimeSeconds ?? 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const leftId = left.id ?? 0;
    const rightId = right.id ?? 0;

    return leftId - rightId;
  });
}

function getProblemMeta(problem = {}, problemKey = null) {
  return {
    key: problem.key || problemKey || null,
    name: problem.name || null,
    rating: isFiniteNumber(problem.rating) ? problem.rating : null,
    tags: normalizeTags(problem.tags, PRESERVE_TAG_CASE),
  };
}

function mergeProblemMeta(baseMeta, nextMeta) {
  if (!baseMeta) {
    return nextMeta;
  }

  if (!nextMeta) {
    return baseMeta;
  }

  return {
    key: baseMeta.key || nextMeta.key || null,
    name: baseMeta.name || nextMeta.name || null,
    rating: baseMeta.rating ?? nextMeta.rating ?? null,
    tags: baseMeta.tags.length > 0 ? baseMeta.tags : nextMeta.tags,
  };
}

function createProblemLookup(problemsetItems = [], submissions = []) {
  const lookup = new Map();

  for (const problem of Array.isArray(problemsetItems) ? problemsetItems : []) {
    if (!problem || !problem.key) {
      continue;
    }

    lookup.set(problem.key, getProblemMeta(problem, problem.key));
  }

  for (const submission of Array.isArray(submissions) ? submissions : []) {
    if (!submission || !submission.problemKey) {
      continue;
    }

    const submissionMeta = getProblemMeta(submission.problem, submission.problemKey);
    const knownMeta = lookup.get(submission.problemKey) || null;

    lookup.set(submission.problemKey, mergeProblemMeta(knownMeta, submissionMeta));
  }

  return lookup;
}

function deriveProblemAttempts(submissions = [], problemLookup = new Map()) {
  const problemAttempts = new Map();

  for (const submission of dedupeSubmissions(submissions)) {
    if (!submission.problemKey) {
      continue;
    }

    const knownProblem = problemLookup.get(submission.problemKey) || getProblemMeta(submission.problem, submission.problemKey);
    const existing = problemAttempts.get(submission.problemKey);

    if (existing) {
      existing.attemptCount += 1;
      existing.accepted = existing.accepted || submission.verdict === 'OK';
      existing.name = existing.name || knownProblem.name;
      existing.rating = existing.rating ?? knownProblem.rating ?? null;

      if (existing.tags.length === 0 && knownProblem.tags.length > 0) {
        existing.tags = knownProblem.tags;
      }

      continue;
    }

    problemAttempts.set(submission.problemKey, {
      problemKey: submission.problemKey,
      name: knownProblem.name,
      rating: knownProblem.rating,
      tags: knownProblem.tags,
      attemptCount: 1,
      accepted: submission.verdict === 'OK',
    });
  }

  return Array.from(problemAttempts.values()).sort((left, right) => left.problemKey.localeCompare(right.problemKey));
}

function aggregateTagStats(problemAttempts = []) {
  const tagStats = new Map();

  for (const problem of Array.isArray(problemAttempts) ? problemAttempts : []) {
    for (const tag of normalizeTags(problem.tags, PRESERVE_TAG_CASE)) {
      if (!tagStats.has(tag)) {
        tagStats.set(tag, {
          tag,
          attemptedCount: 0,
          acCount: 0,
          passRate: 0,
        });
      }

      const entry = tagStats.get(tag);

      entry.attemptedCount += 1;

      if (problem.accepted) {
        entry.acCount += 1;
      }
    }
  }

  return Array.from(tagStats.values())
    .map((entry) => ({
      ...entry,
      passRate: entry.attemptedCount === 0 ? 0 : entry.acCount / entry.attemptedCount,
    }))
    .sort((left, right) => {
      if (right.attemptedCount !== left.attemptedCount) {
        return right.attemptedCount - left.attemptedCount;
      }

      if (right.acCount !== left.acCount) {
        return right.acCount - left.acCount;
      }

      return left.tag.localeCompare(right.tag);
    });
}

function classifyRatingBucket(rating) {
  if (!isFiniteNumber(rating)) {
    return null;
  }

  if (rating >= 1600) {
    return '1600+';
  }

  if (rating < 800) {
    return '800';
  }

  return String(Math.floor(rating / 100) * 100);
}

function aggregateRatingBuckets(problemAttempts = []) {
  const buckets = new Map(RATING_BUCKET_LABELS.map((label) => [label, 0]));

  for (const problem of Array.isArray(problemAttempts) ? problemAttempts : []) {
    if (!problem.accepted) {
      continue;
    }

    const bucket = classifyRatingBucket(problem.rating);

    if (bucket && buckets.has(bucket)) {
      buckets.set(bucket, buckets.get(bucket) + 1);
    }
  }

  return RATING_BUCKET_LABELS.map((label) => ({
    bucket: label,
    acCount: buckets.get(label) || 0,
  }));
}

function getCurrentRating(userCache = null, ratingItems = []) {
  if (isFiniteNumber(userCache?.rating)) {
    return userCache.rating;
  }

  const latestEntry = getLatestRatingEntry(ratingItems);

  return latestEntry?.newRating ?? latestEntry?.oldRating ?? null;
}

function getLatestRatingEntry(ratingItems = []) {
  const normalizedItems = Array.isArray(ratingItems) ? ratingItems.slice() : [];

  normalizedItems.sort((left, right) => {
    const leftTime = left.ratingUpdateTimeSeconds ?? 0;
    const rightTime = right.ratingUpdateTimeSeconds ?? 0;
    return leftTime - rightTime;
  });

  return normalizedItems[normalizedItems.length - 1] || null;
}

function getMaxRating(userCache = null, ratingItems = []) {
  const values = [];

  if (isFiniteNumber(userCache?.rating)) {
    values.push(userCache.rating);
  }

  if (isFiniteNumber(userCache?.maxRating)) {
    values.push(userCache.maxRating);
  }

  for (const item of Array.isArray(ratingItems) ? ratingItems : []) {
    if (isFiniteNumber(item.oldRating)) {
      values.push(item.oldRating);
    }

    if (isFiniteNumber(item.newRating)) {
      values.push(item.newRating);
    }
  }

  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
}

function createTrendBar(length) {
  return '#'.repeat(Math.max(1, length));
}

function renderRatingTrend(ratingItems = [], options = {}) {
  const limit = options.limit ?? TREND_LIMIT;
  const width = options.width ?? TREND_BAR_WIDTH;
  const latestItems = (Array.isArray(ratingItems) ? ratingItems.slice() : [])
    .sort((left, right) => (left.ratingUpdateTimeSeconds ?? 0) - (right.ratingUpdateTimeSeconds ?? 0))
    .slice(-limit);

  if (latestItems.length === 0) {
    return ['  暂无比赛记录'];
  }

  const ratings = latestItems.map((item) => item.newRating ?? item.oldRating ?? 0);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const range = maxRating - minRating;

  return latestItems.map((item, index) => {
    const rating = item.newRating ?? item.oldRating ?? 0;
    const barLength = range === 0
      ? Math.max(1, Math.ceil(width / 2))
      : 1 + Math.round(((rating - minRating) / range) * (width - 1));
    const label = item.contestName || `比赛 ${item.contestId ?? index + 1}`;

    return `  ${(index + 1).toString().padStart(2, '0')}. ${label} ${String(rating).padStart(4, ' ')} | ${createTrendBar(barLength)}`;
  });
}

function formatPercent(rate) {
  return `${Math.round(rate * 100)}%`;
}

function buildStatsReport(caches = {}, options = {}) {
  if (!hasAnyCache(caches)) {
    throw new Error('缺少本地缓存，请先运行 fetch');
  }

  const requestedHandle = options.handle || null;
  const cacheHandle = getCacheHandle(caches, requestedHandle);

  if (requestedHandle && cacheHandle && requestedHandle !== cacheHandle) {
    throw new Error(`本地缓存 handle 为 ${cacheHandle}，请先运行 fetch --handle ${requestedHandle}`);
  }

  const dedupedSubmissions = dedupeSubmissions(caches.submissions?.items || []);
  const problemLookup = createProblemLookup(caches.problems?.items || [], dedupedSubmissions);
  const problemAttempts = deriveProblemAttempts(dedupedSubmissions, problemLookup);
  const ratingItems = Array.isArray(caches.rating?.items) ? caches.rating.items : [];

  return {
    handle: cacheHandle,
    rank: caches.user?.rank || 'unrated',
    currentRating: getCurrentRating(caches.user, ratingItems),
    maxRating: getMaxRating(caches.user, ratingItems),
    trendLines: renderRatingTrend(ratingItems, { limit: options.trendLimit, width: options.trendWidth }),
    tagStats: aggregateTagStats(problemAttempts),
    ratingBuckets: aggregateRatingBuckets(problemAttempts),
    totals: {
      acCount: problemAttempts.filter((problem) => problem.accepted).length,
      submissionCount: dedupedSubmissions.length,
      attemptedProblemCount: problemAttempts.length,
    },
  };
}

function formatStatsReport(report) {
  const lines = [
    `统计：${report.handle || 'unknown'}`,
    `当前 rating：${formatRating(report.currentRating)}`,
    `最高 rating：${formatRating(report.maxRating)}`,
    `当前 rank：${report.rank}`,
    '',
    '最近比赛走势：',
    ...report.trendLines,
    '',
    'Tag 统计：',
  ];

  if (report.tagStats.length === 0) {
    lines.push('  暂无 tag 数据');
  } else {
    for (const entry of report.tagStats) {
      lines.push(`  ${entry.tag}: AC ${entry.acCount} / 尝试 ${entry.attemptedCount} / 通过率 ${formatPercent(entry.passRate)}`);
    }
  }

  lines.push('');
  lines.push('Rating 分档 AC：');

  for (const bucket of report.ratingBuckets) {
    lines.push(`  ${bucket.bucket}: ${bucket.acCount}`);
  }

  lines.push('');
  lines.push(`总 AC 题数：${report.totals.acCount}`);
  lines.push(`总提交数：${report.totals.submissionCount}`);
  lines.push(`总尝试题数：${report.totals.attemptedProblemCount}`);

  return lines.join('\n');
}

module.exports = {
  RATING_BUCKET_LABELS,
  TREND_BAR_WIDTH,
  TREND_LIMIT,
  aggregateRatingBuckets,
  aggregateTagStats,
  buildStatsReport,
  classifyRatingBucket,
  createProblemLookup,
  dedupeSubmissions,
  deriveProblemAttempts,
  formatPercent,
  formatStatsReport,
  getCurrentRating,
  getMaxRating,
  renderRatingTrend,
};
