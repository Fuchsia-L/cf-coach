const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COLLAPSIBLE_PANEL_NAMES,
  ROADMAP_VISIBLE_STAGE_COUNT,
  TAG_ABILITY_VISIBLE_COUNT,
  buildRatingTrendGeometry,
  buildSubmissionTimelineGeometry,
  createDashboardController,
  createDashboardUiState,
  formatRatingDelta,
  getBucketLabel,
  getCodeforcesRatingColor,
  getRatingBucketColor,
  getRoadmapVisibleStages,
  getSubmissionVerdictColor,
  isPanelExpanded,
  isRoadmapExpanded,
  isTagAbilityExpanded,
  renderDashboard,
  renderNextProblemPanel,
  renderProfileBar,
  renderRatingBucketPanel,
  renderRatingTrendPanel,
  renderRoadmapPanel,
  renderSubmissionTimelinePanel,
  renderTagAbilityPanel,
  renderWeakAnalysisPanel,
  sortTagStats,
  toggleRoadmapExpanded,
  toggleTagAbilityExpanded,
  togglePanelExpanded,
} = require('../src/dashboard/dashboard');

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function createRoadmapItems(totalCount, currentStageId, overrides = {}) {
  return Array.from({ length: totalCount }, (_, index) => ({
    stageId: index + 1,
    stageName: `Stage ${index + 1}`,
    tag: index % 2 === 0 ? 'greedy' : 'dp',
    acceptedProgress: index + 1 < currentStageId ? 4 : index + 1 === currentStageId ? 2 : 0,
    target: 4,
    isCurrentStage: index + 1 === currentStageId,
    ...(overrides[index + 1] || {}),
  }));
}

function createDashboardFixture() {
  return {
    profile: {
      state: 'ready',
      payload: {
        handle: 'demo',
        rank: 'pupil',
        rating: 1337,
        totalAcceptedCount: 12,
        totalSubmissionsCount: 45,
        totalAttemptedProblems: 17,
      },
    },
    ratingHistory: {
      state: 'ready',
      payload: {
        items: [
          { contestName: 'Round 1', timestamp: 100, oldRating: 900, newRating: 950, delta: 50 },
        ],
      },
    },
    roadmap: {
      state: 'ready',
      payload: {
        items: [
          { stageId: 1, stageName: 'Sorting', tag: 'sortings', acceptedProgress: 1, target: 4, isCurrentStage: true },
        ],
      },
    },
    tagStats: {
      state: 'ready',
      payload: {
        items: [
          { tag: 'greedy', acceptedCount: 3, attemptedCount: 5, acceptanceRate: 0.6 },
        ],
      },
    },
    ratingBuckets: {
      state: 'ready',
      payload: {
        items: [
          { bucket: '1200', acceptedCount: 2 },
        ],
      },
    },
    weak: {
      state: 'ready',
      payload: {
        currentStage: { id: 1, name: 'Sorting' },
        tagGaps: [{ tag: 'binary search', acceptedCount: 1, attemptedCount: 4, acceptanceRate: 0.25 }],
        ratingWeakZones: [],
        roadmapGaps: [],
      },
    },
    next: {
      state: 'ready',
      payload: {
        currentTopic: 'greedy',
        stage: { id: 1, name: 'Sorting' },
        stageProgress: { accepted: 1, target: 4 },
        anchor: {
          problemId: '401B',
          title: 'Greedy Combo Anchor',
          rating: 1440,
          tags: ['greedy', 'sortings'],
          link: 'https://codeforces.com/problemset/problem/401/B',
        },
        prerequisites: [],
      },
    },
    submissions: {
      state: 'ready',
      payload: {
        items: [
          { timestamp: 1000, rating: 800, verdict: 'WRONG_ANSWER', problemId: '100A', title: 'Sort Warmup', tags: ['sortings'] },
        ],
      },
    },
  };
}

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
  assert.equal(getSubmissionVerdictColor('OK'), '#56d364');
  assert.equal(getSubmissionVerdictColor('WRONG_ANSWER'), '#ff7b72');
  assert.equal(getSubmissionVerdictColor('TIME_LIMIT_EXCEEDED'), '#ff8f00');
  assert.equal(getSubmissionVerdictColor('RUNTIME_ERROR'), '#93a1c6');

  const ordered = sortTagStats([
    { tag: 'dp', acceptedCount: 2, attemptedCount: 5 },
    { tag: 'greedy', acceptedCount: 4, attemptedCount: 4 },
    { tag: 'binary search', acceptedCount: 2, attemptedCount: 6 },
  ]);

  assert.deepEqual(ordered.map((item) => item.tag), ['greedy', 'binary search', 'dp']);
});

