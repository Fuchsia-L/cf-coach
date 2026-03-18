const path = require('path');

const { loadFetchCaches } = require('./fetch-cache');
const { buildNextReport } = require('./next');
const { getAppPaths } = require('./paths');
const {
  aggregateRatingBuckets,
  aggregateTagStats,
  createProblemLookup,
  dedupeSubmissions,
  deriveProblemAttempts,
  getCurrentRating,
  getMaxRating,
} = require('./stats');
const { buildProgressModel, loadTrainingResources } = require('./training');
const { getCacheHandle, normalizeTags } = require('./utils');
const { buildWeakReport } = require('./weak');

function createJsonError(code, message, details) {
  const error = {
    code,
    message,
  };

  if (details) {
    error.details = details;
  }

  return { error };
}

function getDashboardBaseDir(baseDir = null) {
  return baseDir || path.resolve(__dirname, '..');
}

function loadDashboardSnapshot(options = {}) {
  const paths = getAppPaths(options.env);
  const caches = loadFetchCaches(paths.cacheDir);

  return {
    paths,
    caches: {
      user: caches.user,
      submissions: caches.submissions,
      rating: caches.rating,
      problems: caches.problems,
    },
    meta: caches.meta,
  };
}

function loadDashboardTrainingConfig(options = {}) {
  return loadTrainingResources({
    baseDir: getDashboardBaseDir(options.baseDir),
    env: options.env,
  });
}

function buildAttemptSnapshot(caches = {}) {
  const submissions = dedupeSubmissions(caches.submissions?.items || []);
  const problemLookup = createProblemLookup(caches.problems?.items || [], submissions);
  const problemAttempts = deriveProblemAttempts(submissions, problemLookup);

  return {
    submissions,
    problemLookup,
    problemAttempts,
  };
}

function hasUsableCache(snapshot, keys = []) {
  return keys.some((key) => snapshot.caches[key]);
}

function getCacheStatuses(snapshot, keys = []) {
  return keys.reduce((result, key) => {
    result[key] = snapshot.meta[key]?.status || 'missing';
    return result;
  }, {});
}

function getCacheFailure(snapshot, keys = [], options = {}) {
  if (hasUsableCache(snapshot, keys)) {
    return null;
  }

  const statuses = getCacheStatuses(snapshot, keys);
  const malformedKeys = Object.entries(statuses)
    .filter(([, status]) => status === 'malformed')
    .map(([key]) => key);

  if (malformedKeys.length > 0) {
    return {
      statusCode: options.malformedStatusCode || 500,
      payload: createJsonError(
        'CACHE_MALFORMED',
        'One or more local cache files are malformed.',
        {
          cache: statuses,
          files: malformedKeys,
        }
      ),
    };
  }

  return {
    statusCode: options.missingStatusCode || 404,
    payload: createJsonError(
      'CACHE_MISSING',
      'Required local cache data is missing.',
      {
        cache: statuses,
      }
    ),
  };
}

function buildProfilePayload(caches = {}) {
  const { submissions, problemAttempts } = buildAttemptSnapshot(caches);
  const ratingItems = Array.isArray(caches.rating?.items) ? caches.rating.items : [];

  return {
    handle: getCacheHandle(caches),
    rating: getCurrentRating(caches.user, ratingItems),
    maxRating: getMaxRating(caches.user, ratingItems),
    rank: caches.user?.rank || 'unrated',
    totalAcceptedCount: problemAttempts.filter((problem) => problem.accepted).length,
    totalSubmissionsCount: submissions.length,
    totalAttemptedProblems: problemAttempts.length,
  };
}

function buildRatingHistoryPayload(caches = {}) {
  const items = Array.isArray(caches.rating?.items) ? caches.rating.items.slice() : [];

  items.sort((left, right) => {
    const leftTime = left.ratingUpdateTimeSeconds ?? 0;
    const rightTime = right.ratingUpdateTimeSeconds ?? 0;
    return leftTime - rightTime;
  });

  return {
    items: items.map((entry) => ({
      contestName: entry.contestName || null,
      timestamp: entry.ratingUpdateTimeSeconds ?? null,
      newRating: entry.newRating ?? null,
    })),
  };
}

function buildTagStatsPayload(caches = {}) {
  const { problemAttempts } = buildAttemptSnapshot(caches);

  return {
    items: aggregateTagStats(problemAttempts).map((entry) => ({
      tag: entry.tag,
      acceptedCount: entry.acCount,
      attemptedCount: entry.attemptedCount,
      acceptanceRate: entry.passRate,
    })),
  };
}

function buildRatingBucketsPayload(caches = {}) {
  const { problemAttempts } = buildAttemptSnapshot(caches);

  return {
    items: aggregateRatingBuckets(problemAttempts).map((entry) => ({
      bucket: entry.bucket,
      acceptedCount: entry.acCount,
    })),
  };
}

function buildRoadmapPayload(caches = {}, trainingConfig) {
  const progressModel = buildProgressModel(caches, trainingConfig);

  return {
    items: progressModel.stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      tag: normalizeTags(stage.tags).join(', '),
      acceptedProgress: stage.acCount,
      target: stage.targetAcMin,
      isCurrentStage: stage.id === progressModel.currentStage?.id,
    })),
  };
}

function createProblemLink(problemKey) {
  if (!problemKey || typeof problemKey !== 'string') {
    return null;
  }

  const match = problemKey.match(/^(\d+)(.+)$/);

  if (!match) {
    return null;
  }

  return `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}`;
}

