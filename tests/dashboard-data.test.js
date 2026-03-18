const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNextPayload,
  buildProfilePayload,
  buildRoadmapPayload,
  createProblemLink,
} = require('../src/dashboard-data');
const { parseGuideMarkdown, parseMapMarkdown } = require('../src/training');

const GUIDE = parseGuideMarkdown(`
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

const ROADMAP = parseMapMarkdown(`
## Stage 1 - 排序 + 贪心
- Phase: 入门
- Rating: 800-1000
- Tags: sortings, greedy

## Stage 2 - 二分
- Phase: 进阶
- Rating: 1100-1300
- Tags: binary search
`, {
  defaultCompletion: GUIDE.completion,
});

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
  return {
    user: {
      handle: 'demo',
      rating,
      maxRating: 1200,
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
          ratingUpdateTimeSeconds: 100,
          oldRating: 900,
          newRating: rating,
        },
      ],
    },
    problems: {
      items: problems,
    },
  };
}

test('buildProfilePayload counts unique accepted and attempted problems from submission history', () => {
  const payload = buildProfilePayload(createCaches({
    submissions: [
      makeSubmission({ id: 1, problemKey: '100A', rating: 800, tags: ['sortings'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '100A', rating: 800, tags: ['sortings'], verdict: 'OK', creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '101B', rating: 900, tags: ['greedy'], verdict: 'OK', creationTimeSeconds: 3 }),
      makeSubmission({ id: 4, problemKey: '102C', rating: 1200, tags: ['binary search'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 4 }),
    ],
  }));

  assert.deepEqual(payload, {
    handle: 'demo',
    rating: 1000,
    maxRating: 1200,
    rank: 'pupil',
    totalAcceptedCount: 2,
    totalSubmissionsCount: 4,
    totalAttemptedProblems: 3,
  });
});

test('buildRoadmapPayload returns ordered stages with progress and current marker', () => {
  const payload = buildRoadmapPayload(createCaches({
    submissions: [
      makeSubmission({ id: 1, problemKey: '100A', rating: 800, tags: ['sortings'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '101B', rating: 900, tags: ['greedy'], creationTimeSeconds: 2 }),
    ],
  }), {
    roadmap: ROADMAP,
    guide: GUIDE,
  });

  assert.deepEqual(payload, {
    items: [
      {
        stageId: 1,
        stageName: '排序 + 贪心',
        tag: 'sortings, greedy',
        acceptedProgress: 2,
        target: 4,
        isCurrentStage: true,
      },
      {
        stageId: 2,
        stageName: '二分',
        tag: 'binary search',
        acceptedProgress: 0,
        target: 4,
        isCurrentStage: false,
      },
    ],
  });
});

test('buildNextPayload exposes links for the anchor and prerequisites', () => {
  const caches = createCaches({
    submissions: [
      makeSubmission({ id: 1, problemKey: '100A', rating: 800, tags: ['sortings'], creationTimeSeconds: 1 }),
      makeSubmission({ id: 2, problemKey: '101B', rating: 900, tags: ['sortings'], creationTimeSeconds: 2 }),
      makeSubmission({ id: 3, problemKey: '102B', rating: 950, tags: ['greedy'], creationTimeSeconds: 3 }),
    ],
    problems: [
      makeProblem('300B', 'Greedy Combo 1', 1190, ['greedy', 'sortings']),
      makeProblem('310B', 'Greedy Combo 2', 1290, ['greedy', 'sortings']),
      makeProblem('320B', 'Greedy Combo 3', 1390, ['greedy', 'sortings']),
      makeProblem('400A', 'Greedy Single Anchor', 1450, ['greedy']),
      makeProblem('401B', 'Greedy Combo Anchor', 1440, ['greedy', 'sortings']),
    ],
  });

  const payload = buildNextPayload(caches, {
    roadmap: ROADMAP,
    guide: GUIDE,
  });

  assert.equal(payload.currentTopic, 'greedy');
  assert.deepEqual(payload.stage, {
    id: 1,
    name: '排序 + 贪心',
  });
  assert.deepEqual(payload.stageProgress, {
    accepted: 1,
    target: 2,
    missing: 1,
  });
  assert.deepEqual(payload.anchor, {
    problemId: '401B',
    title: 'Greedy Combo Anchor',
    rating: 1440,
    tags: ['greedy', 'sortings'],
    link: 'https://codeforces.com/problemset/problem/401/B',
  });
  assert.deepEqual(payload.prerequisites.map((problem) => problem.problemId), ['300B', '310B', '320B']);
});

test('createProblemLink builds Codeforces problem URLs from cached keys', () => {
  assert.equal(createProblemLink('123A'), 'https://codeforces.com/problemset/problem/123/A');
  assert.equal(createProblemLink(''), null);
  assert.equal(createProblemLink('ABC'), null);
});
