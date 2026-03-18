const fs = require('fs');
const path = require('path');
const {
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

const DEFAULT_COMPLETION_RULES = {
  targetAcMin: 8,
  targetAcMax: 10,
  targetSoloAc: 6,
};

const DEFAULT_GUIDE = {
  completion: { ...DEFAULT_COMPLETION_RULES },
  anchor: {
    absoluteMinRating: 1500,
    absoluteMaxRating: 1600,
    userOffsetMin: 400,
    userOffsetMax: 500,
  },
  prerequisites: {
    count: 3,
    ratingOffsets: [-300, -200, -100],
    preferSimilarStructure: true,
    similarityBasis: 'tag-combination',
    excludeSolvedProblems: true,
  },
  review: {
    enabled: true,
    revisitAnchorAfterPrerequisites: true,
    trigger: 'solved-prerequisites-without-anchor-revisit',
  },
};

function normalizeProblemKey(value) {
  const text = normalizeString(value).toUpperCase();

  if (!text) {
    return '';
  }

  return text.startsWith('CF-') ? text.slice(3) : text;
}

function splitList(value) {
  return normalizeString(value)
    .split(/[，,、;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  const text = normalizeString(value).toLowerCase();

  if (['true', 'yes', 'y', '1', 'on', '是'].includes(text)) {
    return true;
  }

  if (['false', 'no', 'n', '0', 'off', '否'].includes(text)) {
    return false;
  }

  return null;
}

function parseInteger(value) {
  const match = normalizeString(value).match(/[-+]?\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function parseSignedIntegerList(value) {
  return normalizeString(value)
    .split(/[，,、;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item));
}

function parseRange(value) {
  const text = normalizeString(value).replace(/~/g, '-');
  const plusMatch = text.match(/([+-]?\d+)\s*\+$/);

  if (plusMatch) {
    return {
      min: Number.parseInt(plusMatch[1], 10),
      max: null,
    };
  }

  const pairMatch = text.match(/([+-]?\d+)\s*-\s*([+-]?\d+)/);

  if (!pairMatch) {
    return null;
  }

  const min = Number.parseInt(pairMatch[1], 10);
  const max = Number.parseInt(pairMatch[2], 10);

  if (min > max) {
    return null;
  }

  return { min, max };
}

function findStageHeading(line) {
  const text = normalizeString(line);
  const patterns = [
    /^##+\s*Stage\s*(\d+)\s*[-:：.]\s*(.+)$/i,
    /^##+\s*(\d+)\s*[-:：.]\s*(.+)$/,
    /^##+\s*第\s*(\d+)\s*阶段\s*[-:：.]\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return {
        id: Number.parseInt(match[1], 10),
        name: normalizeString(match[2]),
      };
    }
  }

  return null;
}

function finalizeStage(stage, defaultCompletion = DEFAULT_COMPLETION_RULES) {
  if (!stage) {
    return null;
  }

  if (!Number.isInteger(stage.id) || stage.id <= 0) {
    throw new Error('map.md 存在无效阶段编号');
  }

  if (!stage.name) {
    throw new Error(`map.md 第 ${stage.id} 阶段缺少名称`);
  }

  if (!Array.isArray(stage.tags) || stage.tags.length === 0) {
    throw new Error(`map.md 第 ${stage.id} 阶段缺少 tags`);
  }

  return {
    id: stage.id,
    order: stage.order,
    name: stage.name,
    phase: stage.phase || null,
    tags: normalizeTags(stage.tags),
    ratingMin: stage.ratingMin ?? null,
    ratingMax: stage.ratingMax ?? null,
    targetAcMin: stage.targetAcMin ?? defaultCompletion.targetAcMin,
    targetAcMax: stage.targetAcMax ?? defaultCompletion.targetAcMax,
    targetSoloAc: stage.targetSoloAc ?? defaultCompletion.targetSoloAc,
  };
}

function parseMapMarkdown(markdown, options = {}) {
  const lines = normalizeString(markdown).split(/\r?\n/);
  const stages = [];
  const defaultCompletion = {
    ...DEFAULT_COMPLETION_RULES,
    ...(options.defaultCompletion || {}),
  };
  let currentStage = null;
  let order = 0;

  for (const line of lines) {
    const heading = findStageHeading(line);

    if (heading) {
      if (currentStage) {
        stages.push(finalizeStage(currentStage, defaultCompletion));
      }

      order += 1;
      currentStage = {
        id: heading.id,
        order,
        name: heading.name,
        tags: [],
      };
      continue;
    }

    if (!currentStage) {
      continue;
    }

    const bulletMatch = normalizeString(line).match(/^[-*]\s*([^:：]+)\s*[:：]\s*(.+)$/);

    if (!bulletMatch) {
      continue;
    }

    const key = bulletMatch[1].trim().toLowerCase();
    const value = bulletMatch[2].trim();

    if (['phase', '阶段'].includes(key)) {
      currentStage.phase = value;
      continue;
    }

    if (['rating', 'rating range', '难度', '分数'].includes(key)) {
      const range = parseRange(value);

      if (!range) {
        throw new Error(`map.md 第 ${currentStage.id} 阶段 rating 无法解析`);
      }

      currentStage.ratingMin = range.min;
      currentStage.ratingMax = range.max;
      continue;
    }

    if (['tags', 'tag', '标签'].includes(key)) {
      currentStage.tags = splitList(value);
      continue;
    }

    if (['target ac', '目标 ac'].includes(key)) {
      const range = parseRange(value);

      if (!range) {
        throw new Error(`map.md 第 ${currentStage.id} 阶段 Target AC 无法解析`);
      }

      currentStage.targetAcMin = range.min;
      currentStage.targetAcMax = range.max ?? range.min;
      continue;
    }

    if (['independent ac', 'solo ac', '独立 ac'].includes(key)) {
      const targetSoloAc = parseInteger(value);

      if (!Number.isInteger(targetSoloAc)) {
        throw new Error(`map.md 第 ${currentStage.id} 阶段 Independent AC 无法解析`);
      }

      currentStage.targetSoloAc = targetSoloAc;
    }
  }

  if (currentStage) {
    stages.push(finalizeStage(currentStage, defaultCompletion));
  }

  if (stages.length === 0) {
    throw new Error('map.md 未解析到任何阶段');
  }

  const sortedIds = new Set();

  for (const stage of stages) {
    if (sortedIds.has(stage.id)) {
      throw new Error(`map.md 存在重复阶段编号：${stage.id}`);
    }

    sortedIds.add(stage.id);
  }

  return {
    stageCount: stages.length,
    stages: stages.sort((left, right) => left.id - right.id).map((stage, index) => ({
      ...stage,
      order: index + 1,
    })),
  };
}

function parseGuideMarkdown(markdown) {
  const guide = JSON.parse(JSON.stringify(DEFAULT_GUIDE));
  const lines = normalizeString(markdown).split(/\r?\n/);

  for (const line of lines) {
    const bulletMatch = normalizeString(line).match(/^[-*]\s*([^:：]+)\s*[:：]\s*(.+)$/);

    if (!bulletMatch) {
      continue;
    }

    const key = bulletMatch[1].trim().toLowerCase();
    const value = bulletMatch[2].trim();

    if (['target ac', '目标 ac'].includes(key)) {
      const range = parseRange(value);

      if (!range) {
        throw new Error('guide.md Target AC 无法解析');
      }

      guide.completion.targetAcMin = range.min;
      guide.completion.targetAcMax = range.max ?? range.min;
      continue;
    }

    if (['independent ac', 'solo ac', '独立 ac'].includes(key)) {
      const targetSoloAc = parseInteger(value);

      if (!Number.isInteger(targetSoloAc)) {
        throw new Error('guide.md Independent AC 无法解析');
      }

      guide.completion.targetSoloAc = targetSoloAc;
      continue;
    }

    if (['anchor rating', '锚点 rating'].includes(key)) {
      const range = parseRange(value);

      if (!range) {
        throw new Error('guide.md Anchor rating 无法解析');
      }

      guide.anchor.absoluteMinRating = range.min;
      guide.anchor.absoluteMaxRating = range.max;
      continue;
    }

    if (['low-level offset', 'offset', '低水平偏移'].includes(key)) {
      const range = parseRange(value.replace(/^\+/, ''));

      if (!range) {
        throw new Error('guide.md Low-level offset 无法解析');
      }

      guide.anchor.userOffsetMin = range.min;
      guide.anchor.userOffsetMax = range.max;
      continue;
    }

    if (['count', '数量'].includes(key)) {
      const count = parseInteger(value);

      if (!Number.isInteger(count)) {
        throw new Error('guide.md prerequisite count 无法解析');
      }

      guide.prerequisites.count = count;
      continue;
    }

    if (['rating offsets', '前置偏移'].includes(key)) {
      const offsets = parseSignedIntegerList(value);

      if (offsets.length === 0) {
        throw new Error('guide.md prerequisite offsets 无法解析');
      }

      guide.prerequisites.ratingOffsets = offsets;
      continue;
    }

    if (['prefer similar structure', 'prefer structural similarity', '优先相似结构'].includes(key)) {
      const parsed = parseBoolean(value);

      if (parsed === null) {
        throw new Error('guide.md Prefer similar structure 无法解析');
      }

      guide.prerequisites.preferSimilarStructure = parsed;
      continue;
    }

    if (['similarity basis', '相似性依据'].includes(key)) {
      guide.prerequisites.similarityBasis = value;
      continue;
    }

    if (['exclude solved problems', 'exclude solved', '过滤已 ac', '过滤已解决'].includes(key)) {
      const parsed = parseBoolean(value);

      if (parsed === null) {
        throw new Error('guide.md Exclude solved problems 无法解析');
      }

      guide.prerequisites.excludeSolvedProblems = parsed;
      continue;
    }

    if (['enabled', '启用'].includes(key)) {
      const parsed = parseBoolean(value);

      if (parsed === null) {
        throw new Error('guide.md Review enabled 无法解析');
      }

      guide.review.enabled = parsed;
      continue;
    }

    if (['review anchor after prerequisites', '回打锚点', '完成前置后回打'].includes(key)) {
      const parsed = parseBoolean(value);

      if (parsed === null) {
        throw new Error('guide.md Review anchor rule 无法解析');
      }

      guide.review.revisitAnchorAfterPrerequisites = parsed;
      continue;
    }

    if (['trigger', '触发条件'].includes(key)) {
      guide.review.trigger = value;
    }
  }

  return guide;
}

function getDefaultTrainingPaths(baseDir = path.resolve(__dirname, '..')) {
  return {
    mapPath: path.join(baseDir, 'map.md'),
    guidePath: path.join(baseDir, 'guide.md'),
  };
}

function readTrainingMarkdown(filePath, label) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`读取 ${label} 失败：${filePath}，${error.message}`);
  }
}

