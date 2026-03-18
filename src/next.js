const {
  formatRating,
  getCacheHandle,
  hasAnyCache,
  isFiniteNumber,
  normalizeString,
  normalizeTag,
  normalizeTags,
} = require('./utils');

const {
  createProblemLookup,
  dedupeSubmissions,
  deriveProblemAttempts,
  getCurrentRating,
} = require('./stats');
const { buildProgressModel, DEFAULT_GUIDE } = require('./training');

function formatProblem(problem) {
  const tags = normalizeTags(problem.tags);
  return `${problem.key} ${problem.name || problem.key} | ${formatRating(problem.rating)} | ${tags.join(', ')}`;
}

function parseNextCommandArgs(args = []) {
  const options = {
    topic: null,
    review: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--topic') {
      const value = args[index + 1];

      if (!value || value.startsWith('--')) {
        return {
          options,
          error: '选项 --topic 需要一个值',
        };
      }

      options.topic = normalizeTag(value);
      index += 1;
      continue;
    }

    if (arg === '--review') {
      options.review = true;
      continue;
    }

    return {
      options,
      error: `未知选项：${arg}`,
    };
  }

  return {
    options,
    error: null,
  };
}

function getAcceptedProblemKeySet(caches = {}) {
  const submissions = dedupeSubmissions(caches.submissions?.items || []);
  const problemLookup = createProblemLookup(caches.problems?.items || [], submissions);
  const attempts = deriveProblemAttempts(submissions, problemLookup);

  return new Set(attempts.filter((attempt) => attempt.accepted).map((attempt) => attempt.problemKey));
}

function selectAnchorRatingBand(currentRating, anchorConfig = DEFAULT_GUIDE.anchor) {
  const threshold = anchorConfig.absoluteMinRating - anchorConfig.userOffsetMin;

  if (isFiniteNumber(currentRating) && currentRating < threshold) {
    const min = currentRating + anchorConfig.userOffsetMin;
    const max = currentRating + anchorConfig.userOffsetMax;

    return {
      min,
      max,
      target: Math.round((min + max) / 2),
      adjustedByUserRating: true,
    };
  }

  return {
    min: anchorConfig.absoluteMinRating,
    max: anchorConfig.absoluteMaxRating,
    target: Math.round((anchorConfig.absoluteMinRating + anchorConfig.absoluteMaxRating) / 2),
    adjustedByUserRating: false,
  };
}

function buildTopicProgress(progressModel, stage, topic) {
  const normalizedTopic = normalizeTag(topic);
  const solvedCount = progressModel.acceptedRecords.filter((record) => (
    record.stageId === stage.id && normalizeTags(record.tags).includes(normalizedTopic)
  )).length;
  const targetCount = Math.max(1, Math.ceil((stage.targetAcMin || progressModel.guide.completion.targetAcMin) / Math.max(stage.tags.length, 1)));

  return {
    solvedCount,
    targetCount,
    missingCount: Math.max(targetCount - solvedCount, 0),
  };
}

function pickStageForTopic(progressModel, topic) {
  const normalizedTopic = normalizeTag(topic);
  const matches = progressModel.roadmap.stages
    .map((stage, index) => ({ stage, index }))
    .filter(({ stage }) => normalizeTags(stage.tags).includes(normalizedTopic));

  if (matches.length === 0) {
    return null;
  }

  const currentIndex = progressModel.currentStageIndex ?? 0;

  matches.sort((left, right) => {
    const leftDistance = Math.abs(left.index - currentIndex);
    const rightDistance = Math.abs(right.index - currentIndex);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const leftIncomplete = progressModel.stages[left.index]?.complete ? 1 : 0;
    const rightIncomplete = progressModel.stages[right.index]?.complete ? 1 : 0;

    if (leftIncomplete !== rightIncomplete) {
      return leftIncomplete - rightIncomplete;
    }

    return left.stage.order - right.stage.order;
  });

  return matches[0].stage;
}

