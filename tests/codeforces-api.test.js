const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

const {
  createCodeforcesApiClient,
  createHttpsRequester,
  createThrottle,
  normalizeProblemsetProblemsResponse,
  normalizeUserInfoResponse,
  normalizeUserRatingResponse,
  normalizeUserStatusResponse,
} = require('../src/codeforces-api');

function createImmediateThrottle() {
  return {
    wait: async () => {},
  };
}

test('fetchUserInfo builds the correct API URL', async () => {
  let request;
  const client = createCodeforcesApiClient({
    requester: async (url, method) => {
      request = { url, method };
      return {
        status: 'OK',
        result: [{ handle: 'tourist' }],
      };
    },
    throttle: createImmediateThrottle(),
    now: () => '2026-03-18T00:00:00.000Z',
  });

  await client.fetchUserInfo('tourist');

  assert.deepEqual(request, {
    url: 'https://codeforces.com/api/user.info?handles=tourist',
    method: 'user.info',
  });
});

test('fetchUserStatus builds the correct API URL', async () => {
  let request;
  const client = createCodeforcesApiClient({
    requester: async (url, method) => {
      request = { url, method };
      return {
        status: 'OK',
        result: [],
      };
    },
    throttle: createImmediateThrottle(),
    now: () => '2026-03-18T00:00:00.000Z',
  });

  await client.fetchUserStatus('tourist');

  assert.deepEqual(request, {
    url: 'https://codeforces.com/api/user.status?handle=tourist',
    method: 'user.status',
  });
});

test('fetchUserRating builds the correct API URL', async () => {
  let request;
  const client = createCodeforcesApiClient({
    requester: async (url, method) => {
      request = { url, method };
      return {
        status: 'OK',
        result: [],
      };
    },
    throttle: createImmediateThrottle(),
    now: () => '2026-03-18T00:00:00.000Z',
  });

  await client.fetchUserRating('tourist');

  assert.deepEqual(request, {
    url: 'https://codeforces.com/api/user.rating?handle=tourist',
    method: 'user.rating',
  });
});

test('fetchProblemsetProblems builds the correct API URL', async () => {
  let request;
  const client = createCodeforcesApiClient({
    requester: async (url, method) => {
      request = { url, method };
      return {
        status: 'OK',
        result: {
          problems: [],
          problemStatistics: [],
        },
      };
    },
    throttle: createImmediateThrottle(),
    now: () => '2026-03-18T00:00:00.000Z',
  });

  await client.fetchProblemsetProblems();

  assert.deepEqual(request, {
    url: 'https://codeforces.com/api/problemset.problems',
    method: 'problemset.problems',
  });
});

test('normalizeUserInfoResponse reshapes user payload', () => {
  const normalized = normalizeUserInfoResponse({
    status: 'OK',
    result: [{
      handle: 'tourist',
      rank: 'legendary grandmaster',
      rating: 3850,
      maxRank: 'legendary grandmaster',
      maxRating: 3850,
      contribution: 171,
      friendOfCount: 999,
    }],
  });

  assert.deepEqual(normalized, {
    handle: 'tourist',
    rank: 'legendary grandmaster',
    rating: 3850,
    maxRank: 'legendary grandmaster',
    maxRating: 3850,
    avatar: null,
    titlePhoto: null,
    country: null,
    city: null,
    organization: null,
    contribution: 171,
    friendOfCount: 999,
    lastOnlineTimeSeconds: null,
    registrationTimeSeconds: null,
  });
});

