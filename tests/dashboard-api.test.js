const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createDashboardServer } = require('../src/dashboard-server');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function request(port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

function createReviewPayload(type) {
  if (type === 'A') {
    return {
      type,
      syntaxName: 'lower_bound',
      usageNote: 'Returns the first iterator >= value.',
    };
  }

  if (type === 'B') {
    return {
      type,
      problemContext: 'CF 1735C — LCM + grouping',
      strategy: 'Think DSU and greedily merge by lexicographic order.',
    };
  }

  if (type === 'C') {
    return {
      type,
      pitfall: 'Array out of bounds in DSU find.',
      prevention: 'Write asserts before the first full submission.',
    };
  }

  return {
    type,
    problemType: 'Interval merge',
    snippet: 'Sort by left endpoint, then merge overlaps.',
  };
}

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

function createFixtureCaches() {
  const submissions = [
    makeSubmission({ id: 1, problemKey: '100A', name: 'Sort Warmup', rating: 800, tags: ['sortings'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 1000 }),
    makeSubmission({ id: 2, problemKey: '100A', name: 'Sort Warmup', rating: 800, tags: ['sortings'], verdict: 'OK', creationTimeSeconds: 1010 }),
    makeSubmission({ id: 3, problemKey: '101B', name: 'Sort Practice', rating: 900, tags: ['sortings'], verdict: 'OK', creationTimeSeconds: 1020 }),
    makeSubmission({ id: 4, problemKey: '102B', name: 'Greedy Basics', rating: 950, tags: ['greedy'], verdict: 'OK', creationTimeSeconds: 1030 }),
    makeSubmission({ id: 5, problemKey: '201A', name: 'Binary One', rating: 1200, tags: ['binary search'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 1040 }),
    makeSubmission({ id: 6, problemKey: '202A', name: 'Binary Two', rating: 1230, tags: ['binary search'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 1050 }),
    makeSubmission({ id: 7, problemKey: '203A', name: 'Binary Three', rating: 1260, tags: ['binary search'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 1060 }),
    makeSubmission({ id: 8, problemKey: '204A', name: 'Binary Four', rating: 1290, tags: ['binary search'], verdict: 'WRONG_ANSWER', creationTimeSeconds: 1070 }),
  ];

  const problems = [
    makeProblem('100A', 'Sort Warmup', 800, ['sortings']),
    makeProblem('101B', 'Sort Practice', 900, ['sortings']),
    makeProblem('102B', 'Greedy Basics', 950, ['greedy']),
    makeProblem('201A', 'Binary One', 1200, ['binary search']),
    makeProblem('202A', 'Binary Two', 1230, ['binary search']),
    makeProblem('203A', 'Binary Three', 1260, ['binary search']),
    makeProblem('204A', 'Binary Four', 1290, ['binary search']),
    makeProblem('300B', 'Greedy Combo 1', 1190, ['greedy', 'sortings']),
    makeProblem('310B', 'Greedy Combo 2', 1290, ['greedy', 'sortings']),
    makeProblem('320B', 'Greedy Combo 3', 1390, ['greedy', 'sortings']),
    makeProblem('400A', 'Greedy Single Anchor', 1450, ['greedy']),
    makeProblem('401B', 'Greedy Combo Anchor', 1440, ['greedy', 'sortings']),
  ];

  return {
    user: {
      handle: 'demo',
      rating: 1000,
      maxRating: 1200,
      rank: 'pupil',
    },
    submissions: {
      handle: 'demo',
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: submissions,
    },
    rating: {
      handle: 'demo',
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: [
        { contestId: 1, contestName: 'Round 1', ratingUpdateTimeSeconds: 100, oldRating: 900, newRating: 950 },
        { contestId: 2, contestName: 'Round 2', ratingUpdateTimeSeconds: 200, oldRating: 950, newRating: 1000 },
      ],
    },
    problems: {
      fetchedAt: '2026-03-18T10:00:00.000Z',
      items: problems,
    },
  };
}

function createFixtureHome(options = {}) {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-coach-dashboard-'));
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');
  const caches = createFixtureCaches();

  if (options.includeUser !== false) {
    writeJson(path.join(cacheDir, 'user.json'), caches.user);
  }

  if (options.includeSubmissions !== false) {
    writeJson(path.join(cacheDir, 'submissions.json'), options.submissionsValue || caches.submissions);
  }

  if (options.includeRating !== false) {
    if (options.malformedRating) {
      writeText(path.join(cacheDir, 'rating.json'), '{broken json');
    } else {
      writeJson(path.join(cacheDir, 'rating.json'), caches.rating);
    }
  }

  if (options.includeProblems !== false) {
    writeJson(path.join(cacheDir, 'problems.json'), caches.problems);
  }

  return {
    homeDir,
    env: {
      CF_COACH_HOME: homeDir,
    },
  };
}

async function withServer(options, callback) {
  const serverOptions = options && options.env ? options : { env: options };
  const serverRef = createDashboardServer(serverOptions);
  const port = await serverRef.listen(0);

  try {
    await callback(port);
  } finally {
    await serverRef.close();
  }
}

test('GET /api/profile returns the normalized profile summary', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/profile');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      handle: 'demo',
      rating: 1000,
      maxRating: 1200,
      rank: 'pupil',
      totalAcceptedCount: 3,
      totalSubmissionsCount: 8,
      totalAttemptedProblems: 7,
    });
  });
});

