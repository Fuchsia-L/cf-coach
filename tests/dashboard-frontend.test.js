const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COLLAPSIBLE_PANEL_NAMES,
  ROADMAP_VISIBLE_STAGE_COUNT,
  REVIEW_TYPE_DEFINITIONS,
  TAG_ABILITY_VISIBLE_COUNT,
  buildReviewCreatePayload,
  buildRatingTrendGeometry,
  buildRatingTrendTooltipData,
  buildSubmissionTimelineGeometry,
  buildSubmissionTooltipData,
  buildTooltipContent,
  createDashboardController,
  createReviewComposerState,
  createDashboardUiState,
  formatRatingDelta,
  getBucketLabel,
  getCodeforcesRatingColor,
  getRatingBucketColor,
  getRoadmapVisibleStages,
  getReviewTypeDefinition,
  getSubmissionVerdictColor,
  isPanelExpanded,
  isRoadmapExpanded,
  isTagAbilityExpanded,
  renderDashboard,
  renderNextProblemPanel,
  renderProfileBar,
  renderRatingBucketPanel,
  renderRatingTrendPanel,
  renderReviewComposerPanel,
  renderReviewSessionPanel,
  renderRoadmapPanel,
  renderSubmissionTimelinePanel,
  renderTagAbilityPanel,
  renderTooltipInner,
  renderTooltipLayer,
  renderWeakAnalysisPanel,
  setReviewComposerType,
  setReviewSessionFeedback,
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
    review: {
      state: 'ready',
      payload: {
        items: [
          {
            id: 'r_demo_1',
            type: 'A',
            content: 'lower_bound — returns first iterator >= value',
            stage: 0,
            nextReviewDate: '2026-03-20',
            completed: false,
            createdAt: '2026-03-19T10:00:00.000Z',
          },
        ],
        todayCount: 1,
        totalActive: 1,
        totalCompleted: 0,
      },
    },
  };
}

function createInteractiveRoot() {
  const listeners = new Map();

  return {
    innerHTML: '',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    dispatch(type, target) {
      const listener = listeners.get(type);

      if (!listener) {
        return;
      }

      listener({
        target,
        preventDefault() {},
      });
    },
  };
}

