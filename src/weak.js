const fs = require('fs');
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
  formatPercent,
  getCurrentRating,
} = require('./stats');
const { buildProgressModel } = require('./training');

const DEFAULT_WEAK_RULES = {
  tagMinAttempts: 3,
  tagMaxPassRate: 0.5,
  ratingMinSubmissions: 4,
  ratingMinFailedSubmissions: 3,
  ratingMaxPassRate: 0.5,
};

function loadOptionalJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      return null;
    }

    throw new Error(`读取 JSON 文件失败：${filePath}，${error.message}`);
  }
}

function extractLogEntries(rawLog) {
  if (Array.isArray(rawLog)) {
    return rawLog;
  }

  if (Array.isArray(rawLog?.items)) {
    return rawLog.items;
  }

  return [];
}

function getWeakRules(options = {}) {
  return {
    ...DEFAULT_WEAK_RULES,
    ...(options.rules || {}),
  };
}

function getTagPriority(entry) {
  return Math.round((1 - entry.passRate) * 100)
    + (entry.failedCount * 20)
    + (entry.attemptedCount * 5)
    + entry.submissionCount;
}

function detectWeakTags(problemAttempts = [], options = {}) {
  const rules = getWeakRules(options);
  const tagStats = new Map();

  for (const problem of Array.isArray(problemAttempts) ? problemAttempts : []) {
    const tags = normalizeTags(problem.tags);

    for (const tag of tags) {
      if (!tagStats.has(tag)) {
        tagStats.set(tag, {
          tag,
          attemptedCount: 0,
          acCount: 0,
          submissionCount: 0,
        });
      }

      const entry = tagStats.get(tag);
      entry.attemptedCount += 1;
      entry.submissionCount += problem.attemptCount || 0;

      if (problem.accepted) {
        entry.acCount += 1;
      }
    }
  }

  return Array.from(tagStats.values())
    .map((entry) => {
      const failedCount = entry.attemptedCount - entry.acCount;
      const passRate = entry.attemptedCount === 0 ? 0 : entry.acCount / entry.attemptedCount;

      return {
        ...entry,
        failedCount,
        passRate,
        priority: getTagPriority({ ...entry, failedCount, passRate }),
      };
    })
    .filter((entry) => entry.attemptedCount >= rules.tagMinAttempts && entry.passRate < rules.tagMaxPassRate)
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      if (right.attemptedCount !== left.attemptedCount) {
        return right.attemptedCount - left.attemptedCount;
      }

      if (right.failedCount !== left.failedCount) {
        return right.failedCount - left.failedCount;
      }

      return left.tag.localeCompare(right.tag);
    });
}

function classifyWeakRatingBucket(rating) {
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

function formatRatingBucket(bucket) {
  if (!bucket) {
    return '未知分档';
  }

  if (bucket === '1600+') {
    return '1600+';
  }

  const start = Number.parseInt(bucket, 10);

  if (!Number.isInteger(start)) {
    return bucket;
  }

  return `${start}-${start + 99}`;
}

function getRatingPriority(entry) {
  return Math.round((1 - entry.passRate) * 100)
    + (entry.failedSubmissionCount * 15)
    + (entry.failedProblemCount * 10)
    + entry.submissionCount;
}

function detectWeakRatingRanges(problemAttempts = [], options = {}) {
  const rules = getWeakRules(options);
  const bucketStats = new Map();

  for (const problem of Array.isArray(problemAttempts) ? problemAttempts : []) {
    const bucket = classifyWeakRatingBucket(problem.rating);

    if (!bucket) {
      continue;
    }

    if (!bucketStats.has(bucket)) {
      bucketStats.set(bucket, {
        bucket,
        label: formatRatingBucket(bucket),
        problemCount: 0,
        acCount: 0,
        submissionCount: 0,
        failedSubmissionCount: 0,
      });
    }

    const entry = bucketStats.get(bucket);
    const attemptCount = problem.attemptCount || 0;

    entry.problemCount += 1;
    entry.submissionCount += attemptCount;
    entry.failedSubmissionCount += Math.max(attemptCount - (problem.accepted ? 1 : 0), 0);

    if (problem.accepted) {
      entry.acCount += 1;
    }
  }

  return Array.from(bucketStats.values())
    .map((entry) => {
      const failedProblemCount = entry.problemCount - entry.acCount;
      const passRate = entry.problemCount === 0 ? 0 : entry.acCount / entry.problemCount;

      return {
        ...entry,
        failedProblemCount,
        passRate,
        priority: getRatingPriority({ ...entry, failedProblemCount, passRate }),
      };
    })
    .filter((entry) => (
      entry.submissionCount >= rules.ratingMinSubmissions
      && entry.failedSubmissionCount >= rules.ratingMinFailedSubmissions
      && entry.passRate < rules.ratingMaxPassRate
    ))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      if (right.failedSubmissionCount !== left.failedSubmissionCount) {
        return right.failedSubmissionCount - left.failedSubmissionCount;
      }

      return left.label.localeCompare(right.label);
    });
}

function getStageTagTarget(stage) {
  const tags = normalizeTags(stage?.tags);

  if (tags.length === 0) {
    return 0;
  }

  const targetAcMin = stage?.targetAcMin ?? 0;
  return Math.max(1, Math.ceil(targetAcMin / tags.length));
}

function getRoadmapGapPriority(entry) {
  return (entry.missingCount * 40) + (entry.targetCount * 10) - entry.solvedCount;
}