function loadTrainingResources(options = {}) {
  const env = options.env || process.env;
  const defaultPaths = getDefaultTrainingPaths(options.baseDir);
  const paths = {
    ...defaultPaths,
    mapPath: env.CF_COACH_MAP_PATH || defaultPaths.mapPath,
    guidePath: env.CF_COACH_GUIDE_PATH || defaultPaths.guidePath,
    ...(options.paths || {}),
  };
  const roadmapMarkdown = readTrainingMarkdown(paths.mapPath, 'roadmap');
  const guideMarkdown = readTrainingMarkdown(paths.guidePath, 'guide');
  let guide;
  let roadmap;

  try {
    guide = parseGuideMarkdown(guideMarkdown);
  } catch (error) {
    throw new Error(`解析训练指南失败：${paths.guidePath}，${error.message}`);
  }

  try {
    roadmap = parseMapMarkdown(roadmapMarkdown, {
      defaultCompletion: guide.completion,
    });
  } catch (error) {
    throw new Error(`解析训练路线失败：${paths.mapPath}，${error.message}`);
  }

  return {
    paths,
    roadmap,
    guide,
  };
}

function getLatestLogEntryMap(logEntries = []) {
  const latestByKey = new Map();

  for (let index = 0; index < (Array.isArray(logEntries) ? logEntries.length : 0); index += 1) {
    const entry = logEntries[index];
    const problemKey = normalizeProblemKey(entry?.id || entry?.problemKey);

    if (!problemKey) {
      continue;
    }

    const previous = latestByKey.get(problemKey);
    const previousTime = previous ? Date.parse(previous.timestamp || '') || 0 : 0;
    const currentTime = Date.parse(entry.timestamp || '') || 0;

    if (!previous || currentTime >= previousTime) {
      latestByKey.set(problemKey, {
        ...entry,
        _index: index,
      });
    }
  }

  return latestByKey;
}