function mapProblemSummary(problem) {
  if (!problem) {
    return null;
  }

  return {
    problemId: problem.key || null,
    title: problem.name || null,
    rating: problem.rating ?? null,
    tags: normalizeTags(problem.tags),
    link: createProblemLink(problem.key || null),
  };
}

function buildWeakPayload(caches = {}, trainingConfig) {
  const report = buildWeakReport(caches, trainingConfig);

  return {
    currentStage: report.currentStage
      ? {
        id: report.currentStage.id,
        name: report.currentStage.name,
      }
      : null,
    tagGaps: report.weakTags.map((entry) => ({
      tag: entry.tag,
      acceptedCount: entry.acCount,
      attemptedCount: entry.attemptedCount,
      acceptanceRate: entry.passRate,
    })),
    ratingWeakZones: report.weakRatingRanges.map((entry) => ({
      bucket: entry.bucket,
      label: entry.label,
      acceptedCount: entry.acCount,
      problemCount: entry.problemCount,
      submissionCount: entry.submissionCount,
      failedSubmissionCount: entry.failedSubmissionCount,
      acceptanceRate: entry.passRate,
    })),
    roadmapGaps: report.roadmapGaps.map((entry) => ({
      stageId: entry.stageId,
      stageName: entry.stageName,
      tag: entry.tag,
      acceptedProgress: entry.solvedCount,
      target: entry.targetCount,
      missingCount: entry.missingCount,
    })),
    recommendations: report.recommendations.map((entry) => ({
      type: entry.type,
      text: entry.text,
    })),
  };
}

function buildNextPayload(caches = {}, trainingConfig) {
  const report = buildNextReport(caches, trainingConfig);

  return {
    currentTopic: report.selection.topic,
    stage: {
      id: report.selection.stage.id,
      name: report.selection.stage.name,
    },
    stageProgress: {
      accepted: report.selection.topicProgress.solvedCount,
      target: report.selection.topicProgress.targetCount,
      missing: report.selection.topicProgress.missingCount,
    },
    anchor: mapProblemSummary(report.anchor),
    prerequisites: report.prerequisites.map(mapProblemSummary),
  };
}

function buildSubmissionsPayload(caches = {}) {
  const submissions = dedupeSubmissions(caches.submissions?.items || []);
  const problemLookup = createProblemLookup(caches.problems?.items || [], submissions);

  return {
    items: submissions.map((submission) => {
      const meta = problemLookup.get(submission.problemKey) || submission.problem || {};

      return {
        timestamp: submission.creationTimeSeconds ?? null,
        rating: meta.rating ?? null,
        verdict: submission.verdict || null,
        problemId: submission.problemKey || meta.key || null,
        title: meta.name || submission.problemKey || null,
        tags: normalizeTags(meta.tags),
      };
    }),
  };
}

function createDashboardDataLayer(options = {}) {
  const trainingConfigLoader = options.loadTrainingResources || loadDashboardTrainingConfig;

  function getTrainingConfig() {
    return trainingConfigLoader(options);
  }

  function getSnapshot() {
    return loadDashboardSnapshot(options);
  }

  return {
    getProfile() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['user', 'submissions', 'rating']);

      if (failure) {
        return failure;
      }

      return {
        statusCode: 200,
        payload: buildProfilePayload(snapshot.caches),
      };
    },
    getRatingHistory() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['rating']);

      if (failure) {
        return failure;
      }

      return {
        statusCode: 200,
        payload: buildRatingHistoryPayload(snapshot.caches),
      };
    },
    getTagStats() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['submissions', 'problems']);

      if (failure) {
        return failure;
      }

      return {
        statusCode: 200,
        payload: buildTagStatsPayload(snapshot.caches),
      };
    },
    getRatingBuckets() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['submissions', 'problems']);

      if (failure) {
        return failure;
      }

      return {
        statusCode: 200,
        payload: buildRatingBucketsPayload(snapshot.caches),
      };
    },
    getRoadmap() {
      const snapshot = getSnapshot();
      const trainingConfig = getTrainingConfig();

      return {
        statusCode: 200,
        payload: buildRoadmapPayload(snapshot.caches, trainingConfig),
      };
    },
    getWeak() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['user', 'submissions', 'rating', 'problems']);

      if (failure) {
        return failure;
      }

      try {
        return {
          statusCode: 200,
          payload: buildWeakPayload(snapshot.caches, getTrainingConfig()),
        };
      } catch (error) {
        return {
          statusCode: 422,
          payload: createJsonError('WEAK_ANALYSIS_UNAVAILABLE', error.message),
        };
      }
    },
    getNext() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['user', 'submissions', 'rating', 'problems']);

      if (failure) {
        return failure;
      }

      try {
        return {
          statusCode: 200,
          payload: buildNextPayload(snapshot.caches, getTrainingConfig()),
        };
      } catch (error) {
        return {
          statusCode: 422,
          payload: createJsonError('RECOMMENDATION_UNAVAILABLE', error.message),
        };
      }
    },
    getSubmissions() {
      const snapshot = getSnapshot();
      const failure = getCacheFailure(snapshot, ['submissions']);

      if (failure) {
        return failure;
      }

      return {
        statusCode: 200,
        payload: buildSubmissionsPayload(snapshot.caches),
      };
    },
  };
}

module.exports = {
  buildNextPayload,
  buildProfilePayload,
  buildRatingBucketsPayload,
  buildRatingHistoryPayload,
  buildRoadmapPayload,
  buildSubmissionsPayload,
  buildTagStatsPayload,
  buildWeakPayload,
  createDashboardDataLayer,
  createJsonError,
  createProblemLink,
  getCacheFailure,
  hasUsableCache,
  loadDashboardSnapshot,
  loadDashboardTrainingConfig,
};