test('dashboard ui state helpers support panel expansion defaults and local toggles', () => {
  const uiState = createDashboardUiState();

  assert.ok(COLLAPSIBLE_PANEL_NAMES.includes('roadmap'));
  assert.equal(isPanelExpanded(uiState, 'roadmap'), true);
  assert.equal(isRoadmapExpanded(uiState), false);
  assert.equal(isPanelExpanded(uiState, 'profile'), true);
  assert.equal(isTagAbilityExpanded(uiState), false);

  const collapsedState = togglePanelExpanded(uiState, 'roadmap');
  assert.equal(isPanelExpanded(collapsedState, 'roadmap'), false);

  const restoredState = togglePanelExpanded(collapsedState, 'roadmap');
  assert.equal(isPanelExpanded(restoredState, 'roadmap'), true);

  const expandedRoadmapState = toggleRoadmapExpanded(restoredState);
  assert.equal(isRoadmapExpanded(expandedRoadmapState), true);

  const restoredRoadmapState = toggleRoadmapExpanded(expandedRoadmapState);
  assert.equal(isRoadmapExpanded(restoredRoadmapState), false);

  const expandedTagAbilityState = toggleTagAbilityExpanded(restoredRoadmapState);
  assert.equal(isTagAbilityExpanded(expandedTagAbilityState), true);

  const restoredTagAbilityState = toggleTagAbilityExpanded(expandedTagAbilityState);
  assert.equal(isTagAbilityExpanded(restoredTagAbilityState), false);
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

test('submission timeline geometry uses timestamps for x-axis and rating for y-axis placement', () => {
  const geometry = buildSubmissionTimelineGeometry([
    { timestamp: 1000, rating: 800, verdict: 'WRONG_ANSWER', problemId: '100A', title: 'Sort Warmup' },
    { timestamp: 1030, rating: 950, verdict: 'OK', problemId: '102B', title: 'Greedy Basics' },
    { timestamp: 1200, rating: 1290, verdict: 'TIME_LIMIT_EXCEEDED', problemId: '204A', title: 'Binary Four' },
  ]);

  assert.equal(geometry.points.length, 3);
  assert.ok(geometry.points[0].x < geometry.points[1].x);
  assert.ok(geometry.points[1].x < geometry.points[2].x);
  assert.ok(geometry.points[0].y > geometry.points[1].y);
  assert.ok(geometry.points[1].y > geometry.points[2].y);
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

test('renderRoadmapPanel defaults to a five-stage window around the current stage', () => {
  const html = renderRoadmapPanel({
    items: createRoadmapItems(8, 4),
  });

  assert.equal(countMatches(html, /class="roadmap-stage(?:\s|\")/g), ROADMAP_VISIBLE_STAGE_COUNT);
  assert.match(html, /data-roadmap-state="collapsed"/);
  assert.match(html, /Show all 8 stages/);
  assert.match(html, /Stage 2/);
  assert.match(html, /Stage 3/);
  assert.match(html, /Stage 4/);
  assert.match(html, /Stage 5/);
  assert.match(html, /Stage 6/);
  assert.doesNotMatch(html, /Stage 1/);
  assert.doesNotMatch(html, /Stage 7/);
  assert.doesNotMatch(html, /Stage 8/);
});

test('renderRoadmapPanel keeps the current stage visible near roadmap edges', () => {
  const leadingStages = createRoadmapItems(7, 1);
  const trailingStages = createRoadmapItems(7, 7);
  const leadingHtml = renderRoadmapPanel({ items: leadingStages });
  const trailingHtml = renderRoadmapPanel({ items: trailingStages });

  assert.deepEqual(
    getRoadmapVisibleStages(leadingStages).map((stage) => stage.stageId),
    [1, 2, 3, 4, 5]
  );
  assert.deepEqual(
    getRoadmapVisibleStages(trailingStages).map((stage) => stage.stageId),
    [3, 4, 5, 6, 7]
  );
  assert.match(leadingHtml, /Stage 1/);
  assert.match(leadingHtml, /Stage 5/);
  assert.doesNotMatch(leadingHtml, /Stage 6/);
  assert.match(trailingHtml, /Stage 3/);
  assert.match(trailingHtml, /Stage 7/);
  assert.doesNotMatch(trailingHtml, /Stage 2/);
});

test('renderRoadmapPanel preserves current, completed, and not-started state classes in collapsed and expanded views', () => {
  const items = createRoadmapItems(6, 3, {
    1: { stageName: 'Sorting', tag: 'sortings', acceptedProgress: 4 },
    3: { stageName: 'Greedy', tag: 'greedy', acceptedProgress: 2 },
    5: { stageName: 'Binary Search', tag: 'binary search', acceptedProgress: 0 },
    6: { stageName: 'Graphs', tag: 'graphs', acceptedProgress: 0 },
  });
  const collapsedHtml = renderRoadmapPanel({ items });
  const expandedHtml = renderRoadmapPanel({ items }, { expandedRoadmap: true });

  assert.match(collapsedHtml, /roadmap-stage is-complete/);
  assert.match(collapsedHtml, /roadmap-stage is-current/);
  assert.match(collapsedHtml, /roadmap-stage is-not-started/);
  assert.match(collapsedHtml, /Binary Search/);
  assert.doesNotMatch(collapsedHtml, /Graphs/);
  assert.match(collapsedHtml, /aria-expanded="false"/);

  assert.match(expandedHtml, /data-roadmap-state="expanded"/);
  assert.match(expandedHtml, /roadmap-stage is-complete/);
  assert.match(expandedHtml, /roadmap-stage is-current/);
  assert.match(expandedHtml, /roadmap-stage is-not-started/);
  assert.match(expandedHtml, /Graphs/);
  assert.match(expandedHtml, /Show focused 5-stage view/);
  assert.match(expandedHtml, /aria-expanded="true"/);
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

test('renderTagAbilityPanel shows only the top 10 tags by default when more data exists', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    tag: `tag-${index + 1}`,
    acceptedCount: index + 1,
    attemptedCount: index + 2,
    acceptanceRate: (index + 1) / (index + 2),
  }));

  const html = renderTagAbilityPanel({ items });

  assert.equal(countMatches(html, /class="tag-row"/g), TAG_ABILITY_VISIBLE_COUNT);
  assert.match(html, /data-tag-ability-state="collapsed"/);
  assert.match(html, /data-dashboard-tag-ability-toggle="true"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Show all 12 tags/);
  assert.match(html, /data-tag-name="tag-12"/);
  assert.match(html, /data-tag-name="tag-3"/);
  assert.doesNotMatch(html, /data-tag-name="tag-2"/);
  assert.doesNotMatch(html, /data-tag-name="tag-1"/);
});

test('renderTagAbilityPanel expands to all tags and collapses back to the top 10', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    tag: `tag-${index + 1}`,
    acceptedCount: index + 1,
    attemptedCount: index + 2,
    acceptanceRate: (index + 1) / (index + 2),
  }));

  const collapsedHtml = renderTagAbilityPanel({ items }, createDashboardUiState());
  const expandedHtml = renderTagAbilityPanel(
    { items },
    toggleTagAbilityExpanded(createDashboardUiState())
  );
  const restoredHtml = renderTagAbilityPanel(
    { items },
    toggleTagAbilityExpanded(toggleTagAbilityExpanded(createDashboardUiState()))
  );

  assert.equal(countMatches(expandedHtml, /class="tag-row"/g), 12);
  assert.match(expandedHtml, /data-tag-ability-state="expanded"/);
  assert.match(expandedHtml, /aria-expanded="true"/);
  assert.match(expandedHtml, /Show top 10/);
  assert.match(expandedHtml, /data-tag-name="tag-2"/);
  assert.match(expandedHtml, /data-tag-name="tag-1"/);
  assert.equal(countMatches(collapsedHtml, /class="tag-row"/g), TAG_ABILITY_VISIBLE_COUNT);
  assert.equal(countMatches(restoredHtml, /class="tag-row"/g), TAG_ABILITY_VISIBLE_COUNT);
  assert.match(restoredHtml, /data-tag-ability-state="collapsed"/);
});

