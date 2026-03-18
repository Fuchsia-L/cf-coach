const https = require('https');

const API_ORIGIN = 'https://codeforces.com/api';
const DEFAULT_THROTTLE_MS = 2000;
const DEFAULT_TIMEOUT_MS = 10000;

function buildApiUrl(method, params = {}) {
  const url = new URL(`${API_ORIGIN}/${method}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function normalizeApiSuccess(method, payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Codeforces API 响应格式错误（${method}）`);
  }

  if (payload.status !== 'OK') {
    const comment = payload.comment ? `：${payload.comment}` : '';
    throw new Error(`Codeforces API 错误（${method}）${comment}`);
  }

  return payload.result;
}

function getProblemKey(problem = {}) {
  if (problem.contestId !== undefined && problem.index) {
    return `${problem.contestId}${problem.index}`;
  }

  if (problem.problemsetName && problem.index) {
    return `${problem.problemsetName}:${problem.index}`;
  }

  return problem.name || 'unknown-problem';
}

function normalizeProblem(problem = {}) {
  return {
    key: getProblemKey(problem),
    contestId: problem.contestId ?? null,
    problemsetName: problem.problemsetName ?? null,
    index: problem.index ?? null,
    name: problem.name ?? null,
    type: problem.type ?? null,
    points: problem.points ?? null,
    rating: problem.rating ?? null,
    tags: Array.isArray(problem.tags) ? problem.tags.slice() : [],
  };
}

function normalizeUserInfoResponse(payload) {
  const result = normalizeApiSuccess('user.info', payload);

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error('Codeforces API 响应格式错误（user.info）');
  }

  const user = result[0];

  return {
    handle: user.handle,
    rank: user.rank ?? null,
    rating: user.rating ?? null,
    maxRank: user.maxRank ?? null,
    maxRating: user.maxRating ?? null,
    avatar: user.avatar ?? null,
    titlePhoto: user.titlePhoto ?? null,
    country: user.country ?? null,
    city: user.city ?? null,
    organization: user.organization ?? null,
    contribution: user.contribution ?? 0,
    friendOfCount: user.friendOfCount ?? 0,
    lastOnlineTimeSeconds: user.lastOnlineTimeSeconds ?? null,
    registrationTimeSeconds: user.registrationTimeSeconds ?? null,
  };
}

function normalizeUserStatusResponse(payload) {
  const result = normalizeApiSuccess('user.status', payload);

  if (!Array.isArray(result)) {
    throw new Error('Codeforces API 响应格式错误（user.status）');
  }

  return {
    items: result.map((submission) => ({
      id: submission.id,
      contestId: submission.contestId ?? null,
      creationTimeSeconds: submission.creationTimeSeconds ?? null,
      relativeTimeSeconds: submission.relativeTimeSeconds ?? null,
      programmingLanguage: submission.programmingLanguage ?? null,
      verdict: submission.verdict ?? null,
      testset: submission.testset ?? null,
      passedTestCount: submission.passedTestCount ?? 0,
      timeConsumedMillis: submission.timeConsumedMillis ?? 0,
      memoryConsumedBytes: submission.memoryConsumedBytes ?? 0,
      authorMembers: Array.isArray(submission.author?.members)
        ? submission.author.members.map((member) => ({
          handle: member.handle,
        }))
        : [],
      problem: normalizeProblem(submission.problem),
      problemKey: getProblemKey(submission.problem),
    })),
  };
}

function normalizeUserRatingResponse(payload) {
  const result = normalizeApiSuccess('user.rating', payload);

  if (!Array.isArray(result)) {
    throw new Error('Codeforces API 响应格式错误（user.rating）');
  }

  return {
    items: result.map((entry) => ({
      contestId: entry.contestId ?? null,
      contestName: entry.contestName ?? null,
      handle: entry.handle ?? null,
      rank: entry.rank ?? null,
      ratingUpdateTimeSeconds: entry.ratingUpdateTimeSeconds ?? null,
      oldRating: entry.oldRating ?? null,
      newRating: entry.newRating ?? null,
    })),
  };
}

function normalizeProblemsetProblemsResponse(payload) {
  const result = normalizeApiSuccess('problemset.problems', payload);

  if (!result || !Array.isArray(result.problems) || !Array.isArray(result.problemStatistics)) {
    throw new Error('Codeforces API 响应格式错误（problemset.problems）');
  }

  const statisticsByKey = new Map(
    result.problemStatistics.map((statistic) => [
      getProblemKey(statistic),
      statistic.solvedCount ?? 0,
    ])
  );

  return {
    items: result.problems.map((problem) => {
      const normalizedProblem = normalizeProblem(problem);

      return {
        ...normalizedProblem,
        solvedCount: statisticsByKey.get(normalizedProblem.key) ?? 0,
      };
    }),
  };
}

function createThrottle({
  intervalMs = DEFAULT_THROTTLE_MS,
  now = () => Date.now(),
  sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
} = {}) {
  let nextAvailableAt = 0;

  return {
    async wait() {
      const currentTime = now();
      const scheduledTime = Math.max(currentTime, nextAvailableAt);
      const delayMs = scheduledTime - currentTime;

      nextAvailableAt = scheduledTime + intervalMs;

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    },
  };
}

function createHttpsRequester({
  httpsModule = https,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return function requestJson(url, method) {
    return new Promise((resolve, reject) => {
      const request = httpsModule.get(url, (response) => {
        const chunks = [];

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const body = chunks.join('');

          if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
            reject(new Error(`Codeforces API 请求失败（${method}）：HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Codeforces API 响应格式错误（${method}）`));
          }
        });
      });

      request.setTimeout(timeoutMs, () => {
        request.destroy(new Error(`请求 Codeforces API 超时（${method}）`));
      });

      request.on('error', (error) => {
        if (error.message.startsWith('请求 Codeforces API 超时')) {
          reject(error);
          return;
        }

        reject(new Error(`请求 Codeforces API 失败（${method}）：${error.message}`));
      });
    });
  };
}

function withMetadata(data, metadata) {
  return {
    ...data,
    ...metadata,
  };
}

function createCodeforcesApiClient({
  requester = createHttpsRequester(),
  throttle = createThrottle(),
  now = () => new Date().toISOString(),
} = {}) {
  async function fetchAndNormalize(method, params, normalize) {
    await throttle.wait();

    const payload = await requester(buildApiUrl(method, params), method);

    return withMetadata(normalize(payload), {
      fetchedAt: now(),
    });
  }

  return {
    buildApiUrl,
    fetchUserInfo(handle) {
      return fetchAndNormalize('user.info', { handles: handle }, (payload) => withMetadata(
        normalizeUserInfoResponse(payload),
        { handle }
      ));
    },
    fetchUserStatus(handle) {
      return fetchAndNormalize('user.status', { handle }, (payload) => withMetadata(
        normalizeUserStatusResponse(payload),
        { handle }
      ));
    },
    fetchUserRating(handle) {
      return fetchAndNormalize('user.rating', { handle }, (payload) => withMetadata(
        normalizeUserRatingResponse(payload),
        { handle }
      ));
    },
    fetchProblemsetProblems() {
      return fetchAndNormalize('problemset.problems', {}, normalizeProblemsetProblemsResponse);
    },
  };
}

module.exports = {
  API_ORIGIN,
  DEFAULT_THROTTLE_MS,
  buildApiUrl,
  createCodeforcesApiClient,
  createHttpsRequester,
  createThrottle,
  getProblemKey,
  normalizeProblemsetProblemsResponse,
  normalizeUserInfoResponse,
  normalizeUserRatingResponse,
  normalizeUserStatusResponse,
};