function inferRecommendationTopic(progressModel, manualTopic = null) {
  if (manualTopic) {
    const stage = pickStageForTopic(progressModel, manualTopic);

    if (!stage) {
      throw new Error(`路线图中不存在 topic：${manualTopic}`);
    }

    return {
      source: 'manual',
      topic: normalizeTag(manualTopic),
      stage,
      topicProgress: buildTopicProgress(progressModel, stage, manualTopic),
    };
  }

  const stage = progressModel.currentStage;

  if (!stage) {
    throw new Error('无法推断当前阶段');
  }

  const scoredTopics = normalizeTags(stage.tags).map((topic, index) => ({
    topic,
    index,
    progress: buildTopicProgress(progressModel, stage, topic),
  }));

  scoredTopics.sort((left, right) => {
    if (right.progress.missingCount !== left.progress.missingCount) {
      return right.progress.missingCount - left.progress.missingCount;
    }

    if (left.progress.solvedCount !== right.progress.solvedCount) {
      return left.progress.solvedCount - right.progress.solvedCount;
    }

    return left.index - right.index;
  });

  return {
    source: 'inferred',
    topic: scoredTopics[0].topic,
    stage,
    topicProgress: scoredTopics[0].progress,
  };
}

function buildProblemCatalog(caches = {}, topic) {
  const normalizedTopic = normalizeTag(topic);

  return (Array.isArray(caches.problems?.items) ? caches.problems.items : [])
    .filter((problem) => problem && problem.key && isFiniteNumber(problem.rating))
    .map((problem) => ({
      key: problem.key,
      name: problem.name || problem.key,
      rating: problem.rating,
      tags: normalizeTags(problem.tags),
    }))
    .filter((problem) => problem.tags.includes(normalizedTopic))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function scoreTagCombinationSimilarity(referenceTags, candidateTags, topic) {
  const normalizedReferenceTags = normalizeTags(referenceTags);
  const normalizedCandidateTags = normalizeTags(candidateTags);
  const normalizedTopic = normalizeTag(topic);

  if (!normalizedCandidateTags.includes(normalizedTopic)) {
    return Number.NEGATIVE_INFINITY;
  }

  const referenceSet = new Set(normalizedReferenceTags.length > 0 ? normalizedReferenceTags : [normalizedTopic]);
  const overlap = normalizedCandidateTags.filter((tag) => referenceSet.has(tag));

  if (!overlap.includes(normalizedTopic)) {
    return Number.NEGATIVE_INFINITY;
  }

  const extraOverlapCount = overlap.filter((tag) => tag !== normalizedTopic).length;
  const exactMatch = normalizedCandidateTags.length === referenceSet.size && overlap.length === referenceSet.size;
  const unrelatedTagCount = normalizedCandidateTags.filter((tag) => !referenceSet.has(tag)).length;

  return (exactMatch ? 100 : 0) + (extraOverlapCount * 20) + (overlap.length * 5) - unrelatedTagCount;
}

function selectProblemForTarget(candidates, options = {}) {
  const normalizedTopic = normalizeTag(options.topic);
  const usedKeys = options.usedKeys || new Set();
  const referenceTags = normalizeTags(options.referenceTags);
  const targetRating = options.targetRating;
  const hasPreferredRange = isFiniteNumber(options.preferredMin) && isFiniteNumber(options.preferredMax);

  const available = candidates.filter((problem) => !usedKeys.has(problem.key));

  if (available.length === 0) {
    return null;
  }

  const preferred = hasPreferredRange
    ? available.filter((problem) => problem.rating >= options.preferredMin && problem.rating <= options.preferredMax)
    : [];
  const pool = preferred.length > 0 ? preferred : available;

  const ranked = pool.map((problem) => ({
    problem,
    similarity: scoreTagCombinationSimilarity(referenceTags, problem.tags, normalizedTopic),
    ratingDistance: isFiniteNumber(targetRating) ? Math.abs(problem.rating - targetRating) : 0,
  }));

  ranked.sort((left, right) => {
    if (preferred.length > 0) {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }

      if (left.ratingDistance !== right.ratingDistance) {
        return left.ratingDistance - right.ratingDistance;
      }
    } else {
      if (left.ratingDistance !== right.ratingDistance) {
        return left.ratingDistance - right.ratingDistance;
      }

      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }
    }

    if (right.problem.rating !== left.problem.rating) {
      return right.problem.rating - left.problem.rating;
    }

    return left.problem.key.localeCompare(right.problem.key);
  });

  const best = ranked[0];

  return {
    ...best.problem,
    targetRating,
    ratingDistance: best.ratingDistance,
    similarityScore: best.similarity,
    preferredRangeUsed: preferred.length > 0,
  };
}

function selectAnchorProblem(candidates, options = {}) {
  return selectProblemForTarget(candidates, {
    topic: options.topic,
    referenceTags: options.referenceTags,
    targetRating: options.anchorBand.target,
    preferredMin: options.anchorBand.min,
    preferredMax: options.anchorBand.max,
    usedKeys: options.usedKeys,
  });
}

