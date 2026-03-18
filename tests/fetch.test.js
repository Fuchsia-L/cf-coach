const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeProblemsetCache,
  mergeRatingCache,
  mergeSubmissionsCache,
} = require('../src/fetch-cache');
const { runCli } = require('../src/cli');

function createTempEnv() {
  return {
    CF_COACH_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-coach-fetch-')),
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

function createApiClient(data) {
  return {
    fetchUserInfo: async () => data.user,
    fetchUserStatus: async () => data.submissions,
    fetchUserRating: async () => data.rating,
    fetchProblemsetProblems: async () => data.problems,
  };
}

function createFetchPayload(overrides = {}) {
  return {
    user: {
      handle: 'tourist',
      rating: 3800,
      rank: 'legendary grandmaster',
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
          verdict: 'OK',
          problemKey: '100A',
          problem: { key: '100A', name: 'A' },
        },
        {
          id: 2,
          creationTimeSeconds: 200,
          verdict: 'WRONG_ANSWER',
          problemKey: '101A',
          problem: { key: '101A', name: 'B' },
        },
      ],
      ...overrides.submissions,
    },
    rating: {
      handle: 'tourist',
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: [
        {
          contestId: 1,
          ratingUpdateTimeSeconds: 1000,
          oldRating: 3700,
          newRating: 3750,
        },
      ],
      ...overrides.rating,
    },
    problems: {
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: [
        { key: '100A', name: 'A', solvedCount: 10 },
        { key: '101A', name: 'B', solvedCount: 20 },
      ],
      ...overrides.problems,
    },
  };
}

test('mergeSubmissionsCache only counts newly discovered submissions and ACs', () => {
  const existing = {
    handle: 'tourist',
    items: [
      { id: 1, creationTimeSeconds: 100, verdict: 'OK', problemKey: '100A' },
      { id: 2, creationTimeSeconds: 200, verdict: 'WRONG_ANSWER', problemKey: '101A' },
    ],
  };
  const incoming = {
    handle: 'tourist',
    fetchedAt: '2026-03-18T10:00:00.000Z',
    items: [
      ...existing.items,
      { id: 3, creationTimeSeconds: 300, verdict: 'OK', problemKey: '101A' },
      { id: 4, creationTimeSeconds: 400, verdict: 'OK', problemKey: '100A' },
    ],
  };

  const result = mergeSubmissionsCache(existing, incoming);

  assert.deepEqual(result.summary, {
    newSubmissionCount: 2,
    newAcProblemCount: 1,
  });
  assert.equal(result.data.items.length, 4);
});

test('mergeRatingCache only appends new rating changes', () => {
  const existing = {
    handle: 'tourist',
    items: [{ contestId: 1, ratingUpdateTimeSeconds: 1000 }],
  };
  const incoming = {
    handle: 'tourist',
    fetchedAt: '2026-03-18T10:00:00.000Z',
    items: [
      { contestId: 1, ratingUpdateTimeSeconds: 1000 },
      { contestId: 2, ratingUpdateTimeSeconds: 2000 },
    ],
  };

  const result = mergeRatingCache(existing, incoming);

  assert.deepEqual(result.summary, {
    newRatingCount: 1,
  });
  assert.equal(result.data.items.length, 2);
});

test('mergeProblemsetCache preserves known problems and counts new ones', () => {
  const existing = {
    items: [{ key: '100A', name: 'A', solvedCount: 1 }],
  };
  const incoming = {
    fetchedAt: '2026-03-18T10:00:00.000Z',
    items: [
      { key: '100A', name: 'A', solvedCount: 10 },
      { key: '101A', name: 'B', solvedCount: 20 },
    ],
  };

  const result = mergeProblemsetCache(existing, incoming);

  assert.deepEqual(result.summary, {
    newProblemCount: 1,
  });
  assert.deepEqual(result.data.items, [
    { key: '100A', name: 'A', solvedCount: 10 },
    { key: '101A', name: 'B', solvedCount: 20 },
  ]);
});

test('cf fetch writes cache files and prints a concise summary', async () => {
  const env = createTempEnv();
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const apiClient = createApiClient(createFetchPayload());

  const exitCode = await runCli(['fetch', '--handle', 'tourist'], {
    env,
    stdout: stdout.stream,
    stderr: stderr.stream,
    apiClient,
  });

  const cacheDir = path.join(env.CF_COACH_HOME, '.cf-coach', 'cache');

  assert.equal(exitCode, 0);
  assert.equal(stderr.read(), '');
  assert.match(stdout.read(), /fetch 完成：新提交 2，新增 AC 1，rating 更新 1，新增题目 2。/);
  assert.equal(fs.existsSync(path.join(cacheDir, 'user.json')), true);
  assert.equal(fs.existsSync(path.join(cacheDir, 'submissions.json')), true);
  assert.equal(fs.existsSync(path.join(cacheDir, 'rating.json')), true);
  assert.equal(fs.existsSync(path.join(cacheDir, 'problems.json')), true);
});