function isAcceptedLogEntry(logEntry) {
  if (!logEntry) {
    return false;
  }

  if (!logEntry.verdict) {
    return true;
  }

  return String(logEntry.verdict).toLowerCase() === 'ac';
}

function determineIndependentAc(problemAttempt, logEntry = null) {
  if (!problemAttempt || !problemAttempt.accepted) {
    return false;
  }

  if (logEntry && typeof logEntry.solo === 'boolean' && isAcceptedLogEntry(logEntry)) {
    return logEntry.solo;
  }

  return (problemAttempt.attemptCount || 0) <= 1;
}

function findStageByName(stages, topicName) {
  const normalized = normalizeString(topicName).toLowerCase();

  if (!normalized) {
    return null;
  }

  return stages.find((stage) => stage.name.toLowerCase() === normalized) || null;
}

function scoreStageMatch(problem, stage) {
  const problemTags = normalizeTags(problem.tags);
  const stageTags = normalizeTags(stage.tags);
  const overlap = problemTags.filter((tag) => stageTags.includes(tag)).length;

  if (overlap === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = overlap * 100;

  if (isFiniteNumber(problem.rating) && isFiniteNumber(stage.ratingMin)) {
    if (stage.ratingMax === null) {
      score += problem.rating >= stage.ratingMin ? 20 : -Math.abs(problem.rating - stage.ratingMin) / 10;
    } else if (problem.rating >= stage.ratingMin && problem.rating <= stage.ratingMax) {
      score += 20;
    } else {
      const distance = problem.rating < stage.ratingMin
        ? stage.ratingMin - problem.rating
        : problem.rating - stage.ratingMax;
      score -= distance / 10;
    }
  }

  score -= stage.order / 100;

  return score;
}

function assignProblemToStage(problem, roadmap, options = {}) {
  if (!problem || !roadmap || !Array.isArray(roadmap.stages)) {
    return null;
  }

  const overrideStage = findStageByName(roadmap.stages, options.topicOverride || options.topic);

  if (overrideStage) {
    return overrideStage;
  }

  let bestStage = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const stage of roadmap.stages) {
    const score = scoreStageMatch(problem, stage);

    if (score > bestScore) {
      bestScore = score;
      bestStage = stage;
    }
  }

  return bestScore === Number.NEGATIVE_INFINITY ? null : bestStage;
}

