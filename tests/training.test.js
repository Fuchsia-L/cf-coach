const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPracticeRecords,
  buildProgressModel,
  buildStageProgress,
  determineIndependentAc,
  evaluateStageCompletion,
  loadTrainingResources,
  parseGuideMarkdown,
  parseMapMarkdown,
} = require('../src/training');

const VALID_MAP = `
# Demo Map

## Stage 1 - 排序 + 贪心
- Phase: 入门
- Rating: 800-1000
- Tags: sortings, greedy

## Stage 2 - 二分答案
- Phase: 进阶
- Rating: 1100-1300
- Tags: binary search, two pointers
`;

const SMALL_GUIDE = parseGuideMarkdown(`
# Demo Guide

## Completion Rules
- Target AC: 8-10
- Independent AC: 6

## Anchor Rules
- Anchor rating: 1500-1600
- Low-level offset: +400~+500

## Prerequisite Rules
- Count: 3
- Rating offsets: -300, -200, -100
- Prefer similar structure: true
- Similarity basis: tag-combination
- Exclude solved problems: true
`);

function makeAcceptedSubmission(id, problemKey, rating, tags, creationTimeSeconds) {
  return {
    id,
    verdict: 'OK',
    creationTimeSeconds,
    problemKey,
    problem: {
      key: problemKey,
      name: problemKey,
      rating,
      tags,
    },
  };
}

function makeRejectedSubmission(id, problemKey, rating, tags, creationTimeSeconds) {
  return {
    id,
    verdict: 'WRONG_ANSWER',
    creationTimeSeconds,
    problemKey,
    problem: {
      key: problemKey,
      name: problemKey,
      rating,
      tags,
    },
  };
}

function createCaches({ submissions, rating = 1000 }) {
  const items = submissions.map((submission) => ({
    key: submission.problemKey,
    name: submission.problem.name,
    rating: submission.problem.rating,
    tags: submission.problem.tags,
  }));

  return {
    user: {
      handle: 'demo',
      rating,
      maxRating: rating,
      rank: 'pupil',
    },
    submissions: {
      handle: 'demo',
      items: submissions,
    },
    rating: {
      handle: 'demo',
      items: [
        {
          contestId: 1,
          contestName: 'Round 1',
          ratingUpdateTimeSeconds: 1,
          oldRating: rating - 50,
          newRating: rating,
        },
      ],
    },
    problems: {
      items,
    },
  };
}

test('parseMapMarkdown parses ordered stages and metadata from valid markdown', () => {
  const roadmap = parseMapMarkdown(VALID_MAP, {
    defaultCompletion: SMALL_GUIDE.completion,
  });

  assert.equal(roadmap.stageCount, 2);
  assert.deepEqual(roadmap.stages[0], {
    id: 1,
    order: 1,
    name: '排序 + 贪心',
    phase: '入门',
    tags: ['sortings', 'greedy'],
    ratingMin: 800,
    ratingMax: 1000,
    targetAcMin: 8,
    targetAcMax: 10,
    targetSoloAc: 6,
  });
});

test('parseMapMarkdown rejects malformed roadmap markdown', () => {
  assert.throws(() => parseMapMarkdown(`
## Stage 1 - Broken
- Rating: 800-1000
`), /缺少 tags/);

  assert.throws(() => parseMapMarkdown(`
## Stage 1 - One
- Rating: 800-1000
- Tags: greedy

## Stage 1 - Two
- Rating: 1000-1200
- Tags: dp
`), /重复阶段编号/);

  assert.throws(() => parseMapMarkdown(`
## Stage 1 - Broken Rating
- Rating: high
- Tags: greedy
`), /rating 无法解析/);
});

test('evaluateStageCompletion handles incomplete, borderline, and complete cases', () => {
  assert.equal(evaluateStageCompletion({ acCount: 7, independentAcCount: 6 }).complete, false);
  assert.equal(evaluateStageCompletion({ acCount: 8, independentAcCount: 6 }).complete, true);
  assert.equal(evaluateStageCompletion({ acCount: 10, independentAcCount: 5 }).complete, false);
});