test('cf fetch reuses cache and reports only incremental updates', async () => {
  const env = createTempEnv();
  const firstStdout = createBufferStream();

  await runCli(['fetch', '--handle', 'tourist'], {
    env,
    stdout: firstStdout.stream,
    stderr: createBufferStream().stream,
    apiClient: createApiClient(createFetchPayload()),
  });

  const secondStdout = createBufferStream();
  const secondPayload = createFetchPayload({
    submissions: {
      items: [
        {
          id: 1,
          creationTimeSeconds: 100,
          verdict: 'OK',
          problemKey: '100A',
          problem: { key: '100A', name: 'A' },
        },
        {
          id: 2,
          creationTimeSeconds: 200,
          verdict: 'WRONG_ANSWER',
          problemKey: '101A',
          problem: { key: '101A', name: 'B' },
        },
        {
          id: 3,
          creationTimeSeconds: 300,
          verdict: 'OK',
          problemKey: '101A',
          problem: { key: '101A', name: 'B' },
        },
      ],
    },
    rating: {
      items: [
        {
          contestId: 1,
          ratingUpdateTimeSeconds: 1000,
          oldRating: 3700,
          newRating: 3750,
        },
        {
          contestId: 2,
          ratingUpdateTimeSeconds: 2000,
          oldRating: 3750,
          newRating: 3780,
        },
      ],
    },
    problems: {
      items: [
        { key: '100A', name: 'A', solvedCount: 10 },
        { key: '101A', name: 'B', solvedCount: 20 },
        { key: '102A', name: 'C', solvedCount: 30 },
      ],
    },
  });

  const exitCode = await runCli(['fetch', '--handle', 'tourist'], {
    env,
    stdout: secondStdout.stream,
    stderr: createBufferStream().stream,
    apiClient: createApiClient(secondPayload),
  });

  const submissionsCache = JSON.parse(
    fs.readFileSync(path.join(env.CF_COACH_HOME, '.cf-coach', 'cache', 'submissions.json'), 'utf8')
  );

  assert.equal(exitCode, 0);
  assert.match(secondStdout.read(), /fetch 完成：新提交 1，新增 AC 1，rating 更新 1，新增题目 1。/);
  assert.equal(submissionsCache.items.length, 3);
});

test('cf fetch preserves existing cache when a timeout error occurs', async () => {
  const env = createTempEnv();
  const cacheDir = path.join(env.CF_COACH_HOME, '.cf-coach', 'cache');

  await runCli(['fetch', '--handle', 'tourist'], {
    env,
    stdout: createBufferStream().stream,
    stderr: createBufferStream().stream,
    apiClient: createApiClient(createFetchPayload()),
  });

  const submissionsPath = path.join(cacheDir, 'submissions.json');
  const originalContent = fs.readFileSync(submissionsPath, 'utf8');
  const stderr = createBufferStream();

  const exitCode = await runCli(['fetch', '--handle', 'tourist'], {
    env,
    stdout: createBufferStream().stream,
    stderr: stderr.stream,
    apiClient: {
      fetchUserInfo: async () => {
        throw new Error('请求 Codeforces API 超时（user.info）');
      },
      fetchUserStatus: async () => createFetchPayload().submissions,
      fetchUserRating: async () => createFetchPayload().rating,
      fetchProblemsetProblems: async () => createFetchPayload().problems,
    },
  });

  assert.equal(exitCode, 1);
  assert.match(stderr.read(), /请求 Codeforces API 超时（user.info）/);
  assert.equal(fs.readFileSync(submissionsPath, 'utf8'), originalContent);
});

test('cf fetch recovers from malformed local cache files', async () => {
  const env = createTempEnv();
  const cacheDir = path.join(env.CF_COACH_HOME, '.cf-coach', 'cache');

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'submissions.json'), '{broken json', 'utf8');

  const stdout = createBufferStream();
  const exitCode = await runCli(['fetch', '--handle', 'tourist'], {
    env,
    stdout: stdout.stream,
    stderr: createBufferStream().stream,
    apiClient: createApiClient(createFetchPayload()),
  });

  const repairedCache = JSON.parse(
    fs.readFileSync(path.join(cacheDir, 'submissions.json'), 'utf8')
  );

  assert.equal(exitCode, 0);
  assert.match(stdout.read(), /fetch 完成：新提交 2，新增 AC 1，rating 更新 1，新增题目 2。/);
  assert.equal(repairedCache.items.length, 2);
});
