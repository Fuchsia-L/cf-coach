(function initDashboardModule(globalScope) {
  'use strict';

  const API_ENDPOINTS = {
    profile: '/api/profile',
    ratingHistory: '/api/rating-history',
    roadmap: '/api/roadmap',
    tagStats: '/api/tag-stats',
    ratingBuckets: '/api/rating-buckets',
  };

  const numberFormatter = new Intl.NumberFormat('en-US');

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(value) {
    if (value == null || Number.isNaN(Number(value))) {
      return '0';
    }

    return numberFormatter.format(Number(value));
  }

  function formatPercent(value) {
    if (value == null || Number.isNaN(Number(value))) {
      return '0%';
    }

    return `${Math.round(Number(value) * 100)}%`;
  }

  function formatRank(value) {
    if (!value) {
      return 'Unrated';
    }

    return String(value)
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  function formatRatingDelta(entry) {
    const delta =
      entry && typeof entry.delta === 'number'
        ? entry.delta
        : entry && typeof entry.newRating === 'number' && typeof entry.oldRating === 'number'
          ? entry.newRating - entry.oldRating
          : 0;

    const prefix = delta > 0 ? '+' : '';
    return `${prefix}${delta}`;
  }

  function getCodeforcesRatingColor(rating) {
    const value = Number(rating);

    if (!Number.isFinite(value)) {
      return '#808080';
    }
    if (value < 1200) {
      return '#808080';
    }
    if (value < 1400) {
      return '#0f9d58';
    }
    if (value < 1600) {
      return '#03a9f4';
    }
    if (value < 1900) {
      return '#3f51b5';
    }
    if (value < 2100) {
      return '#aa00ff';
    }
    if (value < 2400) {
      return '#ff8f00';
    }

    return '#ff5252';
  }

  function getBucketBaseValue(bucket) {
    if (typeof bucket === 'number') {
      return bucket;
    }

    const match = String(bucket || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function getBucketLabel(bucket) {
    return String(bucket || '0');
  }

  function getRatingBucketColor(bucket) {
    return getCodeforcesRatingColor(getBucketBaseValue(bucket));
  }

  function sortTagStats(items) {
    return (Array.isArray(items) ? items.slice() : []).sort((left, right) => {
      if ((right.acceptedCount || 0) !== (left.acceptedCount || 0)) {
        return (right.acceptedCount || 0) - (left.acceptedCount || 0);
      }
      if ((right.attemptedCount || 0) !== (left.attemptedCount || 0)) {
        return (right.attemptedCount || 0) - (left.attemptedCount || 0);
      }

      return String(left.tag || '').localeCompare(String(right.tag || ''));
    });
  }

  function buildRatingTrendGeometry(items, options = {}) {
    const chartWidth = options.width || 760;
    const chartHeight = options.height || 260;
    const padding = options.padding || { top: 20, right: 20, bottom: 34, left: 44 };
    const points = Array.isArray(items) ? items.filter(Boolean) : [];

    if (points.length === 0) {
      return {
        width: chartWidth,
        height: chartHeight,
        points: [],
        polyline: '',
        minRating: 0,
        maxRating: 0,
      };
    }

    const timestamps = points.map((entry) => Number(entry.timestamp) || 0);
    const ratings = points.map((entry) => Number(entry.newRating) || 0);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const ratingRange = Math.max(maxRating - minRating, 1);
    const timeRange = Math.max(maxTimestamp - minTimestamp, 1);
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const geometryPoints = points.map((entry) => {
      const timestamp = Number(entry.timestamp) || 0;
      const newRating = Number(entry.newRating) || 0;
      const x = padding.left + ((timestamp - minTimestamp) / timeRange) * innerWidth;
      const y = padding.top + (1 - (newRating - minRating) / ratingRange) * innerHeight;

      return {
        contestName: entry.contestName || 'Contest',
        timestamp,
        oldRating: entry.oldRating ?? null,
        newRating,
        delta: entry.delta ?? null,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    });

    return {
      width: chartWidth,
      height: chartHeight,
      points: geometryPoints,
      polyline: geometryPoints.map((point) => `${point.x},${point.y}`).join(' '),
      minRating,
      maxRating,
    };
  }

  function renderPanelFrame(panelName, title, subtitle, body, extraClassName) {
    const className = ['panel', extraClassName || ''].filter(Boolean).join(' ');

    return [
      `<section class="${className}" data-panel="${escapeHtml(panelName)}">`,
      '  <header class="panel-header">',
      `    <p class="panel-kicker">${escapeHtml(subtitle)}</p>`,
      `    <h2 class="panel-title">${escapeHtml(title)}</h2>`,
      '  </header>',
      `  <div class="panel-body">${body}</div>`,
      '</section>',
    ].join('');
  }

  function renderProfileBar(profile) {
    const ratingColor = getCodeforcesRatingColor(profile?.rating);

    return renderPanelFrame(
      'profile',
      escapeHtml(profile?.handle || 'Unknown Handle'),
      'Profile',
      [
        '<div class="profile-bar">',
        '  <div class="profile-identity">',
        `    <p class="profile-rank">${escapeHtml(formatRank(profile?.rank))}</p>`,
        `    <p class="profile-rating" style="color:${escapeHtml(ratingColor)}">${escapeHtml(formatNumber(profile?.rating))}</p>`,
        '  </div>',
        '  <div class="profile-metrics">',
        `    <article class="metric"><span class="metric-label">Accepted</span><strong class="metric-value">${escapeHtml(formatNumber(profile?.totalAcceptedCount))}</strong></article>`,
        `    <article class="metric"><span class="metric-label">Submissions</span><strong class="metric-value">${escapeHtml(formatNumber(profile?.totalSubmissionsCount))}</strong></article>`,
        `    <article class="metric"><span class="metric-label">Attempted</span><strong class="metric-value">${escapeHtml(formatNumber(profile?.totalAttemptedProblems))}</strong></article>`,
        '  </div>',
        '</div>',
      ].join(''),
      'panel-profile'
    );
  }

  function renderRatingTrendPanel(ratingHistory) {
    const geometry = buildRatingTrendGeometry(ratingHistory?.items || []);

    if (geometry.points.length === 0) {
      return renderPanelFrame(
        'rating-trend',
        'Rating Trend',
        'Contests',
        '<p class="panel-empty">No rating history found in local cache.</p>',
        'panel-chart'
      );
    }

    const gridLines = [0, 0.5, 1].map((ratio, index) => {
      const y = 20 + ratio * (geometry.height - 54);
      const label = Math.round(geometry.maxRating - ratio * (geometry.maxRating - geometry.minRating));

      return [
        `<line class="trend-grid" x1="44" y1="${y}" x2="740" y2="${y}"></line>`,
        `<text class="trend-axis-label" x="8" y="${y + 4}">${escapeHtml(formatNumber(label))}</text>`,
        index === 2 ? '<text class="trend-axis-caption" x="44" y="252">First contest</text><text class="trend-axis-caption" x="662" y="252">Latest contest</text>' : '',
      ].join('');
    }).join('');

    const pointMarkup = geometry.points.map((point) => [
      `<g class="trend-point-group" data-contest-name="${escapeHtml(point.contestName)}">`,
      `  <circle class="trend-point" cx="${point.x}" cy="${point.y}" r="5">`,
      `    <title>${escapeHtml(point.contestName)} · ${escapeHtml(formatRatingDelta(point))}</title>`,
      '  </circle>',
      '</g>',
    ].join('')).join('');

    return renderPanelFrame(
      'rating-trend',
      'Rating Trend',
      'Contests',
      [
        `<svg class="trend-chart" viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-label="Rating trend chart">`,
        gridLines,
        `<polyline class="trend-line" fill="none" points="${escapeHtml(geometry.polyline)}"></polyline>`,
        pointMarkup,
        '</svg>',
      ].join(''),
      'panel-chart'
    );
  }

  function getRoadmapStageClasses(stage) {
    const classNames = ['roadmap-stage'];
    const acceptedProgress = Number(stage?.acceptedProgress) || 0;
    const target = Math.max(Number(stage?.target) || 0, 1);

    if (acceptedProgress >= target) {
      classNames.push('is-complete');
    }
    if (acceptedProgress === 0) {
      classNames.push('is-not-started');
    }
    if (stage?.isCurrentStage) {
      classNames.push('is-current');
    }

    return classNames.join(' ');
  }

  function renderRoadmapPanel(roadmap) {
    const stages = Array.isArray(roadmap?.items) ? roadmap.items : [];
    const body = stages.length === 0
      ? '<p class="panel-empty">Roadmap data is not available.</p>'
      : `<div class="roadmap-grid">${stages.map((stage) => [
          `<article class="${getRoadmapStageClasses(stage)}" data-stage-id="${escapeHtml(stage.stageId)}">`,
          `  <p class="roadmap-stage-index">Stage ${escapeHtml(stage.stageId)}</p>`,
          `  <h3 class="roadmap-stage-name">${escapeHtml(stage.stageName)}</h3>`,
          `  <p class="roadmap-stage-tag">${escapeHtml(stage.tag || 'n/a')}</p>`,
          `  <p class="roadmap-stage-progress">${escapeHtml(formatNumber(stage.acceptedProgress))} / ${escapeHtml(formatNumber(stage.target))}</p>`,
          '</article>',
        ].join('')).join('')}</div>`;

    return renderPanelFrame('roadmap', 'Roadmap', '20 stages', body, 'panel-roadmap');
  }

  function renderTagAbilityPanel(tagStats) {
    const items = sortTagStats(tagStats?.items || []);
    const maxAttempted = Math.max(1, ...items.map((item) => Number(item.attemptedCount) || 0));
    const body = items.length === 0
      ? '<p class="panel-empty">Tag performance is not available.</p>'
      : `<div class="tag-list">${items.map((item) => {
          const attemptedWidth = ((Number(item.attemptedCount) || 0) / maxAttempted) * 100;
          const acceptedWidth = ((Number(item.acceptedCount) || 0) / maxAttempted) * 100;

          return [
            `<article class="tag-row" data-tag-name="${escapeHtml(item.tag)}">`,
            '  <div class="tag-row-header">',
            `    <h3 class="tag-name">${escapeHtml(item.tag)}</h3>`,
            `    <p class="tag-rate">${escapeHtml(formatPercent(item.acceptanceRate))}</p>`,
            '  </div>',
            '  <div class="tag-bars">',
            `    <span class="tag-bar-track tag-bar-attempted"><span class="tag-bar-fill" style="width:${attemptedWidth.toFixed(2)}%"></span></span>`,
            `    <span class="tag-bar-track tag-bar-accepted"><span class="tag-bar-fill" style="width:${acceptedWidth.toFixed(2)}%"></span></span>`,
            '  </div>',
            '  <div class="tag-row-footer">',
            `    <span class="tag-count tag-count-attempted">Attempted ${escapeHtml(formatNumber(item.attemptedCount))}</span>`,
            `    <span class="tag-count tag-count-accepted">Accepted ${escapeHtml(formatNumber(item.acceptedCount))}</span>`,
            '  </div>',
            '</article>',
          ].join('');
        }).join('')}</div>`;

    return renderPanelFrame('tag-ability', 'Tag Ability', 'By accepted count', body, 'panel-tags');
  }

  function renderRatingBucketPanel(ratingBuckets) {
    const items = Array.isArray(ratingBuckets?.items) ? ratingBuckets.items : [];
    const maxAccepted = Math.max(1, ...items.map((item) => Number(item.acceptedCount) || 0));
    const body = items.length === 0
      ? '<p class="panel-empty">Rating bucket stats are not available.</p>'
      : `<div class="bucket-list">${items.map((item) => {
          const bucketColor = getRatingBucketColor(item.bucket);
          const width = ((Number(item.acceptedCount) || 0) / maxAccepted) * 100;

          return [
            `<article class="bucket-row" data-bucket-label="${escapeHtml(getBucketLabel(item.bucket))}">`,
            `  <span class="bucket-label">${escapeHtml(getBucketLabel(item.bucket))}</span>`,
            '  <span class="bucket-bar-track">',
            `    <span class="bucket-bar-fill" style="width:${width.toFixed(2)}%;background:${escapeHtml(bucketColor)}"></span>`,
            '  </span>',
            `  <strong class="bucket-count">${escapeHtml(formatNumber(item.acceptedCount))}</strong>`,
            '</article>',
          ].join('');
        }).join('')}</div>`;

    return renderPanelFrame('rating-buckets', 'Rating Buckets', 'Accepted problems', body, 'panel-buckets');
  }

  function renderLoadingState() {
    return [
      '<section class="panel panel-loading">',
      '  <header class="panel-header">',
      '    <p class="panel-kicker">cf-coach</p>',
      '    <h2 class="panel-title">Dashboard</h2>',
      '  </header>',
      '  <div class="panel-body"><p class="summary">Loading local cache insights...</p></div>',
      '</section>',
    ].join('');
  }

  function renderErrorState(error) {
    return [
      '<section class="panel panel-error" data-panel="error">',
      '  <header class="panel-header">',
      '    <p class="panel-kicker">cf-coach</p>',
      '    <h2 class="panel-title">Dashboard unavailable</h2>',
      '  </header>',
      `  <div class="panel-body"><p class="summary">${escapeHtml(error?.message || 'Failed to load dashboard data.')}</p></div>`,
      '</section>',
    ].join('');
  }

  function renderDashboard(data) {
    return [
      '<div class="dashboard-shell">',
      renderProfileBar(data.profile),
      '<div class="dashboard-grid">',
      renderRatingTrendPanel(data.ratingHistory),
      renderRoadmapPanel(data.roadmap),
      renderTagAbilityPanel(data.tagStats),
      renderRatingBucketPanel(data.ratingBuckets),
      '</div>',
      '</div>',
    ].join('');
  }

  async function readJsonResponse(response, endpoint) {
    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed for ${endpoint}`);
      }

      throw error;
    }

    if (!response.ok) {
      const message = payload?.error?.message || `Request failed for ${endpoint}`;
      throw new Error(message);
    }

    return payload;
  }

  async function loadDashboardData(fetchImpl) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('Dashboard fetch implementation is unavailable.');
    }

    const [profile, ratingHistory, roadmap, tagStats, ratingBuckets] = await Promise.all([
      fetchImpl(API_ENDPOINTS.profile).then((response) => readJsonResponse(response, API_ENDPOINTS.profile)),
      fetchImpl(API_ENDPOINTS.ratingHistory).then((response) => readJsonResponse(response, API_ENDPOINTS.ratingHistory)),
      fetchImpl(API_ENDPOINTS.roadmap).then((response) => readJsonResponse(response, API_ENDPOINTS.roadmap)),
      fetchImpl(API_ENDPOINTS.tagStats).then((response) => readJsonResponse(response, API_ENDPOINTS.tagStats)),
      fetchImpl(API_ENDPOINTS.ratingBuckets).then((response) => readJsonResponse(response, API_ENDPOINTS.ratingBuckets)),
    ]);

    return {
      profile,
      ratingHistory,
      roadmap,
      tagStats,
      ratingBuckets,
    };
  }

  function getRoot(env) {
    return env?.document && typeof env.document.getElementById === 'function'
      ? env.document.getElementById('app')
      : null;
  }

  async function bootstrapDashboard(env = globalScope) {
    const root = getRoot(env);

    if (!root) {
      return null;
    }

    root.setAttribute('data-dashboard-ready', 'false');
    root.setAttribute('data-dashboard-state', 'loading');
    root.innerHTML = renderLoadingState();

    try {
      const data = await loadDashboardData(env.fetch);

      root.innerHTML = renderDashboard(data);
      root.setAttribute('data-dashboard-ready', 'true');
      root.setAttribute('data-dashboard-state', 'ready');
      return data;
    } catch (error) {
      root.innerHTML = renderErrorState(error);
      root.setAttribute('data-dashboard-ready', 'false');
      root.setAttribute('data-dashboard-state', 'error');
      throw error;
    }
  }

  const dashboardApi = {
    API_ENDPOINTS,
    bootstrapDashboard,
    buildRatingTrendGeometry,
    escapeHtml,
    formatNumber,
    formatPercent,
    formatRank,
    formatRatingDelta,
    getBucketBaseValue,
    getBucketLabel,
    getCodeforcesRatingColor,
    getRatingBucketColor,
    getRoadmapStageClasses,
    loadDashboardData,
    renderDashboard,
    renderErrorState,
    renderLoadingState,
    renderProfileBar,
    renderRatingBucketPanel,
    renderRatingTrendPanel,
    renderRoadmapPanel,
    renderTagAbilityPanel,
    sortTagStats,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = dashboardApi;
  }

  if (globalScope) {
    globalScope.CFCoachDashboard = dashboardApi;

    if (getRoot(globalScope)) {
      dashboardApi.ready = bootstrapDashboard(globalScope).catch(() => null);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