function buildPracticeRecords(caches = {}, options = {}) {
  const roadmap = options.roadmap || null;
  const dedupedSubmissions = dedupeSubmissions(caches.submissions?.items || []);
  const problemLookup = createProblemLookup(caches.problems?.items || [], dedupedSubmissions);
  const problemAttempts = deriveProblemAttempts(dedupedSubmissions, problemLookup);
  const latestLogEntries = getLatestLogEntryMap(options.logEntries || []);
  const topicOverrides = options.topicOverrides || {};
  const acceptedRecords = [];

  for (const attempt of problemAttempts) {
    if (!attempt.accepted) {
      continue;
    }

    const problemKey = normalizeProblemKey(attempt.problemKey);
    const logEntry = latestLogEntries.get(problemKey) || null;
    const topicOverride = topicOverrides[attempt.problemKey] || topicOverrides[problemKey] || logEntry?.topic || null;
    const stage = roadmap ? assignProblemToStage(attempt, roadmap, { topicOverride }) : null;

    acceptedRecords.push({
      problemKey,
      name: attempt.name || logEntry?.name || null,
      rating: isFiniteNumber(attempt.rating) ? attempt.rating : null,
      tags: normalizeTags(attempt.tags),
      attemptCount: attempt.attemptCount || 0,
      accepted: true,
      independentAc: determineIndependentAc(attempt, logEntry),
      independentSource: logEntry && typeof logEntry.solo === 'boolean' ? 'log' : 'attempts',
      topicOverride,
      stageId: stage?.id || null,
      stageName: stage?.name || null,
    });
  }

  return acceptedRecords.sort((left, right) => left.problemKey.localeCompare(right.problemKey));
}

function evaluateStageCompletion(stageSummary) {
  const targetAcMin = stageSummary.targetAcMin ?? DEFAULT_COMPLETION_RULES.targetAcMin;
  const targetAcMax = stageSummary.targetAcMax ?? DEFAULT_COMPLETION_RULES.targetAcMax;
  const targetSoloAc = stageSummary.targetSoloAc ?? DEFAULT_COMPLETION_RULES.targetSoloAc;
  const acCount = stageSummary.acCount ?? 0;
  const independentAcCount = stageSummary.independentAcCount ?? 0;

  return {
    targetAcMin,
    targetAcMax,
    targetSoloAc,
    acCount,
    independentAcCount,
    complete: acCount >= targetAcMin && independentAcCount >= targetSoloAc,
    withinRecommendedAcRange: acCount >= targetAcMin && acCount <= targetAcMax,
    remainingAcCount: Math.max(targetAcMin - acCount, 0),
    remainingIndependentAcCount: Math.max(targetSoloAc - independentAcCount, 0),
  };
}

function buildStageProgress(roadmap, acceptedRecords = [], guide = DEFAULT_GUIDE) {
  if (!roadmap || !Array.isArray(roadmap.stages)) {
    throw new Error('缺少 roadmap stages');
  }

  return roadmap.stages.map((stage) => {
    const records = acceptedRecords.filter((record) => record.stageId === stage.id);
    const acCount = records.length;
    const independentAcCount = records.filter((record) => record.independentAc).length;
    const completion = evaluateStageCompletion({
      targetAcMin: stage.targetAcMin ?? guide.completion.targetAcMin,
      targetAcMax: stage.targetAcMax ?? guide.completion.targetAcMax,
      targetSoloAc: stage.targetSoloAc ?? guide.completion.targetSoloAc,
      acCount,
      independentAcCount,
    });

    return {
      ...stage,
      ...completion,
      problemKeys: records.map((record) => record.problemKey),
      ratings: records.map((record) => record.rating).filter(isFiniteNumber),
    };
  });
}