test('GET /api/rating-history returns one rating record per contest in time order', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/rating-history');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      items: [
        { contestName: 'Round 1', timestamp: 100, oldRating: 900, newRating: 950, delta: 50 },
        { contestName: 'Round 2', timestamp: 200, oldRating: 950, newRating: 1000, delta: 50 },
      ],
    });
  });
});

test('GET /api/tag-stats returns per-tag accepted, attempted, and acceptance rate fields', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/tag-stats');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      items: [
        { tag: 'binary search', acceptedCount: 0, attemptedCount: 4, acceptanceRate: 0 },
        { tag: 'sortings', acceptedCount: 2, attemptedCount: 2, acceptanceRate: 1 },
        { tag: 'greedy', acceptedCount: 1, attemptedCount: 1, acceptanceRate: 1 },
      ],
    });
  });
});

test('GET /api/rating-buckets returns accepted counts including the 1600+ bucket', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/rating-buckets');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      items: [
        { bucket: '800', acceptedCount: 1 },
        { bucket: '900', acceptedCount: 2 },
        { bucket: '1000', acceptedCount: 0 },
        { bucket: '1100', acceptedCount: 0 },
        { bucket: '1200', acceptedCount: 0 },
        { bucket: '1300', acceptedCount: 0 },
        { bucket: '1400', acceptedCount: 0 },
        { bucket: '1500', acceptedCount: 0 },
        { bucket: '1600+', acceptedCount: 0 },
      ],
    });
  });
});

test('GET /api/roadmap returns 20 ordered stages with progress and current-stage marker', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/roadmap');
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.items.length, 20);
    assert.deepEqual(payload.items[0], {
      stageId: 1,
      stageName: '排序 + 贪心',
      tag: 'sortings, greedy',
      acceptedProgress: 3,
      target: 8,
      isCurrentStage: true,
    });
    assert.deepEqual(payload.items[19], {
      stageId: 20,
      stageName: '综合提高',
      tag: 'dp, graphs, data structures, greedy',
      acceptedProgress: 0,
      target: 8,
      isCurrentStage: false,
    });
  });
});

