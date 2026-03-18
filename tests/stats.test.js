const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { runCli } = require('../src/cli');
const {
  aggregateRatingBuckets,
  aggregateTagStats,
  classifyRatingBucket,
  dedupeSubmissions,
  deriveProblemAttempts,
  renderRatingTrend,
} = require('../src/stats');

function createTempEnv() {
  return {
    CF_COACH_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-coach-stats-')),
  };
}

function createBufferStream() {
  let output = '';

  return {
    stream: {
      write(chunk) {
        output += String(chunk);
      },
    },
    read() {
      return output;
    },
  };
}

function writeStatsCaches(env, fixture) {
  const cacheDir = path.join(env.CF_COACH_HOME, '.cf-coach', 'cache');

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'user.json'), `${JSON.stringify(fixture.user, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(cacheDir, 'submissions.json'), `${JSON.stringify(fixture.submissions, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(cacheDir, 'rating.json'), `${JSON.stringify(fixture.rating, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(cacheDir, 'problems.json'), `${JSON.stringify(fixture.problems, null, 2)}\n`, 'utf8');
}

function createStatsFixture(overrides = {}) {
  return {
    user: {
      handle: 'tourist',
      rank: 'specialist',
      rating: 1490,
      maxRating: 1600,
      fetchedAt: '2026-03-18T10:00:00.000Z',
      ...overrides.user,
    },
    submissions: {
      handle: 'tourist',
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: [
        {
          id: 1,
          creationTimeSeconds: 100,
          verdict: 'WRONG_ANSWER',
          problemKey: '100A',
          problem: { key: '100A', name: 'Watermelon', rating: 800, tags: ['math'] },
        },
        {
          id: 2,
          creationTimeSeconds: 110,
          verdict: 'OK',
          problemKey: '100A',
          problem: { key: '100A', name: 'Watermelon', rating: 800, tags: ['math'] },
        },
        {
          id: 3,
          creationTimeSeconds: 200,
          verdict: 'WRONG_ANSWER',
          problemKey: '101B',
          problem: { key: '101B', name: 'DP Path', rating: 1200, tags: ['dp', 'math'] },
        },
        {
          id: 4,
          creationTimeSeconds: 300,
          verdict: 'OK',
          problemKey: '102C',
          problem: { key: '102C', name: 'Greedy Pick', rating: 1600, tags: ['greedy'] },
        },
        {
          id: 5,
          creationTimeSeconds: 400,
          verdict: 'TIME_LIMIT_EXCEEDED',
          problemKey: '103D',
          problem: { key: '103D', name: 'Graph Walk', rating: 1700, tags: ['graphs'] },
        },
      ],
      ...overrides.submissions,
    },
    rating: {
      handle: 'tourist',
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: [
        {
          contestId: 101,
          contestName: 'Round 101',
          ratingUpdateTimeSeconds: 1000,
          oldRating: 1300,
          newRating: 1400,
        },
        {
          contestId: 102,
          contestName: 'Round 102',
          ratingUpdateTimeSeconds: 2000,
          oldRating: 1400,
          newRating: 1500,
        },
        {
          contestId: 103,
          contestName: 'Round 103',
          ratingUpdateTimeSeconds: 3000,
          oldRating: 1500,
          newRating: 1490,
        },
      ],
      ...overrides.rating,
    },
    problems: {
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: [
        { key: '100A', name: 'Watermelon', rating: 800, tags: ['math'] },
        { key: '101B', name: 'DP Path', rating: 1200, tags: ['dp', 'math'] },
        { key: '102C', name: 'Greedy Pick', rating: 1600, tags: ['greedy'] },
        { key: '103D', name: 'Graph Walk', rating: 1700, tags: ['graphs'] },
      ],
      ...overrides.problems,
    },
  };
}

test('dedupeSubmissions and deriveProblemAttempts collapse duplicate submissions into per-problem stats', () => {
  const submissions = [
    { id: 2, creationTimeSeconds: 120, verdict: 'WRONG_ANSWER', problemKey: '100A', problem: { tags: ['math'] } },
    { id: 1, creationTimeSeconds: 100, verdict: 'OK', problemKey: '100A', problem: { tags: ['math'] } },
    { id: 2, creationTimeSeconds: 120, verdict: 'WRONG_ANSWER', problemKey: '100A', problem: { tags: ['math'] } },
    { id: 3, creationTimeSeconds: 130, verdict: 'WRONG_ANSWER', problemKey: '101A', problem: { tags: ['greedy'] } },
  ];

  const deduped = dedupeSubmissions(submissions);
  const attempts = deriveProblemAttempts(submissions);

  assert.deepEqual(deduped.map((item) => item.id), [1, 2, 3]);
  assert.deepEqual(attempts, [
    {
      problemKey: '100A',
      name: null,
      rating: null,
      tags: ['math'],
      attemptCount: 2,
      accepted: true,
    },
    {
      problemKey: '101A',
      name: null,
      rating: null,
      tags: ['greedy'],
      attemptCount: 1,
      accepted: false,
    },
  ]);
});

test('aggregateTagStats computes AC counts, attempts, and pass rates from mixed verdict histories', () => {
  const attempts = [
    { problemKey: '100A', tags: ['math'], accepted: true },
    { problemKey: '101B', tags: ['math', 'dp'], accepted: false },
    { problemKey: '102C', tags: ['dp'], accepted: true },
    { problemKey: '103D', tags: ['graphs'], accepted: false },
  ];

  const stats = aggregateTagStats(attempts);

  assert.deepEqual(stats, [
    { tag: 'dp', attemptedCount: 2, acCount: 1, passRate: 0.5 },
    { tag: 'math', attemptedCount: 2, acCount: 1, passRate: 0.5 },
    { tag: 'graphs', attemptedCount: 1, acCount: 0, passRate: 0 },
  ]);
});

test('aggregateTagStats preserves case-sensitive tags while trimming duplicates after helper extraction', () => {
  const stats = aggregateTagStats([
    {
      problemKey: '100A',
      tags: [' Math ', 'Math', 'math', ''],
      accepted: false,
    },
    {
      problemKey: '100B',
      tags: ['math ', ' DP '],
      accepted: true,
    },
  ]);

  assert.deepEqual(stats.find((entry) => entry.tag === 'Math'), {
    tag: 'Math',
    attemptedCount: 1,
    acCount: 0,
    passRate: 0,
  });
  assert.deepEqual(stats.find((entry) => entry.tag === 'math'), {
    tag: 'math',
    attemptedCount: 2,
    acCount: 1,
    passRate: 0.5,
  });
  assert.deepEqual(stats.find((entry) => entry.tag === 'DP'), {
    tag: 'DP',
    attemptedCount: 1,
    acCount: 1,
    passRate: 1,
  });
});

test('classifyRatingBucket, aggregateRatingBuckets, and renderRatingTrend use stable bucket/trend rules', () => {
  assert.equal(classifyRatingBucket(750), '800');
  assert.equal(classifyRatingBucket(800), '800');
  assert.equal(classifyRatingBucket(999), '900');
  assert.equal(classifyRatingBucket(1600), '1600+');
  assert.equal(classifyRatingBucket(null), null);

  const buckets = aggregateRatingBuckets([
    { accepted: true, rating: 800 },
    { accepted: true, rating: 1299 },
    { accepted: true, rating: 1700 },
    { accepted: false, rating: 1200 },
  ]);

  assert.deepEqual(buckets, [
    { bucket: '800', acCount: 1 },
    { bucket: '900', acCount: 0 },
    { bucket: '1000', acCount: 0 },
    { bucket: '1100', acCount: 0 },
    { bucket: '1200', acCount: 1 },
    { bucket: '1300', acCount: 0 },
    { bucket: '1400', acCount: 0 },
    { bucket: '1500', acCount: 0 },
    { bucket: '1600+', acCount: 1 },
  ]);

  const trend = renderRatingTrend([
    { contestName: 'Round 1', ratingUpdateTimeSeconds: 1000, newRating: 1200 },
    { contestName: 'Round 2', ratingUpdateTimeSeconds: 2000, newRating: 1250 },
    { contestName: 'Round 3', ratingUpdateTimeSeconds: 3000, newRating: 1230 },
  ], { limit: 2, width: 10 });

  assert.deepEqual(trend, [
    '  01. Round 2 1250 | ##########',
    '  02. Round 3 1230 | #',
  ]);
});

test('cf stats prints a stable offline snapshot from cached fixtures', async () => {
  const env = createTempEnv();
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  writeStatsCaches(env, createStatsFixture());

  const exitCode = await runCli(['stats', '--handle', 'tourist'], {
    env,
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 0);
  assert.equal(stderr.read(), '');
  assert.equal(stdout.read(), [
    '统计：tourist',
    '当前 rating：1490',
    '最高 rating：1600',
    '当前 rank：specialist',
    '',
    '最近比赛走势：',
    '  01. Round 101 1400 | #',
    '  02. Round 102 1500 | ####################',
    '  03. Round 103 1490 | ##################',
    '',
    'Tag 统计：',
    '  math: AC 1 / 尝试 2 / 通过率 50%',
    '  greedy: AC 1 / 尝试 1 / 通过率 100%',
    '  dp: AC 0 / 尝试 1 / 通过率 0%',
    '  graphs: AC 0 / 尝试 1 / 通过率 0%',
    '',
    'Rating 分档 AC：',
    '  800: 1',
    '  900: 0',
    '  1000: 0',
    '  1100: 0',
    '  1200: 0',
    '  1300: 0',
    '  1400: 0',
    '  1500: 0',
    '  1600+: 1',
    '',
    '总 AC 题数：2',
    '总提交数：5',
    '总尝试题数：4',
    '',
  ].join('\n'));
});

test('cf stats handles users with no contests', async () => {
  const env = createTempEnv();
  const stdout = createBufferStream();

  writeStatsCaches(env, createStatsFixture({
    user: {
      handle: 'newbie',
      rank: 'pupil',
      rating: 1200,
      maxRating: 1200,
    },
    submissions: {
      handle: 'newbie',
      items: [],
    },
    rating: {
      handle: 'newbie',
      items: [],
    },
    problems: {
      items: [],
    },
  }));

  const exitCode = await runCli(['stats', '--handle', 'newbie'], {
    env,
    stdout: stdout.stream,
    stderr: createBufferStream().stream,
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.read(), /最近比赛走势：[\s\S]*暂无比赛记录/);
  assert.match(stdout.read(), /总 AC 题数：0/);
  assert.match(stdout.read(), /总提交数：0/);
});

test('cf stats handles users with attempts but no accepted submissions', async () => {
  const env = createTempEnv();
  const stdout = createBufferStream();

  writeStatsCaches(env, createStatsFixture({
    submissions: {
      items: [
        {
          id: 10,
          creationTimeSeconds: 100,
          verdict: 'WRONG_ANSWER',
          problemKey: '200A',
          problem: { key: '200A', name: 'Math Fails', rating: 900, tags: ['math'] },
        },
        {
          id: 11,
          creationTimeSeconds: 200,
          verdict: 'TIME_LIMIT_EXCEEDED',
          problemKey: '201B',
          problem: { key: '201B', name: 'Graph Fails', rating: 1600, tags: ['graphs'] },
        },
      ],
    },
    problems: {
      items: [
        { key: '200A', name: 'Math Fails', rating: 900, tags: ['math'] },
        { key: '201B', name: 'Graph Fails', rating: 1600, tags: ['graphs'] },
      ],
    },
  }));

  const exitCode = await runCli(['stats', '--handle', 'tourist'], {
    env,
    stdout: stdout.stream,
    stderr: createBufferStream().stream,
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.read(), /总 AC 题数：0/);
  assert.match(stdout.read(), /math: AC 0 \/ 尝试 1 \/ 通过率 0%/);
  assert.match(stdout.read(), /1600\+: 0/);
});
