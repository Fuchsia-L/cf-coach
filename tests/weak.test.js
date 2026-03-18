const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProgressModel,
  parseGuideMarkdown,
  parseMapMarkdown,
} = require('../src/training');
const {
  buildWeakReport,
  detectRoadmapGaps,
  detectWeakRatingRanges,
  detectWeakTags,
} = require('../src/weak');

const SMALL_GUIDE = parseGuideMarkdown(`
# Demo Guide

## Completion Rules
- Target AC: 4-5
- Independent AC: 2

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

function makeSubmission({
  id,
  problemKey,
  rating,
  tags,
  verdict = 'OK',
  creationTimeSeconds,
}) {
  return {
    id,
    verdict,
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

function createCaches({ submissions, rating = 1200 }) {
  const uniqueProblems = new Map();

  for (const submission of submissions) {
    uniqueProblems.set(submission.problemKey, {
      key: submission.problemKey,
      name: submission.problem.name,
      rating: submission.problem.rating,
      tags: submission.problem.tags,
    });
  }

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
      items: Array.from(uniqueProblems.values()),
    },
  };
}

test('detectWeakTags applies thresholds and sorts by severity', () => {
  const weakTags = detectWeakTags([
    { problemKey: 'A', tags: ['dp'], attemptCount: 3, accepted: false },
    { problemKey: 'B', tags: ['dp'], attemptCount: 2, accepted: false },
    { problemKey: 'C', tags: ['dp'], attemptCount: 1, accepted: true },
    { problemKey: 'D', tags: ['greedy'], attemptCount: 1, accepted: false },
    { problemKey: 'E', tags: ['greedy'], attemptCount: 1, accepted: false },
    { problemKey: 'F', tags: ['greedy'], attemptCount: 1, accepted: false },
    { problemKey: 'G', tags: ['greedy'], attemptCount: 1, accepted: true },
    { problemKey: 'H', tags: ['math'], attemptCount: 1, accepted: false },
    { problemKey: 'I', tags: ['math'], attemptCount: 1, accepted: true },
  ]);

  assert.deepEqual(weakTags.map((entry) => entry.tag), ['greedy', 'dp']);
  assert.equal(weakTags[0].attemptedCount, 4);
  assert.equal(weakTags[0].acCount, 1);
  assert.equal(weakTags[1].attemptedCount, 3);
  assert.equal(weakTags[1].acCount, 1);
});

test('detectWeakTags lowercases and deduplicates mixed-case tags after helper extraction', () => {
  const weakTags = detectWeakTags([
    { problemKey: 'A', tags: [' Greedy ', 'gReEdY'], attemptCount: 2, accepted: false },
    { problemKey: 'B', tags: ['GREEDY'], attemptCount: 1, accepted: false },
    { problemKey: 'C', tags: ['greedy'], attemptCount: 1, accepted: true },
  ]);

  assert.equal(weakTags.length, 1);
  assert.equal(weakTags[0].tag, 'greedy');
  assert.equal(weakTags[0].attemptedCount, 3);
  assert.equal(weakTags[0].acCount, 1);
  assert.equal(weakTags[0].submissionCount, 4);
  assert.equal(weakTags[0].failedCount, 2);
  assert.equal(weakTags[0].passRate, 1 / 3);
  assert.ok(weakTags[0].priority > 0);
});

test('detectWeakRatingRanges finds low-conversion buckets with repeated failures', () => {
  const weakBuckets = detectWeakRatingRanges([
    { problemKey: 'A', rating: 1200, attemptCount: 3, accepted: false },
    { problemKey: 'B', rating: 1250, attemptCount: 2, accepted: false },
    { problemKey: 'C', rating: 1280, attemptCount: 1, accepted: true },
    { problemKey: 'D', rating: 1400, attemptCount: 2, accepted: true },
    { problemKey: 'E', rating: 1450, attemptCount: 1, accepted: false },
  ]);

  assert.equal(weakBuckets.length, 1);
  assert.equal(weakBuckets[0].bucket, '1200');
  assert.equal(weakBuckets[0].label, '1200-1299');
  assert.equal(weakBuckets[0].submissionCount, 6);
  assert.equal(weakBuckets[0].failedSubmissionCount, 5);
  assert.equal(weakBuckets[0].acCount, 1);
});

test('detectRoadmapGaps flags current-stage tags lacking enough solved problems', () => {
  const roadmap = parseMapMarkdown(`
## Stage 1 - 排序 + 贪心
- Rating: 800-1000
- Tags: sortings, greedy

## Stage 2 - 二分 + 双指针
- Rating: 1100-1300
- Tags: binary search, two pointers
`, {
    defaultCompletion: SMALL_GUIDE.completion,
  });
  const caches = createCaches({
    rating: 1220,
    submissions: [
      makeSubmission({ id: 1, problemKey: '100A', rating: 800, tags: ['sortings'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '100B', rating: 900, tags: ['greedy'], creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '100C', rating: 900, tags: ['sortings'], creationTimeSeconds: 3 }),
      makeSubmission({ id: 4, problemKey: '100D', rating: 1000, tags: ['greedy'], creationTimeSeconds: 4 }),
      makeSubmission({ id: 5, problemKey: '200A', rating: 1200, tags: ['binary search'], creationTimeSeconds: 5 }),
    ],
  });

  const progressModel = buildProgressModel(caches, { roadmap, guide: SMALL_GUIDE });
  const gaps = detectRoadmapGaps(progressModel);

  assert.equal(progressModel.currentStage.id, 2);
  assert.deepEqual(gaps.map((entry) => entry.tag), ['two pointers', 'binary search']);
  assert.deepEqual(gaps.map((entry) => entry.missingCount), [2, 1]);
});

test('buildWeakReport prioritizes roadmap, tag, and rating suggestions together', () => {
  const roadmap = parseMapMarkdown(`
## Stage 1 - 排序 + 贪心
- Rating: 800-1000
- Tags: sortings, greedy
`, {
    defaultCompletion: SMALL_GUIDE.completion,
  });
  const caches = createCaches({
    rating: 930,
    submissions: [
      makeSubmission({ id: 1, problemKey: '100A', rating: 900, tags: ['sortings'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '100B', rating: 800, tags: ['greedy'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '100C', rating: 850, tags: ['greedy'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 3 }),
      makeSubmission({ id: 4, problemKey: '100D', rating: 880, tags: ['greedy'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 4 }),
      makeSubmission({ id: 5, problemKey: '100D', rating: 880, tags: ['greedy'], creationTimeSeconds: 5 }),
    ],
  });

  const report = buildWeakReport(caches, { roadmap, guide: SMALL_GUIDE }, { handle: 'demo' });

  assert.ok(report.recommendations.length >= 3);
  assert.equal(report.recommendations[0].type, 'roadmap');
  assert.equal(report.recommendations.some((entry) => entry.type === 'tag'), true);
  assert.equal(report.recommendations.some((entry) => entry.type === 'rating'), true);
});

test('detectRoadmapGaps does not mark already-mastered current-stage tags as weak', () => {
  const roadmap = parseMapMarkdown(`
## Stage 1 - 二分 + 双指针
- Rating: 1100-1300
- Tags: binary search, two pointers
`, {
    defaultCompletion: SMALL_GUIDE.completion,
  });
  const caches = createCaches({
    rating: 1250,
    submissions: [
      makeSubmission({ id: 1, problemKey: '200A', rating: 1100, tags: ['binary search'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '200B', rating: 1200, tags: ['binary search'], creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '200C', rating: 1200, tags: ['two pointers'], creationTimeSeconds: 3 }),
      makeSubmission({ id: 4, problemKey: '200D', rating: 1300, tags: ['two pointers'], creationTimeSeconds: 4 }),
    ],
  });

  const progressModel = buildProgressModel(caches, { roadmap, guide: SMALL_GUIDE });

  assert.deepEqual(detectRoadmapGaps(progressModel), []);
});
