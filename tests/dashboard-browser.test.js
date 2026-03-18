const http = require('http');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');

const { createDashboardServer } = require('../src/dashboard-server');

function request(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method: 'GET',
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
    req.end();
  });
}

function createSmokeDataLayer() {
  return {
    getProfile() {
      return {
        statusCode: 200,
        payload: {
          handle: 'demo',
          rating: 1337,
          maxRating: 1400,
          rank: 'pupil',
          totalAcceptedCount: 12,
          totalSubmissionsCount: 45,
          totalAttemptedProblems: 17,
        },
      };
    },
    getRatingHistory() {
      return {
        statusCode: 200,
        payload: {
          items: [
            { contestName: 'Round 1', timestamp: 100, oldRating: 1200, newRating: 1260, delta: 60 },
            { contestName: 'Round 2', timestamp: 190, oldRating: 1260, newRating: 1337, delta: 77 },
          ],
        },
      };
    },
    getRoadmap() {
      return {
        statusCode: 200,
        payload: {
          items: Array.from({ length: 20 }, (_, index) => ({
            stageId: index + 1,
            stageName: `Stage ${index + 1}`,
            tag: index % 2 === 0 ? 'greedy' : 'binary search',
            acceptedProgress: index === 0 ? 4 : index === 1 ? 2 : 0,
            target: 4,
            isCurrentStage: index === 1,
          })),
        },
      };
    },
    getTagStats() {
      return {
        statusCode: 200,
        payload: {
          items: [
            { tag: 'greedy', acceptedCount: 3, attemptedCount: 5, acceptanceRate: 0.6 },
            { tag: 'binary search', acceptedCount: 1, attemptedCount: 4, acceptanceRate: 0.25 },
          ],
        },
      };
    },
    getRatingBuckets() {
      return {
        statusCode: 200,
        payload: {
          items: [
            { bucket: '800', acceptedCount: 1 },
            { bucket: '900', acceptedCount: 2 },
            { bucket: '1000', acceptedCount: 0 },
            { bucket: '1100', acceptedCount: 0 },
            { bucket: '1200', acceptedCount: 1 },
            { bucket: '1300', acceptedCount: 1 },
            { bucket: '1400', acceptedCount: 0 },
            { bucket: '1500', acceptedCount: 0 },
            { bucket: '1600+', acceptedCount: 0 },
          ],
        },
      };
    },
  };
}

test('dashboard browser smoke test loads the page and renders all core panels from API fixtures', async () => {
  const serverRef = createDashboardServer({ dataLayer: createSmokeDataLayer() });
  const port = await serverRef.listen(0);

  try {
    const rootResponse = await request(port, '/');
    const scriptResponse = await request(port, '/assets/dashboard.js');

    assert.equal(rootResponse.statusCode, 200);
    assert.equal(scriptResponse.statusCode, 200);
    assert.match(rootResponse.body, /id="app"/);
    assert.match(rootResponse.body, /\/assets\/dashboard\.js/);

    const root = {
      attributes: {},
      innerHTML: '',
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      getAttribute(name) {
        return this.attributes[name] || null;
      },
    };

    const context = {
      console,
      Intl,
      Promise,
      setTimeout,
      clearTimeout,
      document: {
        getElementById(id) {
          return id === 'app' ? root : null;
        },
      },
      fetch(requestPath) {
        return fetch(`http://127.0.0.1:${port}${requestPath}`);
      },
    };

    context.globalThis = context;

    vm.runInNewContext(scriptResponse.body, context, { filename: 'dashboard.js' });
    await context.CFCoachDashboard.ready;

    assert.equal(root.getAttribute('data-dashboard-ready'), 'true');
    assert.equal(root.getAttribute('data-dashboard-state'), 'ready');
    assert.match(root.innerHTML, /data-panel="profile"/);
    assert.match(root.innerHTML, /data-panel="rating-trend"/);
    assert.match(root.innerHTML, /data-panel="roadmap"/);
    assert.match(root.innerHTML, /data-panel="tag-ability"/);
    assert.match(root.innerHTML, /data-panel="rating-buckets"/);
    assert.match(root.innerHTML, /Round 1/);
    assert.match(root.innerHTML, /Stage 20/);
  } finally {
    await serverRef.close();
  }
});