function selectPrerequisiteProblems(candidates, anchorProblem, guide, options = {}) {
  const usedKeys = new Set(options.usedKeys || []);
  const prerequisites = [];

  for (const offset of guide.prerequisites.ratingOffsets) {
    const targetRating = anchorProblem.rating + offset;
    const selected = selectProblemForTarget(candidates, {
      topic: options.topic,
      referenceTags: anchorProblem.tags,
      targetRating,
      preferredMin: targetRating - 50,
      preferredMax: targetRating + 50,
      usedKeys,
    });

    if (!selected) {
      continue;
    }

    usedKeys.add(selected.key);
    prerequisites.push({
      ...selected,
      offset,
      fallbackUsed: !selected.preferredRangeUsed,
    });
  }

  return prerequisites;
}

function buildSubmissionTimeline(caches = {}) {
  const submissions = dedupeSubmissions(caches.submissions?.items || []);
  const problemLookup = createProblemLookup(caches.problems?.items || [], submissions);
  const timeline = new Map();

  for (const submission of submissions) {
    if (!submission.problemKey) {
      continue;
    }

    const key = submission.problemKey;
    const knownProblem = problemLookup.get(key) || {
      key,
      name: submission.problem?.name || key,
      rating: submission.problem?.rating ?? null,
      tags: normalizeTags(submission.problem?.tags),
    };
    const createdAt = submission.creationTimeSeconds ?? 0;
    const existing = timeline.get(key) || {
      key,
      name: knownProblem.name || key,
      rating: knownProblem.rating,
      tags: normalizeTags(knownProblem.tags),
      acceptedAt: null,
      lastSubmissionAt: 0,
    };

    existing.lastSubmissionAt = Math.max(existing.lastSubmissionAt, createdAt);

    if (submission.verdict === 'OK' && existing.acceptedAt === null) {
      existing.acceptedAt = createdAt;
    }

    timeline.set(key, existing);
  }

  return Array.from(timeline.values())
    .filter((entry) => entry.acceptedAt !== null)
    .sort((left, right) => left.acceptedAt - right.acceptedAt || left.key.localeCompare(right.key));
}

function buildReviewRecommendations(caches, trainingConfig, options = {}) {
  const progressModel = buildProgressModel(caches, trainingConfig, {
    topicOverrides: options.topicOverrides || {},
  });
  const selection = inferRecommendationTopic(progressModel, options.topic || null);
  const timeline = buildSubmissionTimeline(caches);
  const anchorBand = selectAnchorRatingBand(progressModel.currentRating, trainingConfig.guide?.anchor || DEFAULT_GUIDE.anchor);
  const reviewItems = [];

  for (const entry of timeline) {
    if (!isFiniteNumber(entry.rating)) {
      continue;
    }

    if (!normalizeTags(entry.tags).includes(selection.topic)) {
      continue;
    }

    if (entry.rating < anchorBand.min) {
      continue;
    }

    const usedKeys = new Set([entry.key]);
    const prerequisites = [];

    for (const offset of trainingConfig.guide.prerequisites.ratingOffsets) {
      const targetRating = entry.rating + offset;
      const candidates = timeline.filter((candidate) => (
        candidate.acceptedAt > entry.acceptedAt
        && !usedKeys.has(candidate.key)
        && normalizeTags(candidate.tags).includes(selection.topic)
      ));
      const selected = selectProblemForTarget(candidates, {
        topic: selection.topic,
        referenceTags: entry.tags,
        targetRating,
        preferredMin: targetRating - 50,
        preferredMax: targetRating + 50,
        usedKeys,
      });

      if (!selected) {
        prerequisites.length = 0;
        break;
      }

      usedKeys.add(selected.key);
      prerequisites.push({
        ...selected,
        offset,
      });
    }

    if (prerequisites.length !== trainingConfig.guide.prerequisites.ratingOffsets.length) {
      continue;
    }

    const latestPrerequisiteTime = Math.max(...prerequisites.map((problem) => problem.acceptedAt || 0));

    if (entry.lastSubmissionAt <= latestPrerequisiteTime) {
      reviewItems.push({
        anchor: entry,
        prerequisites,
      });
    }
  }

  return {
    handle: getCacheHandle(caches, options.handle || null),
    currentRating: getCurrentRating(caches.user, caches.rating?.items || []),
    selection,
    reviewItems,
  };
}

