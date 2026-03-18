const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRatingTrendGeometry,
  formatRatingDelta,
  getBucketLabel,
  getCodeforcesRatingColor,
  getRatingBucketColor,
  renderProfileBar,
  renderRatingBucketPanel,
  renderRatingTrendPanel,
  renderRoadmapPanel,
  renderTagAbilityPanel,
  sortTagStats,
} = require('../src/dashboard/dashboard');

test('dashboard helper functions format deltas, colors, buckets, and tag ordering', () => {
  assert.equal(formatRatingDelta({ oldRating: 1200, newRating: 1260 }), '+60');
  assert.equal(formatRatingDelta({ oldRating: 1400, newRating: 1375 }), '-25');
  assert.equal(getCodeforcesRatingColor(1100), '#808080');
  assert.equal(getCodeforcesRatingColor(1300), '#0f9d58');
  assert.equal(getCodeforcesRatingColor(1450), '#03a9f4');
  assert.equal(getCodeforcesRatingColor(1650), '#3f51b5');
  assert.equal(getBucketLabel('1600+'), '1600+');
  assert.equal(getRatingBucketColor('1200'), '#0f9d58');
  assert.equal(getRatingBucketColor('1600+'), '#3f51b5');

  const ordered = sortTagStats([
    { tag: 'dp', acceptedCount: 2, attemptedCount: 5 },
    { tag: 'greedy', acceptedCount: 4, attemptedCount: 4 },
    { tag: 'binary search', acceptedCount: 2, attemptedCount: 6 },
  ]);

  assert.deepEqual(ordered.map((item) => item.tag), ['greedy', 'binary search', 'dp']);
});

test('rating trend geometry uses non-uniform x spacing based on timestamps', () => {
  const geometry = buildRatingTrendGeometry([
    { contestName: 'Round 1', timestamp: 100, oldRating: 900, newRating: 950 },
    { contestName: 'Round 2', timestamp: 140, oldRating: 950, newRating: 980 },
    { contestName: 'Round 3', timestamp: 400, oldRating: 980, newRating: 1100 },
  ], {
    width: 760,
    height: 260,
  });

  assert.equal(geometry.points.length, 3);
  assert.notEqual(geometry.points[1].x - geometry.points[0].x, geometry.points[2].x - geometry.points[1].x);
  assert.match(geometry.polyline, /,/);
});

test('renderProfileBar includes handle, rank, rating, accepted, submissions, and attempted counts', () => {
  const html = renderProfileBar({
    handle: 'demo',
    rank: 'pupil',
    rating: 1337,
    totalAcceptedCount: 12,
    totalSubmissionsCount: 45,
    totalAttemptedProblems: 17,
  });

  assert.match(html, /data-panel="profile"/);
  assert.match(html, />demo</);
  assert.match(html, />Pupil</);
  assert.match(html, />1,337</);
  assert.match(html, /Accepted/);
  assert.match(html, /Submissions/);
  assert.match(html, /Attempted/);
});

test('renderRatingTrendPanel outputs svg line chart with contest tooltip titles', () => {
  const html = renderRatingTrendPanel({
    items: [
      { contestName: 'Round 1', timestamp: 100, oldRating: 900, newRating: 950, delta: 50 },
      { contestName: 'Round 2', timestamp: 250, oldRating: 950, newRating: 1000, delta: 50 },
    ],
  });

  assert.match(html, /data-panel="rating-trend"/);
  assert.match(html, /<svg/);
  assert.match(html, /<polyline/);
  assert.match(html, /<title>Round 1 · \+50<\/title>/);
  assert.match(html, /<title>Round 2 · \+50<\/title>/);
});

test('renderRoadmapPanel applies current, completed, and not-started state classes', () => {
  const html = renderRoadmapPanel({
    items: [
      { stageId: 1, stageName: 'Sorting', tag: 'sortings', acceptedProgress: 4, target: 4, isCurrentStage: false },
      { stageId: 2, stageName: 'Greedy', tag: 'greedy', acceptedProgress: 2, target: 4, isCurrentStage: true },
      { stageId: 3, stageName: 'Binary Search', tag: 'binary search', acceptedProgress: 0, target: 4, isCurrentStage: false },
    ],
  });

  assert.match(html, /roadmap-stage is-complete/);
  assert.match(html, /roadmap-stage is-current/);
  assert.match(html, /roadmap-stage is-not-started/);
  assert.match(html, /Sorting/);
  assert.match(html, /Binary Search/);
});

test('renderTagAbilityPanel sorts tags by accepted count and shows attempted, accepted, and rate labels', () => {
  const html = renderTagAbilityPanel({
    items: [
      { tag: 'dp', acceptedCount: 1, attemptedCount: 4, acceptanceRate: 0.25 },
      { tag: 'greedy', acceptedCount: 3, attemptedCount: 5, acceptanceRate: 0.6 },
      { tag: 'binary search', acceptedCount: 2, attemptedCount: 2, acceptanceRate: 1 },
    ],
  });

  const greedyIndex = html.indexOf('greedy');
  const binaryIndex = html.indexOf('binary search');
  const dpIndex = html.indexOf('dp');

  assert.ok(greedyIndex >= 0);
  assert.ok(binaryIndex > greedyIndex);
  assert.ok(dpIndex > binaryIndex);
  assert.match(html, /Attempted 5/);
  assert.match(html, /Accepted 3/);
  assert.match(html, /60%/);
});

test('renderRatingBucketPanel shows fixed bucket labels and Codeforces-colored bars', () => {
  const html = renderRatingBucketPanel({
    items: [
      { bucket: '800', acceptedCount: 1 },
      { bucket: '900', acceptedCount: 2 },
      { bucket: '1000', acceptedCount: 0 },
      { bucket: '1100', acceptedCount: 0 },
      { bucket: '1200', acceptedCount: 0 },
      { bucket: '1300', acceptedCount: 0 },
      { bucket: '1400', acceptedCount: 0 },
      { bucket: '1500', acceptedCount: 0 },
      { bucket: '1600+', acceptedCount: 4 },
    ],
  });

  assert.match(html, /data-panel="rating-buckets"/);
  assert.match(html, /data-bucket-label="1600\+"/);
  assert.match(html, /background:#3f51b5/);
});