function percentile(values, ratio) {
  const numericValues = (Array.isArray(values) ? values : []).filter(isFiniteNumber).slice().sort((left, right) => left - right);

  if (numericValues.length === 0) {
    return null;
  }

  const index = Math.max(0, Math.min(numericValues.length - 1, Math.ceil(numericValues.length * ratio) - 1));
  return numericValues[index];
}

function stageHasRatingSupport(stage, ratingReference) {
  if (!isFiniteNumber(ratingReference) || !isFiniteNumber(stage.ratingMin)) {
    return true;
  }

  return ratingReference >= stage.ratingMin - 100;
}

function inferCurrentStage(roadmap, stageProgress, options = {}) {
  if (!roadmap || !Array.isArray(roadmap.stages) || roadmap.stages.length === 0) {
    throw new Error('缺少 roadmap stages');
  }

  const currentRating = isFiniteNumber(options.currentRating) ? options.currentRating : null;
  const acceptedRatings = stageProgress.flatMap((stage) => stage.ratings || []);
  const solvedRatingP70 = percentile(acceptedRatings, 0.7);
  const ratingReference = Math.max(solvedRatingP70 ?? 0, currentRating ?? 0) || null;
  const completionFrontierIndex = stageProgress.findIndex((stage) => !stage.complete);
  const frontierIndex = completionFrontierIndex === -1 ? stageProgress.length - 1 : completionFrontierIndex;
  const foundationIndex = completionFrontierIndex === -1 ? stageProgress.length - 1 : completionFrontierIndex - 1;
  let abilityIndex = foundationIndex;

  for (let index = 0; index < stageProgress.length; index += 1) {
    const stage = stageProgress[index];
    const enoughAc = stage.acCount >= Math.max(4, Math.ceil(stage.targetAcMin / 2));
    const enoughIndependent = stage.independentAcCount >= Math.max(3, Math.ceil(stage.targetSoloAc / 2));

    if (enoughAc && enoughIndependent && stageHasRatingSupport(stage, ratingReference)) {
      abilityIndex = index;
    }
  }

  const maxAllowedIndex = Math.min(stageProgress.length - 1, foundationIndex + 1);
  const currentStageIndex = completionFrontierIndex === -1
    ? stageProgress.length - 1
    : Math.max(frontierIndex, Math.min(abilityIndex, maxAllowedIndex));

  return {
    currentStageIndex,
    currentStage: stageProgress[currentStageIndex],
    completionFrontierIndex: frontierIndex,
    abilityIndex,
    ratingReference,
    solvedRatingP70,
    currentRating,
  };
}

function buildProgressModel(caches = {}, trainingConfig = {}, options = {}) {
  const roadmap = trainingConfig.roadmap;
  const guide = trainingConfig.guide || DEFAULT_GUIDE;

  if (!roadmap) {
    throw new Error('缺少 roadmap 配置');
  }

  const acceptedRecords = buildPracticeRecords(caches, {
    roadmap,
    logEntries: options.logEntries || [],
    topicOverrides: options.topicOverrides || {},
  });
  const stageProgress = buildStageProgress(roadmap, acceptedRecords, guide);
  const currentRating = getCurrentRating(caches.user, caches.rating?.items || []);
  const inference = inferCurrentStage(roadmap, stageProgress, { currentRating });

  return {
    roadmap,
    guide,
    acceptedRecords,
    stages: stageProgress,
    currentStageIndex: inference.currentStageIndex,
    currentStage: inference.currentStage,
    completionFrontierIndex: inference.completionFrontierIndex,
    abilityIndex: inference.abilityIndex,
    currentRating: inference.currentRating,
    ratingReference: inference.ratingReference,
    solvedRatingP70: inference.solvedRatingP70,
  };
}

module.exports = {
  DEFAULT_COMPLETION_RULES,
  DEFAULT_GUIDE,
  assignProblemToStage,
  buildPracticeRecords,
  buildProgressModel,
  buildStageProgress,
  determineIndependentAc,
  evaluateStageCompletion,
  getDefaultTrainingPaths,
  inferCurrentStage,
  loadTrainingResources,
  parseGuideMarkdown,
  parseMapMarkdown,
};