function buildNextReport(caches = {}, trainingConfig = {}, options = {}) {
  if (!hasAnyCache(caches)) {
    throw new Error('缺少本地缓存，请先运行 fetch');
  }

  const requestedHandle = options.handle || null;
  const cacheHandle = getCacheHandle(caches, requestedHandle);

  if (requestedHandle && cacheHandle && requestedHandle !== cacheHandle) {
    throw new Error(`本地缓存 handle 为 ${cacheHandle}，请先运行 fetch --handle ${requestedHandle}`);
  }

  const progressModel = buildProgressModel(caches, trainingConfig, {
    topicOverrides: options.topicOverrides || {},
  });
  const selection = inferRecommendationTopic(progressModel, options.topic || null);
  const anchorBand = selectAnchorRatingBand(progressModel.currentRating, trainingConfig.guide?.anchor || DEFAULT_GUIDE.anchor);
  const solvedKeys = getAcceptedProblemKeySet(caches);
  const candidates = buildProblemCatalog(caches, selection.topic)
    .filter((problem) => !(trainingConfig.guide?.prerequisites?.excludeSolvedProblems && solvedKeys.has(problem.key)));

  if (candidates.length === 0) {
    throw new Error(`当前 topic ${selection.topic} 没有可推荐的未解决题目`);
  }

  const anchor = selectAnchorProblem(candidates, {
    topic: selection.topic,
    referenceTags: selection.stage.tags,
    anchorBand,
    usedKeys: new Set(),
  });

  if (!anchor) {
    throw new Error(`当前 topic ${selection.topic} 没有可用锚点题目`);
  }

  const prerequisites = selectPrerequisiteProblems(candidates, anchor, trainingConfig.guide || DEFAULT_GUIDE, {
    topic: selection.topic,
    usedKeys: new Set([anchor.key]),
  });

  return {
    handle: cacheHandle,
    currentRating: progressModel.currentRating,
    selection,
    anchorBand,
    anchor,
    prerequisites,
  };
}

function formatNextReport(report) {
  const lines = [
    `下一题推荐：${report.handle || 'unknown'}`,
    `当前 rating：${formatRating(report.currentRating)}`,
    `当前阶段：第 ${report.selection.stage.id} 阶段 ${report.selection.stage.name}`,
    `当前主题：${report.selection.topic}（${report.selection.source === 'manual' ? '手动指定' : '自动推断'}，已完成 ${report.selection.topicProgress.solvedCount}/${report.selection.topicProgress.targetCount}）`,
    `锚点难度：${report.anchorBand.min}-${report.anchorBand.max}`,
    '',
    'Anchor：',
    `  - ${formatProblem(report.anchor)}`,
    '',
    'Prerequisites：',
  ];

  if (report.prerequisites.length === 0) {
    lines.push('  暂无可用前置题目');
  } else {
    report.prerequisites.forEach((problem, index) => {
      const fallbackText = problem.fallbackUsed ? '，回退到最近 rating' : '';
      lines.push(`  ${index + 1}. ${formatProblem(problem)} | target ${problem.targetRating}${fallbackText}`);
    });
  }

  return lines.join('\n');
}

function formatReviewReport(report) {
  const lines = [
    `复习锚点：${report.handle || 'unknown'}`,
    `当前 rating：${formatRating(report.currentRating)}`,
    `当前阶段：第 ${report.selection.stage.id} 阶段 ${report.selection.stage.name}`,
    `当前主题：${report.selection.topic}`,
    '',
    '待回打锚点：',
  ];

  if (report.reviewItems.length === 0) {
    lines.push('  暂无需要回打的锚点');
    return lines.join('\n');
  }

  report.reviewItems.forEach((item, index) => {
    lines.push(`  ${index + 1}. ${formatProblem(item.anchor)}`);
    const prerequisiteSummary = item.prerequisites.map((problem) => `${problem.key}(${problem.rating})`).join(', ');
    lines.push(`     前置已完成：${prerequisiteSummary}`);
  });

  return lines.join('\n');
}

module.exports = {
  buildNextReport,
  buildReviewRecommendations,
  formatNextReport,
  formatReviewReport,
  inferRecommendationTopic,
  parseNextCommandArgs,
  scoreTagCombinationSimilarity,
  selectAnchorRatingBand,
  selectPrerequisiteProblems,
  selectProblemForTarget,
};