function detectRoadmapGaps(progressModel = null) {
  const currentStage = progressModel?.currentStage;
  const acceptedRecords = Array.isArray(progressModel?.acceptedRecords) ? progressModel.acceptedRecords : [];
  const stageTags = normalizeTags(currentStage?.tags);

  if (!currentStage || stageTags.length === 0) {
    return [];
  }

  const stageTagTarget = getStageTagTarget(currentStage);

  if (stageTagTarget <= 0) {
    return [];
  }

  return stageTags
    .map((tag) => {
      const solvedCount = acceptedRecords.filter((record) => (
        record.stageId === currentStage.id && normalizeTags(record.tags).includes(tag)
      )).length;

      return {
        tag,
        stageId: currentStage.id,
        stageName: currentStage.name,
        targetCount: stageTagTarget,
        solvedCount,
        missingCount: Math.max(stageTagTarget - solvedCount, 0),
      };
    })
    .filter((entry) => entry.missingCount > 0)
    .map((entry) => ({
      ...entry,
      priority: getRoadmapGapPriority(entry),
    }))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      if (right.missingCount !== left.missingCount) {
        return right.missingCount - left.missingCount;
      }

      return left.tag.localeCompare(right.tag);
    });
}

function createRoadmapRecommendation(entry) {
  return {
    type: 'roadmap',
    priority: 300 + entry.priority,
    text: `补当前阶段主题 ${entry.tag}：第 ${entry.stageId} 阶段目标 ${entry.targetCount} 题，当前仅 ${entry.solvedCount} 题。`,
  };
}

function createTagRecommendation(entry) {
  return {
    type: 'tag',
    priority: 200 + entry.priority,
    text: `强化 tag ${entry.tag}：尝试 ${entry.attemptedCount} 题，仅 AC ${entry.acCount} 题，通过率 ${formatPercent(entry.passRate)}。`,
  };
}

function createRatingRecommendation(entry) {
  return {
    type: 'rating',
    priority: 100 + entry.priority,
    text: `回补 ${entry.label} 分档：累计提交 ${entry.submissionCount} 次，完成 ${entry.acCount}/${entry.problemCount} 题，转换率 ${formatPercent(entry.passRate)}。`,
  };
}

function prioritizeWeaknesses(report) {
  return [
    ...report.roadmapGaps.map(createRoadmapRecommendation),
    ...report.weakTags.map(createTagRecommendation),
    ...report.weakRatingRanges.map(createRatingRecommendation),
  ].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return left.text.localeCompare(right.text);
  });
}

function buildWeakReport(caches = {}, trainingConfig = {}, options = {}) {
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
  const rawLog = options.logPath ? loadOptionalJson(options.logPath) : null;
  const logEntries = extractLogEntries(rawLog);
  const progressModel = buildProgressModel(caches, trainingConfig, {
    logEntries,
    topicOverrides: options.topicOverrides || {},
  });
  const weakTags = detectWeakTags(problemAttempts, options);
  const weakRatingRanges = detectWeakRatingRanges(problemAttempts, options);
  const roadmapGaps = detectRoadmapGaps(progressModel, options);

  const report = {
    handle: cacheHandle,
    currentRating: getCurrentRating(caches.user, caches.rating?.items || []),
    currentStage: progressModel.currentStage || null,
    weakTags,
    weakRatingRanges,
    roadmapGaps,
    totals: {
      submissionCount: dedupedSubmissions.length,
      attemptedProblemCount: problemAttempts.length,
    },
  };

  return {
    ...report,
    recommendations: prioritizeWeaknesses(report),
  };
}

function formatWeakEntries(entries, render) {
  if (entries.length === 0) {
    return ['  暂无明显薄弱项'];
  }

  return entries.map((entry) => `  - ${render(entry)}`);
}

function formatWeakReport(report) {
  const currentStageLabel = report.currentStage
    ? `第 ${report.currentStage.id} 阶段 ${report.currentStage.name}`
    : '未知';
  const lines = [
    `薄弱点分析：${report.handle || 'unknown'}`,
    `当前 rating：${formatRating(report.currentRating)}`,
    `当前阶段：${currentStageLabel}`,
    '',
    '优先训练建议：',
  ];

  if (report.recommendations.length === 0) {
    lines.push('  暂无足够数据判断薄弱项，继续积累提交记录后再分析。');
  } else {
    report.recommendations.slice(0, 6).forEach((entry, index) => {
      lines.push(`  ${index + 1}. ${entry.text}`);
    });
  }

  lines.push('');
  lines.push('Tag 薄弱项：');
  lines.push(...formatWeakEntries(report.weakTags, (entry) => (
    `${entry.tag}：尝试 ${entry.attemptedCount} 题，AC ${entry.acCount} 题，通过率 ${formatPercent(entry.passRate)}`
  )));
  lines.push('');
  lines.push('Rating 薄弱分档：');
  lines.push(...formatWeakEntries(report.weakRatingRanges, (entry) => (
    `${entry.label}：提交 ${entry.submissionCount} 次，完成 ${entry.acCount}/${entry.problemCount} 题，转换率 ${formatPercent(entry.passRate)}`
  )));
  lines.push('');
  lines.push('当前阶段缺口：');

  if (report.roadmapGaps.length === 0) {
    lines.push('  当前阶段主题已达到建议掌握度');
  } else {
    lines.push(...report.roadmapGaps.map((entry) => (
      `  - ${entry.tag}：建议 ${entry.targetCount} 题，当前 ${entry.solvedCount} 题，还差 ${entry.missingCount} 题`
    )));
  }

  return lines.join('\n');
}

module.exports = {
  DEFAULT_WEAK_RULES,
  buildWeakReport,
  detectRoadmapGaps,
  detectWeakRatingRanges,
  detectWeakTags,
  formatRatingBucket,
  formatWeakReport,
};