test('determineIndependentAc distinguishes first-try, repeated, and logged solo states', () => {
  assert.equal(determineIndependentAc({ accepted: true, attemptCount: 1 }), true);
  assert.equal(determineIndependentAc({ accepted: true, attemptCount: 3 }), false);
  assert.equal(determineIndependentAc({ accepted: true, attemptCount: 3 }, { verdict: 'ac', solo: true }), true);
  assert.equal(determineIndependentAc({ accepted: true, attemptCount: 1 }, { verdict: 'ac', solo: false }), false);
});

test('buildStageProgress reports per-stage AC and independent thresholds', () => {
  const roadmap = parseMapMarkdown(VALID_MAP, {
    defaultCompletion: SMALL_GUIDE.completion,
  });
  const acceptedRecords = [
    { problemKey: '100A', stageId: 1, rating: 800, independentAc: true },
    { problemKey: '100B', stageId: 1, rating: 900, independentAc: true },
    { problemKey: '100C', stageId: 1, rating: 900, independentAc: true },
    { problemKey: '100D', stageId: 1, rating: 1000, independentAc: true },
    { problemKey: '100E', stageId: 1, rating: 1000, independentAc: true },
    { problemKey: '100F', stageId: 1, rating: 1000, independentAc: true },
    { problemKey: '100G', stageId: 1, rating: 1000, independentAc: false },
    { problemKey: '100H', stageId: 1, rating: 1000, independentAc: false },
  ];

  const progress = buildStageProgress(roadmap, acceptedRecords, SMALL_GUIDE);

  assert.equal(progress[0].acCount, 8);
  assert.equal(progress[0].independentAcCount, 6);
  assert.equal(progress[0].complete, true);
  assert.equal(progress[1].acCount, 0);
  assert.equal(progress[1].remainingAcCount, 8);
});

test('buildProgressModel infers the current stage for beginner, intermediate, and advanced users', () => {
  const roadmap = parseMapMarkdown(`
## Stage 1 - 排序 + 贪心
- Rating: 800-1000
- Tags: sortings, greedy

## Stage 2 - 二分答案
- Rating: 1100-1300
- Tags: binary search, two pointers

## Stage 3 - 动态规划
- Rating: 1300-1500
- Tags: dp
`, {
    defaultCompletion: SMALL_GUIDE.completion,
  });

  const beginnerCaches = createCaches({
    rating: 980,
    submissions: [
      makeAcceptedSubmission(1, '100A', 800, ['greedy'], 1),
      makeAcceptedSubmission(2, '100B', 800, ['sortings'], 2),
      makeAcceptedSubmission(3, '100C', 900, ['greedy'], 3),
      makeAcceptedSubmission(4, '100D', 900, ['sortings'], 4),
      makeAcceptedSubmission(5, '100E', 1000, ['greedy'], 5),
    ],
  });
  const intermediateCaches = createCaches({
    rating: 1240,
    submissions: [
      makeAcceptedSubmission(1, '100A', 800, ['greedy'], 1),
      makeAcceptedSubmission(2, '100B', 800, ['sortings'], 2),
      makeAcceptedSubmission(3, '100C', 900, ['greedy'], 3),
      makeAcceptedSubmission(4, '100D', 900, ['sortings'], 4),
      makeAcceptedSubmission(5, '100E', 1000, ['greedy'], 5),
      makeAcceptedSubmission(6, '100F', 1000, ['sortings'], 6),
      makeAcceptedSubmission(7, '100G', 1000, ['greedy'], 7),
      makeAcceptedSubmission(8, '100H', 1000, ['sortings'], 8),
      makeAcceptedSubmission(9, '200A', 1100, ['binary search'], 9),
      makeAcceptedSubmission(10, '200B', 1200, ['two pointers'], 10),
      makeAcceptedSubmission(11, '200C', 1300, ['binary search'], 11),
      makeAcceptedSubmission(12, '200D', 1200, ['two pointers'], 12),
    ],
  });
  const advancedCaches = createCaches({
    rating: 1450,
    submissions: [
      makeAcceptedSubmission(1, '100A', 800, ['greedy'], 1),
      makeAcceptedSubmission(2, '100B', 800, ['sortings'], 2),
      makeAcceptedSubmission(3, '100C', 900, ['greedy'], 3),
      makeAcceptedSubmission(4, '100D', 900, ['sortings'], 4),
      makeAcceptedSubmission(5, '100E', 1000, ['greedy'], 5),
      makeAcceptedSubmission(6, '100F', 1000, ['sortings'], 6),
      makeAcceptedSubmission(7, '100G', 1000, ['greedy'], 7),
      makeAcceptedSubmission(8, '100H', 1000, ['sortings'], 8),
      makeAcceptedSubmission(9, '200A', 1100, ['binary search'], 9),
      makeAcceptedSubmission(10, '200B', 1200, ['two pointers'], 10),
      makeAcceptedSubmission(11, '200C', 1300, ['binary search'], 11),
      makeAcceptedSubmission(12, '200D', 1200, ['two pointers'], 12),
      makeAcceptedSubmission(13, '200E', 1300, ['binary search'], 13),
      makeAcceptedSubmission(14, '200F', 1300, ['two pointers'], 14),
      makeAcceptedSubmission(15, '200G', 1250, ['binary search'], 15),
      makeAcceptedSubmission(16, '200H', 1250, ['two pointers'], 16),
      makeAcceptedSubmission(17, '300A', 1300, ['dp'], 17),
      makeAcceptedSubmission(18, '300B', 1400, ['dp'], 18),
      makeAcceptedSubmission(19, '300C', 1500, ['dp'], 19),
      makeAcceptedSubmission(20, '300D', 1400, ['dp'], 20),
      makeAcceptedSubmission(21, '300E', 1500, ['dp'], 21),
    ],
  });

  const beginner = buildProgressModel(beginnerCaches, { roadmap, guide: SMALL_GUIDE });
  const intermediate = buildProgressModel(intermediateCaches, { roadmap, guide: SMALL_GUIDE });
  const advanced = buildProgressModel(advancedCaches, { roadmap, guide: SMALL_GUIDE });

  assert.equal(beginner.currentStage.id, 1);
  assert.equal(intermediate.currentStage.id, 2);
  assert.equal(advanced.currentStage.id, 3);
});