test('GET /api/weak returns tag gaps, rating weak zones, roadmap gaps, and recommendations', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/weak');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      currentStage: {
        id: 1,
        name: '排序 + 贪心',
      },
      tagGaps: [
        { tag: 'binary search', acceptedCount: 0, attemptedCount: 4, acceptanceRate: 0 },
      ],
      ratingWeakZones: [
        {
          bucket: '1200',
          label: '1200-1299',
          acceptedCount: 0,
          problemCount: 4,
          submissionCount: 4,
          failedSubmissionCount: 4,
          acceptanceRate: 0,
        },
      ],
      roadmapGaps: [
        { stageId: 1, stageName: '排序 + 贪心', tag: 'greedy', acceptedProgress: 1, target: 4, missingCount: 3 },
        { stageId: 1, stageName: '排序 + 贪心', tag: 'sortings', acceptedProgress: 2, target: 4, missingCount: 2 },
      ],
      recommendations: [
        { type: 'roadmap', text: '补当前阶段主题 greedy：第 1 阶段目标 4 题，当前仅 1 题。' },
        { type: 'roadmap', text: '补当前阶段主题 sortings：第 1 阶段目标 4 题，当前仅 2 题。' },
        { type: 'tag', text: '强化 tag binary search：尝试 4 题，仅 AC 0 题，通过率 0%。' },
        { type: 'rating', text: '回补 1200-1299 分档：累计提交 4 次，完成 0/4 题，转换率 0%。' },
      ],
    });
  });
});

test('GET /api/next returns the current topic, stage progress, anchor, and prerequisites with links', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/next');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      currentTopic: 'greedy',
      stage: {
        id: 1,
        name: '排序 + 贪心',
      },
      stageProgress: {
        accepted: 1,
        target: 4,
        missing: 3,
      },
      anchor: {
        problemId: '401B',
        title: 'Greedy Combo Anchor',
        rating: 1440,
        tags: ['greedy', 'sortings'],
        link: 'https://codeforces.com/problemset/problem/401/B',
      },
      prerequisites: [
        {
          problemId: '300B',
          title: 'Greedy Combo 1',
          rating: 1190,
          tags: ['greedy', 'sortings'],
          link: 'https://codeforces.com/problemset/problem/300/B',
        },
        {
          problemId: '310B',
          title: 'Greedy Combo 2',
          rating: 1290,
          tags: ['greedy', 'sortings'],
          link: 'https://codeforces.com/problemset/problem/310/B',
        },
        {
          problemId: '320B',
          title: 'Greedy Combo 3',
          rating: 1390,
          tags: ['greedy', 'sortings'],
          link: 'https://codeforces.com/problemset/problem/320/B',
        },
      ],
    });
  });
});

test('GET /api/submissions returns normalized full submission records', async () => {
  const fixture = createFixtureHome();

  await withServer(fixture.env, async (port) => {
    const response = await request(port, '/api/submissions');
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.items.length, 8);
    assert.deepEqual(payload.items[0], {
      timestamp: 1000,
      rating: 800,
      verdict: 'WRONG_ANSWER',
      problemId: '100A',
      title: 'Sort Warmup',
      tags: ['sortings'],
    });
    assert.deepEqual(payload.items[7], {
      timestamp: 1070,
      rating: 1290,
      verdict: 'WRONG_ANSWER',
      problemId: '204A',
      title: 'Binary Four',
      tags: ['binary search'],
    });
  });
});

test('POST /api/review creates valid A/B/C/D review items and persists them to review.json', async () => {
  const fixture = createFixtureHome();
  const fixedNow = '2026-03-19T15:00:00.000Z';

  await withServer({ env: fixture.env, now: fixedNow }, async (port) => {
    for (const type of ['A', 'B', 'C', 'D']) {
      const response = await request(port, '/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createReviewPayload(type)),
      });
      const payload = JSON.parse(response.body);

      assert.equal(response.statusCode, 201);
      assert.equal(payload.item.type, type);
      assert.equal(payload.item.stage, 0);
      assert.equal(payload.item.completed, false);
      assert.equal(payload.item.nextReviewDate, '2026-03-20');
      assert.equal(payload.item.createdAt, fixedNow);
      assert.match(payload.item.id, /^r_1773932400000(?:_\d+)?$/);
      assert.match(payload.item.content, /—/);
    }

    const savedItems = JSON.parse(
      fs.readFileSync(path.join(fixture.homeDir, '.cf-coach', 'review.json'), 'utf8')
    );

    assert.equal(savedItems.length, 4);
    assert.deepEqual(savedItems.map((item) => item.type), ['A', 'B', 'C', 'D']);
    assert.deepEqual(savedItems.map((item) => item.stage), [0, 0, 0, 0]);
    assert.deepEqual(savedItems.map((item) => item.completed), [false, false, false, false]);
    assert.deepEqual(savedItems.map((item) => item.nextReviewDate), [
      '2026-03-20',
      '2026-03-20',
      '2026-03-20',
      '2026-03-20',
    ]);
  });
});