function createAttributeTarget(attributes) {
  return {
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    closest(selector) {
      const match = /^\[(.+)\]$/.exec(selector);

      if (!match) {
        return null;
      }

      return this.getAttribute(match[1]) != null ? this : null;
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

test('review composer renders type-specific fields and updates the fixed format hint on type switch', () => {
  const defaultComposer = createReviewComposerState();
  const syntaxPanel = renderReviewComposerPanel({ reviewComposer: defaultComposer });
  const knowledgePanel = renderReviewComposerPanel({
    reviewComposer: createReviewComposerState({ selectedType: 'D' }),
  });
  const switchedState = setReviewComposerType(createDashboardUiState(), 'B');
  const fullDashboard = renderDashboard(createDashboardFixture(), switchedState);

  assert.deepEqual(Object.keys(REVIEW_TYPE_DEFINITIONS), ['A', 'B', 'C', 'D']);
  assert.equal(getReviewTypeDefinition('A').fields[0].name, 'syntaxName');
  assert.equal(getReviewTypeDefinition('D').fields[0].name, 'problemType');
  assert.match(syntaxPanel, /Format: 语法名称 \+ 用法说明/);
  assert.match(syntaxPanel, /name="syntaxName"/);
  assert.match(syntaxPanel, /name="usageNote"/);
  assert.doesNotMatch(syntaxPanel, /name="problemContext"/);
  assert.match(knowledgePanel, /Format: 解决哪种问题 \+ 简易写法/);
  assert.match(knowledgePanel, /name="problemType"/);
  assert.match(knowledgePanel, /name="snippet"/);
  assert.match(fullDashboard, /data-panel="review-entry"/);
  assert.match(fullDashboard, /name="problemContext"/);
  assert.doesNotMatch(fullDashboard, /name="syntaxName"/);
});

test('review composer client-side validation blocks empty fields before submit', async () => {
  const root = {
    innerHTML: '',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const env = {
    fetch: async () => {
      throw new Error('fetch should not be called');
    },
  };
  const controller = createDashboardController(env, root, {
    data: createDashboardFixture(),
  });

  assert.throws(
    () => buildReviewCreatePayload(createReviewComposerState()),
    /Syntax name is required/
  );

  controller.render();
  controller.setReviewType('C');
  controller.updateReviewField('pitfall', 'Forgot bounds checks.');

  const result = await controller.submitReview();

  assert.equal(result.ok, false);
  assert.equal(controller.getState().reviewComposer.feedback.kind, 'error');
  assert.equal(controller.getState().reviewComposer.feedback.message, 'Avoid next time is required.');
  assert.match(root.innerHTML, /Avoid next time is required/);
});

test('review composer submits successfully and surfaces server errors without a full reload', async () => {
  const root = {
    innerHTML: '',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const fetchCalls = [];
  const env = {
    async fetch(requestPath, options) {
      fetchCalls.push({ requestPath, options });

      if (fetchCalls.length === 1) {
        return {
          ok: true,
          async text() {
            return JSON.stringify({
              item: {
                id: 'r_1',
                type: 'D',
                content: 'Interval merge — Sort by left endpoint.',
                stage: 0,
                nextReviewDate: '2026-03-20',
                completed: false,
                createdAt: '2026-03-19T15:00:00.000Z',
              },
            });
          },
        };
      }

      return {
        ok: false,
        async text() {
          return JSON.stringify({
            error: {
              message: 'Snippet is required.',
            },
          });
        },
      };
    },
  };
  const controller = createDashboardController(env, root, {
    data: createDashboardFixture(),
  });

  controller.render();
  controller.setReviewType('D');
  controller.updateReviewField('problemType', 'Interval merge');
  controller.updateReviewField('snippet', 'Sort by left endpoint.');

  const successResult = await controller.submitReview();

  assert.equal(successResult.ok, true);
  assert.equal(fetchCalls[0].requestPath, '/api/review');
  assert.equal(fetchCalls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
    type: 'D',
    problemType: 'Interval merge',
    snippet: 'Sort by left endpoint.',
  });
  assert.equal(controller.getState().reviewComposer.feedback.kind, 'success');
  assert.equal(controller.getState().reviewComposer.drafts.D.problemType, '');
  assert.equal(controller.getState().reviewComposer.drafts.D.snippet, '');
  assert.match(root.innerHTML, /Created review item for 2026-03-20/);

  controller.updateReviewField('problemType', 'Prefix sums');
  controller.updateReviewField('snippet', 'Compute prefix sums once.');
  const errorResult = await controller.submitReview();

  assert.equal(errorResult.ok, false);
  assert.equal(controller.getState().reviewComposer.feedback.kind, 'error');
  assert.equal(controller.getState().reviewComposer.feedback.message, 'Snippet is required.');
  assert.match(root.innerHTML, /Snippet is required/);
});

test('review session panel renders due items, interval guidance, backlog cap, and no-defer messaging', () => {
  const reviewPanel = renderReviewSessionPanel({
    items: Array.from({ length: 10 }, (_, index) => ({
      id: `r_${index + 1}`,
      type: index === 9 ? 'D' : 'A',
      content: `review ${index + 1}`,
      stage: index === 9 ? 4 : 0,
      nextReviewDate: '2026-03-20',
      completed: false,
      createdAt: `2026-03-19T10:${String(index).padStart(2, '0')}:00.000Z`,
    })),
    todayCount: 12,
    totalActive: 15,
    totalCompleted: 3,
  }, createDashboardUiState({
    reviewSession: setReviewSessionFeedback(createDashboardUiState(), 'success', 'Review item advanced.').reviewSession,
  }));

  assert.match(reviewPanel, /data-panel="review-session"/);
  assert.match(reviewPanel, /No defer button exists here/);
  assert.match(reviewPanel, /A\/B\/C intervals: 1, 3, 7, 21 days/);
  assert.match(reviewPanel, /D intervals: 1, 3, 7, 14, 21 days/);
  assert.match(reviewPanel, /server returns at most 10 items/);
  assert.match(reviewPanel, /showing 10 of 12 due items/i);
  assert.match(reviewPanel, /A · Syntax/);
  assert.match(reviewPanel, /D · Knowledge/);
  assert.match(reviewPanel, /Stage 0/);
  assert.match(reviewPanel, /Pass schedules the next review in 1 day/);
  assert.match(reviewPanel, /Reset sends it back to stage 0 for tomorrow/);
  assert.match(reviewPanel, /Review item advanced/);
  assert.equal(countMatches(reviewPanel, /data-review-action="pass"/g), 10);
  assert.equal(countMatches(reviewPanel, /data-review-action="reset"/g), 10);
});

test('review session interactions remove items immediately and use delegated click handling', async () => {
  const root = createInteractiveRoot();
  const fetchCalls = [];
  const env = {
    async fetch(requestPath, options) {
      fetchCalls.push({ requestPath, options });

      return {
        ok: true,
        async text() {
          if (requestPath.includes('/pass')) {
            return JSON.stringify({
              item: {
                id: 'r_pass',
                type: 'A',
                content: 'lower_bound',
                stage: 5,
                nextReviewDate: '2026-03-20',
                completed: true,
                createdAt: '2026-03-19T10:00:00.000Z',
              },
              message: 'Review item advanced.',
            });
          }

          return JSON.stringify({
            item: {
              id: 'r_reset',
              type: 'D',
              content: 'interval merge',
              stage: 0,
              nextReviewDate: '2026-03-21',
              completed: false,
              createdAt: '2026-03-19T10:05:00.000Z',
            },
            message: 'Review item reset.',
          });
        },
      };
    },
  };
  const controller = createDashboardController(env, root, {
    data: {
      ...createDashboardFixture(),
      review: {
        state: 'ready',
        payload: {
          items: [
            {
              id: 'r_pass',
              type: 'A',
              content: 'lower_bound',
              stage: 4,
              nextReviewDate: '2026-03-20',
              completed: false,
              createdAt: '2026-03-19T10:00:00.000Z',
            },
            {
              id: 'r_reset',
              type: 'D',
              content: 'interval merge',
              stage: 2,
              nextReviewDate: '2026-03-20',
              completed: false,
              createdAt: '2026-03-19T10:05:00.000Z',
            },
          ],
          todayCount: 2,
          totalActive: 2,
          totalCompleted: 0,
        },
      },
    },
  });

  controller.render();
  assert.match(root.innerHTML, /r_pass/);
  assert.match(root.innerHTML, /r_reset/);

  root.dispatch('click', createAttributeTarget({
    'data-review-item-id': 'r_pass',
    'data-review-action': 'pass',
  }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(fetchCalls[0].requestPath, '/api/review/r_pass/pass');
  assert.equal(fetchCalls[0].options.method, 'POST');
  assert.doesNotMatch(root.innerHTML, /r_pass/);
  assert.match(root.innerHTML, /Review item advanced/);

  const resetResult = await controller.submitReviewAction('r_reset', 'reset');

  assert.equal(resetResult.ok, true);
  assert.equal(fetchCalls[1].requestPath, '/api/review/r_reset/reset');
  assert.equal(fetchCalls[1].options.method, 'POST');
  assert.doesNotMatch(root.innerHTML, /r_reset/);
  assert.match(root.innerHTML, /No review items are due right now/);
  assert.match(root.innerHTML, /Review item reset/);
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

test('renderRatingTrendPanel outputs gradient area markup and custom tooltip metadata', () => {
  const html = renderRatingTrendPanel({
    items: [
      { contestName: 'Round 1', timestamp: 100, oldRating: 900, newRating: 950, delta: 50 },
      { contestName: 'Round 2', timestamp: 250, oldRating: 950, newRating: 1000, delta: 50 },
    ],
  });

  assert.match(html, /data-panel="rating-trend"/);
  assert.match(html, /<svg/);
  assert.match(html, /<linearGradient id="rating-trend-fill"/);
  assert.match(html, /class="trend-area"/);
  assert.match(html, /<polyline/);
  assert.match(html, /data-tooltip-title="Round 1"/);
  assert.match(html, /data-tooltip-body="Delta \+50"/);
  assert.match(html, /data-tooltip-meta="Rating 950"/);
  assert.doesNotMatch(html, /<title>/);
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

test('renderSubmissionTimelinePanel colors points by verdict with larger circles and custom tooltip metadata', () => {
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
  assert.match(html, /class="timeline-point"[^>]*r="7"/);
  assert.match(html, /data-tooltip-title="Sort Warmup"/);
  assert.match(html, /data-tooltip-body="WA"/);
  assert.match(html, /data-tooltip-meta="1970-01-01 00:16:40 UTC"/);
  assert.match(html, /data-tooltip-title="Binary Four"/);
  assert.doesNotMatch(html, /<title>/);
});

test('custom tooltip helpers format rating and submission content for themed tooltip rendering', () => {
  const ratingTooltip = buildRatingTrendTooltipData({
    contestName: 'Round 9',
    oldRating: 1200,
    newRating: 1275,
    delta: 75,
  });
  const submissionTooltip = buildSubmissionTooltipData({
    timestamp: 1000,
    verdict: 'WRONG_ANSWER',
    problemId: '100A',
    title: 'Sort Warmup',
  });

  assert.deepEqual(ratingTooltip, {
    title: 'Round 9',
    body: 'Delta +75',
    meta: 'Rating 1,275',
    content: 'Round 9 · +75 · 1,275',
  });
  assert.deepEqual(submissionTooltip, {
    title: 'Sort Warmup',
    body: 'WA',
    meta: '1970-01-01 00:16:40 UTC',
    content: 'Sort Warmup · WA · 1970-01-01 00:16:40 UTC',
  });
  assert.equal(buildTooltipContent(ratingTooltip), 'Round 9 · Delta +75 · Rating 1,275');
  assert.match(renderTooltipInner(ratingTooltip), /dashboard-tooltip-title">Round 9</);
  assert.match(renderTooltipInner(submissionTooltip), /dashboard-tooltip-meta">1970-01-01 00:16:40 UTC</);
  assert.match(renderTooltipLayer({ visible: true, ...ratingTooltip, x: 44, y: 88 }), /style="left:44px;top:88px;"/);
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
        title: 'Sort Warmup',
        body: 'WA',
        meta: '1970-01-01 00:16:40 UTC',
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
  assert.match(html, /dashboard-tooltip-title">Sort Warmup</);
  assert.match(html, /dashboard-tooltip-body">WA</);
  assert.match(html, /dashboard-tooltip-meta">1970-01-01 00:16:40 UTC</);
  assert.match(html, /data-tooltip-panel="rating-trend"/);
  assert.match(html, /data-tooltip-content="Round 1 · \+50 · 950"/);
  assert.match(html, /data-tooltip-title="Round 1"/);
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