test('buildPracticeRecords uses logs to classify assisted or repeated practice', () => {
  const roadmap = parseMapMarkdown(VALID_MAP, {
    defaultCompletion: SMALL_GUIDE.completion,
  });
  const caches = createCaches({
    submissions: [
      makeAcceptedSubmission(1, '100A', 800, ['greedy'], 1),
      makeRejectedSubmission(2, '100B', 900, ['sortings'], 2),
      makeAcceptedSubmission(3, '100B', 900, ['sortings'], 3),
    ],
  });

  const records = buildPracticeRecords(caches, {
    roadmap,
    logEntries: [
      { id: 'CF-100B', verdict: 'ac', solo: true, timestamp: '2026-03-15T10:00:00Z' },
    ],
  });

  assert.equal(records.find((item) => item.problemKey === '100A').independentAc, true);
  assert.equal(records.find((item) => item.problemKey === '100B').independentAc, true);
  assert.equal(records.find((item) => item.problemKey === '100B').independentSource, 'log');
});

test('loadTrainingResources exposes roadmap and guide fields required by recommendation logic', () => {
  const config = loadTrainingResources();

  assert.equal(config.roadmap.stageCount, 20);
  assert.equal(config.roadmap.stages[0].id, 1);
  assert.equal(config.roadmap.stages[19].id, 20);
  assert.ok(Array.isArray(config.roadmap.stages[0].tags));
  assert.equal(typeof config.guide.anchor.absoluteMinRating, 'number');
  assert.equal(typeof config.guide.anchor.userOffsetMin, 'number');
  assert.equal(config.guide.prerequisites.count, 3);
  assert.deepEqual(config.guide.prerequisites.ratingOffsets, [-300, -200, -100]);
  assert.equal(config.guide.prerequisites.similarityBasis, 'tag-combination');
  assert.equal(config.guide.review.revisitAnchorAfterPrerequisites, true);
});
