const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNextReport,
  buildReviewRecommendations,
  parseNextCommandArgs,
  scoreTagCombinationSimilarity,
  selectAnchorRatingBand,
  selectProblemForTarget,
} = require('../src/next');
const { parseGuideMarkdown, parseMapMarkdown } = require('../src/training');

const GUIDE = parseGuideMarkdown(`
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

## Review Rules
- Enabled: true
- Review anchor after prerequisites: true
- Trigger: solved-prerequisites-without-anchor-revisit
`);

function makeSubmission({ id, problemKey, name = problemKey, rating, tags, verdict = 'OK', creationTimeSeconds }) {
  return {
    id,
    verdict,
    creationTimeSeconds,
    problemKey,
    problem: {
      key: problemKey,
      name,
      rating,
      tags,
    },
  };
}

function makeProblem(key, name, rating, tags) {
  return {
    key,
    name,
    rating,
    tags,
  };
}

function createCaches({ submissions, rating = 1000, problems = [] }) {
  const problemMap = new Map();

  for (const submission of submissions) {
    problemMap.set(submission.problemKey, {
      key: submission.problemKey,
      name: submission.problem.name,
      rating: submission.problem.rating,
      tags: submission.problem.tags,
    });
  }

  for (const problem of problems) {
    problemMap.set(problem.key, problem);
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
      items: Array.from(problemMap.values()).sort((left, right) => left.key.localeCompare(right.key)),
    },
  };
}

test('selectAnchorRatingBand adjusts lower-rated users and keeps normal users in the default band', () => {
  assert.deepEqual(selectAnchorRatingBand(950, GUIDE.anchor), {
    min: 1350,
    max: 1450,
    target: 1400,
    adjustedByUserRating: true,
  });

  assert.deepEqual(selectAnchorRatingBand(1200, GUIDE.anchor), {
    min: 1500,
    max: 1600,
    target: 1550,
    adjustedByUserRating: false,
  });
});

test('selectProblemForTarget favors matching tag combinations and falls back to the nearest rating', () => {
  const combinationMatch = selectProblemForTarget([
    makeProblem('A', 'A', 1300, ['greedy']),
    makeProblem('B', 'B', 1310, ['greedy', 'sortings']),
  ], {
    topic: 'greedy',
    referenceTags: ['greedy', 'sortings'],
    targetRating: 1300,
    preferredMin: 1250,
    preferredMax: 1350,
    usedKeys: new Set(),
  });

  assert.equal(combinationMatch.key, 'B');
  assert.equal(combinationMatch.preferredRangeUsed, true);

  const fallback = selectProblemForTarget([
    makeProblem('C', 'C', 1220, ['greedy', 'sortings']),
    makeProblem('D', 'D', 1260, ['greedy']),
  ], {
    topic: 'greedy',
    referenceTags: ['greedy', 'sortings'],
    targetRating: 1150,
    preferredMin: 1100,
    preferredMax: 1200,
    usedKeys: new Set(),
  });

  assert.equal(fallback.key, 'C');
  assert.equal(fallback.preferredRangeUsed, false);
});

test('scoreTagCombinationSimilarity ranks exact combinations above single-tag matches', () => {
  const exactCombo = scoreTagCombinationSimilarity(['greedy', 'sortings'], ['greedy', 'sortings'], 'greedy');
  const singleTag = scoreTagCombinationSimilarity(['greedy', 'sortings'], ['greedy'], 'greedy');

  assert.ok(exactCombo > singleTag);
});

test('parseNextCommandArgs trims and lowercases topic values after helper extraction', () => {
  assert.deepEqual(parseNextCommandArgs(['--topic', '  GrEeDy  ']), {
    options: {
      topic: 'greedy',
      review: false,
    },
    error: null,
  });
});

test('buildNextReport infers the current topic and excludes solved problems from recommendations', () => {
  const roadmap = parseMapMarkdown(`
## Stage 1 - 排序 + 贪心
- Rating: 800-1000
- Tags: sortings, greedy

## Stage 2 - 二分
- Rating: 1100-1300
- Tags: binary search
`, {
    defaultCompletion: GUIDE.completion,
  });
  const caches = createCaches({
    rating: 1000,
    submissions: [
      makeSubmission({ id: 1, problemKey: '100A', rating: 800, tags: ['sortings'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '100B', rating: 900, tags: ['sortings'], creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '400B', rating: 1450, tags: ['greedy', 'sortings'], creationTimeSeconds: 3 }),
    ],
    problems: [
      makeProblem('300B', 'Greedy Combo 1', 1190, ['greedy', 'sortings']),
      makeProblem('310B', 'Greedy Combo 2', 1290, ['greedy', 'sortings']),
      makeProblem('320B', 'Greedy Combo 3', 1390, ['greedy', 'sortings']),
      makeProblem('400A', 'Greedy Single Anchor', 1450, ['greedy']),
      makeProblem('400B', 'Solved Greedy Combo Anchor', 1450, ['greedy', 'sortings']),
      makeProblem('401B', 'Greedy Combo Anchor', 1440, ['greedy', 'sortings']),
    ],
  });

  const report = buildNextReport(caches, { roadmap, guide: GUIDE }, { handle: 'demo' });

  assert.equal(report.selection.stage.id, 1);
  assert.equal(report.selection.topic, 'greedy');
  assert.equal(report.anchor.key, '401B');
  assert.deepEqual(report.prerequisites.map((problem) => problem.key), ['300B', '310B', '320B']);
  assert.equal(report.prerequisites.some((problem) => problem.key === '400B'), false);
});

test('buildReviewRecommendations returns old anchors that need a revisit', () => {
  const roadmap = parseMapMarkdown(`
## Stage 1 - 排序 + 贪心
- Rating: 800-1000
- Tags: sortings, greedy
`, {
    defaultCompletion: GUIDE.completion,
  });
  const caches = createCaches({
    rating: 1000,
    submissions: [
      makeSubmission({ id: 1, problemKey: '700A', name: 'Old Anchor', rating: 1450, tags: ['greedy', 'sortings'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '710A', name: 'Prereq 1', rating: 1180, tags: ['greedy', 'sortings'], creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '720A', name: 'Prereq 2', rating: 1280, tags: ['greedy', 'sortings'], creationTimeSeconds: 3 }),
      makeSubmission({ id: 4, problemKey: '730A', name: 'Prereq 3', rating: 1380, tags: ['greedy', 'sortings'], creationTimeSeconds: 4 }),
    ],
  });

  const report = buildReviewRecommendations(caches, { roadmap, guide: GUIDE }, {
    handle: 'demo',
    topic: 'greedy',
  });

  assert.equal(report.selection.topic, 'greedy');
  assert.equal(report.reviewItems.length, 1);
  assert.equal(report.reviewItems[0].anchor.key, '700A');
  assert.deepEqual(report.reviewItems[0].prerequisites.map((problem) => problem.key), ['710A', '720A', '730A']);
});