test('renderTagAbilityPanel keeps small tag lists fully visible without a disclosure toggle', () => {
  const html = renderTagAbilityPanel({
    items: [
      { tag: 'greedy', acceptedCount: 3, attemptedCount: 5, acceptanceRate: 0.6 },
      { tag: 'dp', acceptedCount: 2, attemptedCount: 4, acceptanceRate: 0.5 },
      { tag: 'math', acceptedCount: 1, attemptedCount: 2, acceptanceRate: 0.5 },
    ],
  });

  assert.equal(countMatches(html, /class="tag-row"/g), 3);
  assert.doesNotMatch(html, /data-dashboard-tag-ability-toggle="true"/);
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

test('renderWeakAnalysisPanel shows weak tags, weak ratings, and roadmap gaps', () => {
  const html = renderWeakAnalysisPanel({
    currentStage: { id: 1, name: '排序 + 贪心' },
    tagGaps: [
      { tag: 'binary search', acceptedCount: 0, attemptedCount: 4, acceptanceRate: 0 },
    ],
    ratingWeakZones: [
      { bucket: '1200', label: '1200-1299', acceptedCount: 0, problemCount: 4, acceptanceRate: 0 },
    ],
    roadmapGaps: [
      { stageId: 1, tag: 'greedy', acceptedProgress: 1, target: 4, missingCount: 3 },
    ],
  });

  assert.match(html, /data-panel="weak-analysis"/);
  assert.match(html, /Current roadmap focus/);
  assert.match(html, /binary search/);
  assert.match(html, /1200-1299/);
  assert.match(html, /greedy/);
});

test('renderNextProblemPanel shows anchor and prerequisite cards with external links', () => {
  const html = renderNextProblemPanel({
    currentTopic: 'greedy',
    stage: { id: 1, name: '排序 + 贪心' },
    stageProgress: { accepted: 1, target: 4 },
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

  assert.match(html, /data-panel="next-problem"/);
  assert.match(html, /Current topic: <strong>greedy<\/strong>/);
  assert.match(html, /Greedy Combo Anchor/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /problemset\/problem\/401\/B/);
});

test('renderSubmissionTimelinePanel colors points by verdict and includes tooltip details', () => {
  const html = renderSubmissionTimelinePanel({
    items: [
      { timestamp: 1000, rating: 800, verdict: 'WRONG_ANSWER', problemId: '100A', title: 'Sort Warmup', tags: ['sortings'] },
      { timestamp: 1010, rating: 800, verdict: 'OK', problemId: '100A', title: 'Sort Warmup', tags: ['sortings'] },
      { timestamp: 1070, rating: 1290, verdict: 'TIME_LIMIT_EXCEEDED', problemId: '204A', title: 'Binary Four', tags: ['binary search'] },
      { timestamp: 1080, rating: 1300, verdict: 'RUNTIME_ERROR', problemId: '205A', title: 'Binary Five', tags: ['binary search'] },
    ],
  });

  assert.match(html, /data-panel="submission-timeline"/);
  assert.match(html, /fill="#ff7b72"/);
  assert.match(html, /fill="#56d364"/);
  assert.match(html, /fill="#ff8f00"/);
  assert.match(html, /fill="#93a1c6"/);
  assert.match(html, /<title>Sort Warmup · WA · 1970-01-01 00:16:40 UTC<\/title>/);
  assert.match(html, /<title>Binary Four · TLE · 1970-01-01 00:17:50 UTC<\/title>/);
});

test('bottom panels render clear empty and error states', () => {
  const emptyWeak = renderWeakAnalysisPanel({ tagGaps: [], ratingWeakZones: [], roadmapGaps: [] });
  const emptyNext = renderNextProblemPanel({ anchor: null, prerequisites: [] });
  const emptyTimeline = renderSubmissionTimelinePanel({ items: [] });

  assert.match(emptyWeak, /No weak areas detected/);
  assert.match(emptyNext, /No recommendation is available/);
  assert.match(emptyTimeline, /No rated submissions are available/);

  const html = renderDashboard({
    profile: { state: 'ready', payload: { handle: 'demo', rank: 'pupil', rating: 1337, totalAcceptedCount: 1, totalSubmissionsCount: 2, totalAttemptedProblems: 1 } },
    ratingHistory: { state: 'ready', payload: { items: [] } },
    roadmap: { state: 'ready', payload: { items: [] } },
    tagStats: { state: 'ready', payload: { items: [] } },
    ratingBuckets: { state: 'ready', payload: { items: [] } },
    weak: { state: 'error', error: new Error('Weak API unavailable') },
    next: { state: 'error', error: new Error('Next API unavailable') },
    submissions: { state: 'error', error: new Error('Submissions API unavailable') },
  });

  assert.match(html, /Weak API unavailable/);
  assert.match(html, /Next API unavailable/);
  assert.match(html, /Submissions API unavailable/);
});

test('renderDashboard includes masonry layout, readable typography hooks, sticky profile, and tooltip markers', () => {
  const html = renderDashboard(
    createDashboardFixture(),
    createDashboardUiState({
      expandedPanels: {
        roadmap: false,
      },
      profilePinned: true,
      tooltip: {
        visible: true,
        panelName: 'submission-timeline',
        key: 'submission-timeline-0',
        content: 'Sort Warmup · WA · 1970-01-01 00:16:40 UTC',
      },
    })
  );

  assert.match(html, /data-dashboard-layout="masonry"/);
  assert.match(html, /data-dashboard-column="primary"/);
  assert.match(html, /data-dashboard-column="secondary"/);
  assert.match(html, /data-dashboard-profile-pinned="true"/);
  assert.match(html, /data-dashboard-sticky="profile"/);
  assert.match(html, /panel-kicker-readable/);
  assert.match(html, /panel-title-readable/);
  assert.match(html, /chart-axis-label/);
  assert.match(html, /data-panel="roadmap"[^>]*data-panel-collapsible="true"[^>]*data-panel-expanded="false"/);
  assert.match(html, /data-dashboard-toggle="roadmap"/);
  assert.match(html, /data-panel-body="roadmap" hidden/);
  assert.match(html, /data-dashboard-tooltip-layer/);
  assert.match(html, /Sort Warmup · WA · 1970-01-01 00:16:40 UTC/);
  assert.match(html, /data-tooltip-panel="rating-trend"/);
  assert.match(html, /data-tooltip-content="Round 1 · \+50 · 950"/);
  assert.match(html, /data-tooltip-panel="submission-timeline"/);
});

test('dashboard controller updates panel, roadmap disclosure, and tooltip state without reloading data', () => {
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

  const controller = createDashboardController({}, root, {
    data: {
      ...createDashboardFixture(),
      roadmap: {
        state: 'ready',
        payload: {
          items: createRoadmapItems(7, 4),
        },
      },
    },
  });

  controller.render();
  assert.match(root.innerHTML, /data-panel="roadmap"[^>]*data-panel-expanded="true"/);
  assert.equal(countMatches(root.innerHTML, /class="roadmap-stage(?:\s|\")/g), ROADMAP_VISIBLE_STAGE_COUNT);
  assert.equal(countMatches(root.innerHTML, /class="tag-row"/g), 1);

  controller.toggleRoadmapDisclosure();
  assert.equal(countMatches(root.innerHTML, /class="roadmap-stage(?:\s|\")/g), 7);
  assert.match(root.innerHTML, /data-roadmap-state="expanded"/);

  controller.toggleRoadmapDisclosure();
  assert.equal(countMatches(root.innerHTML, /class="roadmap-stage(?:\s|\")/g), ROADMAP_VISIBLE_STAGE_COUNT);
  assert.match(root.innerHTML, /data-roadmap-state="collapsed"/);

  controller.togglePanel('roadmap');
  assert.match(root.innerHTML, /data-panel="roadmap"[^>]*data-panel-expanded="false"/);

  controller.setData({
    ...createDashboardFixture(),
    tagStats: {
      state: 'ready',
      payload: {
        items: Array.from({ length: 12 }, (_, index) => ({
          tag: `tag-${index + 1}`,
          acceptedCount: index + 1,
          attemptedCount: index + 2,
          acceptanceRate: (index + 1) / (index + 2),
        })),
      },
    },
  });
  assert.equal(countMatches(root.innerHTML, /class="tag-row"/g), TAG_ABILITY_VISIBLE_COUNT);

  controller.toggleTagAbilityDisclosure();
  assert.equal(countMatches(root.innerHTML, /class="tag-row"/g), 12);

  controller.toggleTagAbilityDisclosure();
  assert.equal(countMatches(root.innerHTML, /class="tag-row"/g), TAG_ABILITY_VISIBLE_COUNT);

  controller.showTooltip({
    panelName: 'rating-trend',
    key: 'rating-trend-0',
    content: 'Round 1 · +50 · 950',
  });
  assert.equal(root.getAttribute('data-dashboard-tooltip-visible'), 'true');
  assert.equal(controller.getState().tooltip.content, 'Round 1 · +50 · 950');

  controller.setProfilePinned(true);
  assert.equal(root.getAttribute('data-dashboard-profile-pinned'), 'true');
});