test('POST /api/review rejects unknown types, empty fields, and mismatched fixed-format payloads', async () => {
  const fixture = createFixtureHome();

  await withServer({ env: fixture.env, now: '2026-03-19T15:00:00.000Z' }, async (port) => {
    const invalidRequests = [
      {
        body: { type: 'Z', syntaxName: 'lower_bound', usageNote: 'note' },
        message: 'type must be A, B, C, or D.',
      },
      {
        body: { type: 'A', syntaxName: '   ', usageNote: 'note' },
        message: 'Syntax name is required.',
      },
      {
        body: { type: 'B', content: 'already flattened' },
        message: 'Unexpected review payload field: content.',
      },
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await request(port, '/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest.body),
      });
      const payload = JSON.parse(response.body);

      assert.equal(response.statusCode, 400);
      assert.equal(payload.error.code, 'INVALID_REVIEW_PAYLOAD');
      assert.equal(payload.error.message, invalidRequest.message);
    }

    const savedItems = JSON.parse(
      fs.readFileSync(path.join(fixture.homeDir, '.cf-coach', 'review.json'), 'utf8')
    );

    assert.deepEqual(savedItems, []);
  });
});

test('dashboard APIs return JSON errors for missing or malformed cache files and stay stable on partial data', async () => {
  const missingFixture = createFixtureHome({
    includeUser: false,
    includeSubmissions: false,
    includeRating: false,
    includeProblems: false,
  });

  await withServer(missingFixture.env, async (port) => {
    const missingProfile = await request(port, '/api/profile');

    assert.equal(missingProfile.statusCode, 404);
    assert.deepEqual(JSON.parse(missingProfile.body), {
      error: {
        code: 'CACHE_MISSING',
        message: 'Required local cache data is missing.',
        details: {
          cache: {
            user: 'missing',
            submissions: 'missing',
            rating: 'missing',
          },
        },
      },
    });
  });

  const malformedFixture = createFixtureHome({ malformedRating: true });

  await withServer(malformedFixture.env, async (port) => {
    const malformedRating = await request(port, '/api/rating-history');

    assert.equal(malformedRating.statusCode, 500);
    assert.deepEqual(JSON.parse(malformedRating.body), {
      error: {
        code: 'CACHE_MALFORMED',
        message: 'One or more local cache files are malformed.',
        details: {
          cache: {
            rating: 'malformed',
          },
          files: ['rating'],
        },
      },
    });
  });

  const partialFixture = createFixtureHome({
    includeUser: false,
    includeRating: false,
  });

  await withServer(partialFixture.env, async (port) => {
    const partialProfile = await request(port, '/api/profile');
    const partialNext = await request(port, '/api/next');

    assert.equal(partialProfile.statusCode, 200);
    assert.deepEqual(JSON.parse(partialProfile.body), {
      handle: 'demo',
      rating: null,
      maxRating: null,
      rank: 'unrated',
      totalAcceptedCount: 3,
      totalSubmissionsCount: 8,
      totalAttemptedProblems: 7,
    });
    assert.equal(partialNext.statusCode, 200);
  });
});

test('dashboard data layer does not invoke remote fetch paths while serving API routes', async () => {
  const fixture = createFixtureHome();
  const originalFetch = global.fetch;
  let fetchCalled = false;

  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('network access is not allowed in dashboard API tests');
  };

  try {
    await withServer(fixture.env, async (port) => {
      const routes = [
        '/api/profile',
        '/api/rating-history',
        '/api/tag-stats',
        '/api/rating-buckets',
        '/api/roadmap',
        '/api/weak',
        '/api/next',
        '/api/submissions',
      ];

      for (const route of routes) {
        const response = await request(port, route);
        assert.notEqual(response.statusCode, 500);
      }
    });
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(fetchCalled, false);
});
