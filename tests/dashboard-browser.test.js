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
    getWeak() {
      return {
        statusCode: 200,
        payload: {
          currentStage: { id: 2, name: 'Greedy' },
          tagGaps: [{ tag: 'binary search', acceptedCount: 1, attemptedCount: 4, acceptanceRate: 0.25 }],
          ratingWeakZones: [{ bucket: '1200', label: '1200-1299', acceptedCount: 1, problemCount: 5, acceptanceRate: 0.2 }],
          roadmapGaps: [{ stageId: 2, tag: 'greedy', acceptedProgress: 2, target: 4, missingCount: 2 }],
        },
      };
    },
    getNext() {
      return {
        statusCode: 200,
        payload: {
          currentTopic: 'greedy',
          stage: { id: 2, name: 'Greedy' },
          stageProgress: { accepted: 2, target: 4 },
          anchor: { problemId: '401B', title: 'Greedy Anchor', rating: 1400, tags: ['greedy'], link: 'https://codeforces.com/problemset/problem/401/B' },
          prerequisites: [
            { problemId: '300B', title: 'Pre 1', rating: 1200, tags: ['greedy'], link: 'https://codeforces.com/problemset/problem/300/B' },
            { problemId: '310B', title: 'Pre 2', rating: 1250, tags: ['greedy'], link: 'https://codeforces.com/problemset/problem/310/B' },
            { problemId: '320B', title: 'Pre 3', rating: 1300, tags: ['greedy'], link: 'https://codeforces.com/problemset/problem/320/B' },
          ],
        },
      };
    },
    getSubmissions() {
      return {
        statusCode: 200,
        payload: {
          items: [
            { timestamp: 1000, rating: 800, verdict: 'OK', problemId: '100A', title: 'Sort Warmup', tags: ['sortings'] },
            { timestamp: 1050, rating: 1200, verdict: 'WRONG_ANSWER', problemId: '200A', title: 'Greedy One', tags: ['greedy'] },
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
    const cssResponse = await request(port, '/assets/dashboard.css');
    const scriptResponse = await request(port, '/assets/dashboard.js');

    assert.equal(rootResponse.statusCode, 200);
    assert.equal(cssResponse.statusCode, 200);
    assert.equal(scriptResponse.statusCode, 200);
    assert.match(rootResponse.body, /id="app"/);
    assert.match(rootResponse.body, /\/assets\/dashboard\.css/);
    assert.match(rootResponse.body, /\/assets\/dashboard\.js/);
    assert.match(cssResponse.body, /body\s*\{[\s\S]*font-size:\s*17px;/);
    assert.match(cssResponse.body, /\.dashboard-grid\s*\{[\s\S]*gap:\s*30px;/);
    assert.match(cssResponse.body, /\.panel-body\s*\{[\s\S]*padding:\s*24px 26px 26px;/);
    assert.match(cssResponse.body, /\.panel-kicker,[\s\S]*font-size:\s*13px;/);
    assert.match(cssResponse.body, /\.panel-title,[\s\S]*font-size:\s*30px;/);
    assert.match(cssResponse.body, /\.chart-axis-label\s*\{[\s\S]*font-size:\s*13px;/);
    assert.match(cssResponse.body, /\.trend-area\s*\{[\s\S]*fill:\s*url\(#rating-trend-fill\)/);
    assert.match(cssResponse.body, /\.timeline-point-group:hover \.timeline-point\s*\{[\s\S]*r:\s*9;/);
    assert.match(cssResponse.body, /\.dashboard-tooltip-title\s*\{[\s\S]*font-weight:\s*700;/);
    assert.match(cssResponse.body, /\.panel\[data-dashboard-sticky="profile"\]\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*24px;/);
    assert.match(cssResponse.body, /\.panel:hover\s*\{[\s\S]*transform:\s*translateY\(-3px\);/);
    assert.match(cssResponse.body, /\.problem-card:hover\s*\{[\s\S]*transform:\s*translateY\(-3px\);/);

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
    assert.match(root.innerHTML, /data-dashboard-layout="masonry"/);
    assert.match(root.innerHTML, /data-dashboard-column="primary"/);
    assert.match(root.innerHTML, /data-dashboard-column="secondary"/);
    assert.match(root.innerHTML, /data-panel="profile"/);
    assert.match(root.innerHTML, /class="profile-bar"/);
    assert.match(root.innerHTML, /data-dashboard-sticky="profile"/);
    assert.match(root.innerHTML, /data-panel="rating-trend"/);
    assert.match(root.innerHTML, /data-panel="roadmap"/);
    assert.match(root.innerHTML, /data-panel="tag-ability"/);
    assert.match(root.innerHTML, /data-panel="rating-buckets"/);
    assert.match(root.innerHTML, /data-panel="weak-analysis"/);
    assert.match(root.innerHTML, /data-panel="next-problem"/);
    assert.match(root.innerHTML, /data-panel="submission-timeline"/);
    assert.match(root.innerHTML, /panel-title-readable/);
    assert.match(root.innerHTML, /panel-kicker-readable/);
    assert.match(root.innerHTML, /chart-axis-label/);
    assert.match(root.innerHTML, /<linearGradient id="rating-trend-fill"/);
    assert.match(root.innerHTML, /class="trend-area"/);
    assert.match(root.innerHTML, /class="timeline-point"[^>]*r="7"/);
    assert.match(root.innerHTML, /data-tooltip-title="Round 1"/);
    assert.match(root.innerHTML, /data-tooltip-body="Delta \+60"/);
    assert.match(root.innerHTML, /data-tooltip-title="Sort Warmup"/);
    assert.match(root.innerHTML, /dashboard-tooltip-layer/);
    assert.doesNotMatch(root.innerHTML, /<title>/);
    assert.match(root.innerHTML, /Round 1/);
    assert.match(root.innerHTML, /Show all 20 stages/);
    assert.match(root.innerHTML, /Stage 1/);
    assert.match(root.innerHTML, /Stage 5/);
    assert.doesNotMatch(root.innerHTML, /Stage 20/);
  } finally {
    await serverRef.close();
  }
});