test('normalizeUserStatusResponse reshapes submissions payload', () => {
  const normalized = normalizeUserStatusResponse({
    status: 'OK',
    result: [{
      id: 1,
      contestId: 100,
      creationTimeSeconds: 123,
      verdict: 'OK',
      programmingLanguage: 'GNU C++20',
      passedTestCount: 10,
      timeConsumedMillis: 31,
      memoryConsumedBytes: 1024,
      author: {
        members: [{ handle: 'tourist' }],
      },
      problem: {
        contestId: 100,
        index: 'A',
        name: 'Example',
        type: 'PROGRAMMING',
        rating: 800,
        tags: ['math'],
      },
    }],
  });

  assert.deepEqual(normalized, {
    items: [{
      id: 1,
      contestId: 100,
      creationTimeSeconds: 123,
      relativeTimeSeconds: null,
      programmingLanguage: 'GNU C++20',
      verdict: 'OK',
      testset: null,
      passedTestCount: 10,
      timeConsumedMillis: 31,
      memoryConsumedBytes: 1024,
      authorMembers: [{ handle: 'tourist' }],
      problem: {
        key: '100A',
        contestId: 100,
        problemsetName: null,
        index: 'A',
        name: 'Example',
        type: 'PROGRAMMING',
        points: null,
        rating: 800,
        tags: ['math'],
      },
      problemKey: '100A',
    }],
  });
});

test('normalizeUserRatingResponse reshapes rating history payload', () => {
  const normalized = normalizeUserRatingResponse({
    status: 'OK',
    result: [{
      contestId: 10,
      contestName: 'Round 10',
      handle: 'tourist',
      rank: 3,
      ratingUpdateTimeSeconds: 500,
      oldRating: 3600,
      newRating: 3620,
    }],
  });

  assert.deepEqual(normalized, {
    items: [{
      contestId: 10,
      contestName: 'Round 10',
      handle: 'tourist',
      rank: 3,
      ratingUpdateTimeSeconds: 500,
      oldRating: 3600,
      newRating: 3620,
    }],
  });
});

test('normalizeProblemsetProblemsResponse reshapes problemset payload', () => {
  const normalized = normalizeProblemsetProblemsResponse({
    status: 'OK',
    result: {
      problems: [{
        contestId: 100,
        index: 'A',
        name: 'Example',
        type: 'PROGRAMMING',
        rating: 800,
        tags: ['math'],
      }],
      problemStatistics: [{
        contestId: 100,
        index: 'A',
        solvedCount: 12345,
      }],
    },
  });

  assert.deepEqual(normalized, {
    items: [{
      key: '100A',
      contestId: 100,
      problemsetName: null,
      index: 'A',
      name: 'Example',
      type: 'PROGRAMMING',
      points: null,
      rating: 800,
      tags: ['math'],
      solvedCount: 12345,
    }],
  });
});

test('createThrottle delays back-to-back calls', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });

  const throttle = createThrottle({ intervalMs: 2000 });

  await throttle.wait();

  let completed = false;
  const pending = throttle.wait().then(() => {
    completed = true;
  });

  await Promise.resolve();
  assert.equal(completed, false);

  t.mock.timers.tick(1999);
  await Promise.resolve();
  assert.equal(completed, false);

  t.mock.timers.tick(1);
  await pending;
  assert.equal(completed, true);
});

test('createThrottle skips waiting after enough time passes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });

  const throttle = createThrottle({ intervalMs: 2000 });

  await throttle.wait();
  t.mock.timers.tick(2500);

  let completed = false;
  const pending = throttle.wait().then(() => {
    completed = true;
  });

  await Promise.resolve();
  await pending;
  assert.equal(completed, true);
});

test('createCodeforcesApiClient surfaces API error payloads clearly', async () => {
  const client = createCodeforcesApiClient({
    requester: async () => ({
      status: 'FAILED',
      comment: 'handles: User with handle missing not found',
    }),
    throttle: createImmediateThrottle(),
  });

  await assert.rejects(
    () => client.fetchUserInfo('missing'),
    /Codeforces API 错误（user.info）：handles: User with handle missing not found/
  );
});

test('createHttpsRequester reports timeouts clearly', async () => {
  const httpsModule = {
    get() {
      const request = new EventEmitter();

      request.setTimeout = (timeoutMs, callback) => {
        setImmediate(callback);
      };
      request.destroy = (error) => {
        setImmediate(() => request.emit('error', error));
      };

      return request;
    },
  };
  const requester = createHttpsRequester({ httpsModule, timeoutMs: 5 });

  await assert.rejects(
    () => requester('https://codeforces.com/api/user.info?handles=tourist', 'user.info'),
    /请求 Codeforces API 超时（user.info）/
  );
});
