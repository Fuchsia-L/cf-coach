(function initDashboardModule(globalScope) {
  'use strict';

  const API_ENDPOINTS = {
    profile: '/api/profile',
    ratingHistory: '/api/rating-history',
    roadmap: '/api/roadmap',
    tagStats: '/api/tag-stats',
    ratingBuckets: '/api/rating-buckets',
    weak: '/api/weak',
    next: '/api/next',
    submissions: '/api/submissions',
  };

  const DASHBOARD_SECTION_IDS = [
    'rating-trend',
    'roadmap',
    'tag-ability',
    'rating-buckets',
    'weak-analysis',
    'next-problem',
    'submission-timeline',
  ];

  const COLLAPSIBLE_PANEL_NAMES = [
    'roadmap',
    'tag-ability',
    'rating-buckets',
    'weak-analysis',
    'next-problem',
    'submission-timeline',
  ];

  const DEFAULT_EXPANDED_PANELS = {
    roadmap: true,
    'tag-ability': true,
    'rating-buckets': true,
    'weak-analysis': true,
    'next-problem': true,
    'submission-timeline': true,
  };

  const TAG_ABILITY_VISIBLE_COUNT = 10;

  const numberFormatter = new Intl.NumberFormat('en-US');

  function createDashboardUiState(initialState = {}) {
    return {
      expandedPanels: {
        ...DEFAULT_EXPANDED_PANELS,
        ...(initialState.expandedPanels || {}),
      },
      expandedTagAbility: initialState.expandedTagAbility === true,
      tooltip: {
        visible: initialState.tooltip?.visible === true,
        panelName: initialState.tooltip?.panelName || null,
        key: initialState.tooltip?.key || null,
        content: initialState.tooltip?.content || '',
      },
      profilePinned: initialState.profilePinned === true,
    };
  }

  function isPanelCollapsible(panelName) {
    return COLLAPSIBLE_PANEL_NAMES.includes(panelName);
  }

  function isPanelExpanded(uiState, panelName) {
    if (!isPanelCollapsible(panelName)) {
      return true;
    }

    return uiState?.expandedPanels?.[panelName] !== false;
  }

  function togglePanelExpanded(uiState, panelName) {
    if (!isPanelCollapsible(panelName)) {
      return createDashboardUiState(uiState);
    }

    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      expandedPanels: {
        ...currentState.expandedPanels,
        [panelName]: !isPanelExpanded(currentState, panelName),
      },
    };
  }

  function isTagAbilityExpanded(uiState) {
    return createDashboardUiState(uiState).expandedTagAbility === true;
  }

  function toggleTagAbilityExpanded(uiState) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      expandedTagAbility: !currentState.expandedTagAbility,
    };
  }

  function setTooltipState(uiState, tooltip) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      tooltip: {
        visible: tooltip?.visible === true,
        panelName: tooltip?.panelName || null,
        key: tooltip?.key || null,
        content: tooltip?.content || '',
      },
    };
  }

  function clearTooltipState(uiState) {
    return setTooltipState(uiState, null);
  }

  function setProfilePinnedState(uiState, profilePinned) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      profilePinned: profilePinned === true,
    };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
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

  function formatTimestamp(timestampSeconds) {
    const value = Number(timestampSeconds);

    if (!Number.isFinite(value)) {
      return 'Unknown time';
    }

    const date = new Date(value * 1000);

    if (Number.isNaN(date.getTime())) {
      return 'Unknown time';
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
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

  function getSubmissionVerdictLabel(verdict) {
    const normalized = String(verdict || '').trim().toUpperCase();

    if (normalized === 'OK') {
      return 'AC';
    }
    if (normalized === 'WRONG_ANSWER') {
      return 'WA';
    }
    if (normalized === 'TIME_LIMIT_EXCEEDED') {
      return 'TLE';
    }
    if (!normalized) {
      return 'Unknown';
    }

    return normalized
      .split('_')
      .filter(Boolean)
      .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
      .join(' ');
  }

  function getSubmissionVerdictColor(verdict) {
    const normalized = String(verdict || '').trim().toUpperCase();

    if (normalized === 'OK') {
      return '#56d364';
    }
    if (normalized === 'WRONG_ANSWER') {
      return '#ff7b72';
    }
    if (normalized === 'TIME_LIMIT_EXCEEDED') {
      return '#ff8f00';
    }

    return '#93a1c6';
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

  function createLinearScale(domainMin, domainMax, rangeMin, rangeMax) {
    const safeDomainMin = Number.isFinite(domainMin) ? domainMin : 0;
    const safeDomainMax = Number.isFinite(domainMax) ? domainMax : safeDomainMin;
    const safeRangeMin = Number.isFinite(rangeMin) ? rangeMin : 0;
    const safeRangeMax = Number.isFinite(rangeMax) ? rangeMax : safeRangeMin;
    const domainSpan = Math.max(safeDomainMax - safeDomainMin, 1);
    const rangeSpan = safeRangeMax - safeRangeMin;

    return (input) => {
      const value = Number.isFinite(Number(input)) ? Number(input) : safeDomainMin;
      const ratio = (value - safeDomainMin) / domainSpan;
      return Number((safeRangeMin + ratio * rangeSpan).toFixed(2));
    };
  }

  function buildScatterGeometry(items, options = {}) {
    const chartWidth = options.width || 760;
    const chartHeight = options.height || 260;
    const padding = options.padding || { top: 20, right: 20, bottom: 34, left: 44 };
    const getXValue = typeof options.getXValue === 'function' ? options.getXValue : (item) => item?.x;
    const getYValue = typeof options.getYValue === 'function' ? options.getYValue : (item) => item?.y;
    const points = (Array.isArray(items) ? items : []).filter((item) => {
      const xValue = Number(getXValue(item));
      const yValue = Number(getYValue(item));
      return Number.isFinite(xValue) && Number.isFinite(yValue);
    });

    if (points.length === 0) {
      return {
        width: chartWidth,
        height: chartHeight,
        points: [],
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        padding,
      };
    }

    const xValues = points.map((item) => Number(getXValue(item)));
    const yValues = points.map((item) => Number(getYValue(item)));
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const xScale = createLinearScale(minX, maxX, padding.left, chartWidth - padding.right);
    const yScale = createLinearScale(minY, maxY, chartHeight - padding.bottom, padding.top);

    return {
      width: chartWidth,
      height: chartHeight,
      points: points.map((item) => ({
        ...item,
        x: xScale(getXValue(item)),
        y: yScale(getYValue(item)),
      })),
      minX,
      maxX,
      minY,
      maxY,
      padding,
    };
  }

  function buildRatingTrendGeometry(items, options = {}) {
    const geometry = buildScatterGeometry(items, {
      width: options.width || 760,
      height: options.height || 260,
      padding: options.padding || { top: 20, right: 20, bottom: 34, left: 44 },
      getXValue(entry) {
        return entry?.timestamp;
      },
      getYValue(entry) {
        return entry?.newRating;
      },
    });

    const points = geometry.points.map((entry) => ({
      contestName: entry.contestName || 'Contest',
      timestamp: Number(entry.timestamp) || 0,
      oldRating: entry.oldRating ?? null,
      newRating: Number(entry.newRating) || 0,
      delta: entry.delta ?? null,
      x: entry.x,
      y: entry.y,
    }));

    return {
      width: geometry.width,
      height: geometry.height,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
      minRating: geometry.minY,
      maxRating: geometry.maxY,
      padding: geometry.padding,
    };
  }

  function buildSubmissionTooltip(point) {
    return `${point.title || point.problemId || 'Unknown problem'} · ${getSubmissionVerdictLabel(point.verdict)} · ${formatTimestamp(point.timestamp)}`;
  }

  function buildRatingTrendTooltip(point) {
    return `${point.contestName || 'Contest'} · ${formatRatingDelta(point)} · ${formatNumber(point.newRating)}`;
  }

  function buildSubmissionTimelineGeometry(items, options = {}) {
    const geometry = buildScatterGeometry(items, {
      width: options.width || 760,
      height: options.height || 280,
      padding: options.padding || { top: 20, right: 20, bottom: 42, left: 44 },
      getXValue(entry) {
        return entry?.timestamp;
      },
      getYValue(entry) {
        return entry?.rating;
      },
    });

    const points = geometry.points.map((entry) => ({
      timestamp: Number(entry.timestamp) || 0,
      rating: Number(entry.rating) || 0,
      verdict: entry.verdict || null,
      problemId: entry.problemId || null,
      title: entry.title || null,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      x: entry.x,
      y: entry.y,
      color: getSubmissionVerdictColor(entry.verdict),
      verdictLabel: getSubmissionVerdictLabel(entry.verdict),
      tooltip: buildSubmissionTooltip(entry),
    }));

    return {
      width: geometry.width,
      height: geometry.height,
      points,
      minTimestamp: geometry.minX,
      maxTimestamp: geometry.maxX,
      minRating: geometry.minY,
      maxRating: geometry.maxY,
      padding: geometry.padding,
    };
  }

  function renderPanelFrame(panelName, title, subtitle, body, extraClassName, options = {}) {
    const className = ['panel', extraClassName || ''].filter(Boolean).join(' ');
    const collapsible = options.collapsible === true;
    const expanded = collapsible ? options.expanded !== false : true;
    const panelBodyId = `panel-body-${panelName}`;
    const profileStickyMarker = options.stickyProfile === true ? ' data-dashboard-sticky="profile"' : '';
    const collapsibleAttributes = collapsible
      ? ` data-panel-collapsible="true" data-panel-expanded="${expanded ? 'true' : 'false'}"`
      : '';
    const toggleMarkup = collapsible
      ? [
          '<div class="panel-actions">',
          `  <button class="panel-toggle" type="button" data-dashboard-toggle="${escapeHtml(panelName)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${escapeHtml(panelBodyId)}">`,
          `    <span class="panel-toggle-label">${expanded ? 'Collapse' : 'Expand'}</span>`,
          '  </button>',
          '</div>',
        ].join('')
      : '';

    return [
      `<section class="${className}" data-panel="${escapeHtml(panelName)}"${collapsibleAttributes}${profileStickyMarker}>`,
      '  <header class="panel-header">',
      '    <div class="panel-header-copy">',
      `      <p class="panel-kicker panel-kicker-readable">${escapeHtml(subtitle)}</p>`,
      `      <h2 class="panel-title panel-title-readable">${escapeHtml(title)}</h2>`,
      '    </div>',
      `    ${toggleMarkup}`,
      '  </header>',
      `  <div class="panel-body" id="${escapeHtml(panelBodyId)}" data-panel-body="${escapeHtml(panelName)}"${collapsible && !expanded ? ' hidden' : ''}>${body}</div>`,
      '</section>',
    ].join('');
  }

  function renderPanelStatus(kind, message) {
    const className = ['panel-status', `panel-status-${kind}`].join(' ');
    const textClassName = kind === 'empty' ? 'panel-empty' : 'summary';

    return `<div class="${className}"><p class="${textClassName}">${escapeHtml(message)}</p></div>`;
  }

  function isPanelResource(value) {
    return value && typeof value === 'object' && typeof value.state === 'string';
  }

  function renderPanelResource(resource, options) {
    const panelResource = isPanelResource(resource) ? resource : null;

    if (panelResource?.state === 'loading') {
      return renderPanelFrame(
        options.panelName,
        options.title,
        options.subtitle,
        renderPanelStatus('loading', options.loadingMessage || 'Loading panel...'),
        options.className
      );
    }

    if (panelResource?.state === 'error') {
      return renderPanelFrame(
        options.panelName,
        options.title,
        options.subtitle,
        renderPanelStatus('error', panelResource.error?.message || options.errorMessage || 'This panel is unavailable.'),
        options.className
      );
    }

    return options.renderer(panelResource ? panelResource.payload : resource);
  }

  function renderProfileBar(profile, uiState) {
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
      'panel-profile',
      {
        stickyProfile: true,
        profilePinned: uiState?.profilePinned === true,
      }
    );
  }

  function renderRatingTrendPanel(ratingHistory) {
    const geometry = buildRatingTrendGeometry(ratingHistory?.items || []);

    if (geometry.points.length === 0) {
      return renderPanelFrame(
        'rating-trend',
        'Rating Trend',
        'Contests',
        renderPanelStatus('empty', 'No rating history found in local cache.'),
        'panel-chart'
      );
    }

    const gridLines = [0, 0.5, 1].map((ratio, index) => {
      const y = 20 + ratio * (geometry.height - 54);
      const label = Math.round(geometry.maxRating - ratio * (geometry.maxRating - geometry.minRating));

      return [
        `<line class="trend-grid" x1="44" y1="${y}" x2="740" y2="${y}"></line>`,
        `<text class="trend-axis-label chart-axis-label" x="8" y="${y + 4}">${escapeHtml(formatNumber(label))}</text>`,
        index === 2 ? '<text class="trend-axis-caption chart-axis-label" x="44" y="252">First contest</text><text class="trend-axis-caption chart-axis-label" x="662" y="252">Latest contest</text>' : '',
      ].join('');
    }).join('');

    const pointMarkup = geometry.points.map((point, index) => [
      `<g class="trend-point-group" data-contest-name="${escapeHtml(point.contestName)}" data-tooltip-panel="rating-trend" data-tooltip-key="rating-trend-${escapeHtml(index)}" data-tooltip-content="${escapeHtml(buildRatingTrendTooltip(point))}">`,
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

  function renderRoadmapPanel(roadmap, uiState) {
    const stages = Array.isArray(roadmap?.items) ? roadmap.items : [];
    const body = stages.length === 0
      ? renderPanelStatus('empty', 'Roadmap data is not available.')
      : `<div class="roadmap-grid">${stages.map((stage) => [
          `<article class="${getRoadmapStageClasses(stage)}" data-stage-id="${escapeHtml(stage.stageId)}">`,
          `  <p class="roadmap-stage-index">Stage ${escapeHtml(stage.stageId)}</p>`,
          `  <h3 class="roadmap-stage-name">${escapeHtml(stage.stageName)}</h3>`,
          `  <p class="roadmap-stage-tag">${escapeHtml(stage.tag || 'n/a')}</p>`,
          `  <p class="roadmap-stage-progress">${escapeHtml(formatNumber(stage.acceptedProgress))} / ${escapeHtml(formatNumber(stage.target))}</p>`,
          '</article>',
        ].join('')).join('')}</div>`;

    return renderPanelFrame('roadmap', 'Roadmap', '20 stages', body, 'panel-roadmap', {
      collapsible: true,
      expanded: isPanelExpanded(uiState, 'roadmap'),
    });
  }

  function renderTagAbilityPanel(tagStats, uiState) {
    const items = sortTagStats(tagStats?.items || []);
    const isExpanded = isTagAbilityExpanded(uiState);
    const shouldShowDisclosure = items.length > TAG_ABILITY_VISIBLE_COUNT;
    const disclosureState = shouldShowDisclosure ? (isExpanded ? 'expanded' : 'collapsed') : 'full';
    const visibleItems = shouldShowDisclosure && !isExpanded
      ? items.slice(0, TAG_ABILITY_VISIBLE_COUNT)
      : items;
    const maxAttempted = Math.max(1, ...items.map((item) => Number(item.attemptedCount) || 0));
    const body = items.length === 0
      ? renderPanelStatus('empty', 'Tag performance is not available.')
      : [
          `<div class="tag-list" data-tag-ability-state="${disclosureState}">${visibleItems.map((item) => {
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
        }).join('')}</div>`,
          shouldShowDisclosure
            ? [
                '<div class="tag-list-actions">',
                `  <button class="panel-toggle tag-list-toggle" type="button" data-dashboard-tag-ability-toggle="true" aria-expanded="${isExpanded ? 'true' : 'false'}">${isExpanded ? `Show top ${TAG_ABILITY_VISIBLE_COUNT}` : `Show all ${escapeHtml(formatNumber(items.length))} tags`}</button>`,
                '</div>',
              ].join('')
            : '',
        ].join('');

    return renderPanelFrame('tag-ability', 'Tag Ability', 'By accepted count', body, 'panel-tags', {
      collapsible: true,
      expanded: isPanelExpanded(uiState, 'tag-ability'),
    });
  }

  function renderRatingBucketPanel(ratingBuckets, uiState) {
    const items = Array.isArray(ratingBuckets?.items) ? ratingBuckets.items : [];
    const maxAccepted = Math.max(1, ...items.map((item) => Number(item.acceptedCount) || 0));
    const body = items.length === 0
      ? renderPanelStatus('empty', 'Rating bucket stats are not available.')
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

    return renderPanelFrame('rating-buckets', 'Rating Buckets', 'Accepted problems', body, 'panel-buckets', {
      collapsible: true,
      expanded: isPanelExpanded(uiState, 'rating-buckets'),
    });
  }

  function renderWeakAnalysisPanel(weak, uiState) {
    const currentStage = weak?.currentStage || null;
    const tagGaps = Array.isArray(weak?.tagGaps) ? weak.tagGaps : [];
    const ratingWeakZones = Array.isArray(weak?.ratingWeakZones) ? weak.ratingWeakZones : [];
    const roadmapGaps = Array.isArray(weak?.roadmapGaps) ? weak.roadmapGaps : [];

    if (tagGaps.length === 0 && ratingWeakZones.length === 0 && roadmapGaps.length === 0) {
      return renderPanelFrame(
        'weak-analysis',
        'Weak Analysis',
        'Training gaps',
        renderPanelStatus('empty', 'No weak areas detected from local cache.'),
        'panel-weak',
        {
          collapsible: true,
          expanded: isPanelExpanded(uiState, 'weak-analysis'),
        }
      );
    }

    const stageSummary = currentStage
      ? `<p class="panel-hint">Current roadmap focus: <strong>${escapeHtml(currentStage.name)}</strong></p>`
      : '';

    const body = [
      stageSummary,
      '<div class="insight-stack">',
      tagGaps.length > 0
        ? [
            '<section class="insight-group" data-insight-group="tags">',
            '  <h3 class="insight-title">Low-conversion tags</h3>',
            `  <div class="insight-list">${tagGaps.map((entry) => [
                `<article class="insight-card" data-weak-tag="${escapeHtml(entry.tag)}">`,
                `  <h4 class="insight-card-title">${escapeHtml(entry.tag)}</h4>`,
                `  <p class="insight-card-copy">${escapeHtml(formatPercent(entry.acceptanceRate))} acceptance across ${escapeHtml(formatNumber(entry.attemptedCount))} attempted problems.</p>`,
                '</article>',
              ].join('')).join('')}</div>`,
            '</section>',
          ].join('')
        : '',
      ratingWeakZones.length > 0
        ? [
            '<section class="insight-group" data-insight-group="ratings">',
            '  <h3 class="insight-title">Weak rating ranges</h3>',
            `  <div class="insight-list">${ratingWeakZones.map((entry) => [
                `<article class="insight-card" data-weak-bucket="${escapeHtml(entry.bucket)}">`,
                `  <h4 class="insight-card-title">${escapeHtml(entry.label)}</h4>`,
                `  <p class="insight-card-copy">${escapeHtml(formatNumber(entry.acceptedCount))}/${escapeHtml(formatNumber(entry.problemCount))} converted with ${escapeHtml(formatPercent(entry.acceptanceRate))} acceptance.</p>`,
                '</article>',
              ].join('')).join('')}</div>`,
            '</section>',
          ].join('')
        : '',
      roadmapGaps.length > 0
        ? [
            '<section class="insight-group" data-insight-group="roadmap">',
            '  <h3 class="insight-title">Roadmap gaps</h3>',
            `  <div class="insight-list">${roadmapGaps.map((entry) => [
                `<article class="insight-card" data-roadmap-gap="${escapeHtml(entry.tag)}">`,
                `  <h4 class="insight-card-title">${escapeHtml(entry.tag)}</h4>`,
                `  <p class="insight-card-copy">Stage ${escapeHtml(entry.stageId)} needs ${escapeHtml(formatNumber(entry.missingCount))} more solves (${escapeHtml(formatNumber(entry.acceptedProgress))}/${escapeHtml(formatNumber(entry.target))}).</p>`,
                '</article>',
              ].join('')).join('')}</div>`,
            '</section>',
          ].join('')
        : '',
      '</div>',
    ].join('');

    return renderPanelFrame('weak-analysis', 'Weak Analysis', 'Training gaps', body, 'panel-weak', {
      collapsible: true,
      expanded: isPanelExpanded(uiState, 'weak-analysis'),
    });
  }

  function renderProblemTags(tags) {
    const items = Array.isArray(tags) ? tags : [];

    if (items.length === 0) {
      return '';
    }

    return `<div class="problem-card-tags">${items.map((tag) => `<span class="problem-card-tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
  }

  function renderProblemCard(problem, options = {}) {
    if (!problem) {
      return '';
    }

    const className = ['problem-card', options.className || ''].filter(Boolean).join(' ');
    const label = options.label ? `<p class="problem-card-label">${escapeHtml(options.label)}</p>` : '';
    const href = problem.link ? ` href="${escapeHtml(problem.link)}"` : '';
    const target = problem.link ? ' target="_blank" rel="noopener noreferrer"' : '';
    const wrapperTag = problem.link ? 'a' : 'article';

    return [
      `<${wrapperTag} class="${className}" data-problem-id="${escapeHtml(problem.problemId)}"${href}${target}>`,
      label,
      `  <h3 class="problem-card-title">${escapeHtml(problem.title || problem.problemId || 'Unknown problem')}</h3>`,
      `  <p class="problem-card-meta">${escapeHtml(formatNumber(problem.rating))} rating</p>`,
      renderProblemTags(problem.tags),
      `</${wrapperTag}>`,
    ].join('');
  }

  function renderNextProblemPanel(next, uiState) {
    const stageName = next?.stage?.name || 'Unknown stage';
    const stageProgress = next?.stageProgress || {};
    const prerequisites = Array.isArray(next?.prerequisites) ? next.prerequisites : [];

    if (!next?.anchor && prerequisites.length === 0) {
      return renderPanelFrame(
        'next-problem',
        'Next Problem',
        'Recommendations',
        renderPanelStatus('empty', 'No recommendation is available from local cache.'),
        'panel-next',
        {
          collapsible: true,
          expanded: isPanelExpanded(uiState, 'next-problem'),
        }
      );
    }

    const body = [
      '<div class="problem-plan">',
      `  <p class="panel-hint">Current topic: <strong>${escapeHtml(next?.currentTopic || 'n/a')}</strong> · ${escapeHtml(stageName)} · ${escapeHtml(formatNumber(stageProgress.accepted))}/${escapeHtml(formatNumber(stageProgress.target))} solved</p>`,
      '  <div class="problem-card-grid">',
      renderProblemCard(next?.anchor, { label: 'Anchor', className: 'is-anchor' }),
      ...prerequisites.map((problem, index) => renderProblemCard(problem, { label: `Prerequisite ${index + 1}` })),
      '  </div>',
      '</div>',
    ].join('');

    return renderPanelFrame('next-problem', 'Next Problem', 'Recommendations', body, 'panel-next', {
      collapsible: true,
      expanded: isPanelExpanded(uiState, 'next-problem'),
    });
  }

  function renderSubmissionTimelinePanel(submissions, uiState) {
    const items = Array.isArray(submissions?.items) ? submissions.items : [];
    const geometry = buildSubmissionTimelineGeometry(items);

    if (geometry.points.length === 0) {
      return renderPanelFrame(
        'submission-timeline',
        'Submission Timeline',
        'Attempts over time',
        renderPanelStatus('empty', 'No rated submissions are available for the timeline.'),
        'panel-submissions',
        {
          collapsible: true,
          expanded: isPanelExpanded(uiState, 'submission-timeline'),
        }
      );
    }

    const gridLines = [0, 0.5, 1].map((ratio) => {
      const y = 20 + ratio * (geometry.height - 62);
      const label = Math.round(geometry.maxRating - ratio * (geometry.maxRating - geometry.minRating));

      return [
        `<line class="timeline-grid" x1="44" y1="${y}" x2="740" y2="${y}"></line>`,
        `<text class="timeline-axis-label chart-axis-label" x="8" y="${y + 4}">${escapeHtml(formatNumber(label))}</text>`,
      ].join('');
    }).join('');

    const captions = [
      `<text class="timeline-axis-caption chart-axis-label" x="44" y="272">${escapeHtml(formatTimestamp(geometry.minTimestamp))}</text>`,
      `<text class="timeline-axis-caption timeline-axis-caption-end chart-axis-label" x="740" y="272">${escapeHtml(formatTimestamp(geometry.maxTimestamp))}</text>`,
    ].join('');

    const points = geometry.points.map((point, index) => [
      `<g class="timeline-point-group" data-problem-id="${escapeHtml(point.problemId)}" data-verdict="${escapeHtml(point.verdictLabel)}" data-tooltip-panel="submission-timeline" data-tooltip-key="submission-timeline-${escapeHtml(index)}" data-tooltip-content="${escapeHtml(point.tooltip)}">`,
      `  <circle class="timeline-point" cx="${point.x}" cy="${point.y}" r="5" fill="${escapeHtml(point.color)}" data-x="${escapeHtml(point.x)}" data-y="${escapeHtml(point.y)}">`,
      `    <title>${escapeHtml(point.tooltip)}</title>`,
      '  </circle>',
      '</g>',
    ].join('')).join('');

    const legend = [
      '<div class="timeline-legend">',
      `<span class="timeline-legend-item"><i class="timeline-legend-dot" style="background:${escapeHtml(getSubmissionVerdictColor('OK'))}"></i>AC</span>`,
      `<span class="timeline-legend-item"><i class="timeline-legend-dot" style="background:${escapeHtml(getSubmissionVerdictColor('WRONG_ANSWER'))}"></i>WA</span>`,
      `<span class="timeline-legend-item"><i class="timeline-legend-dot" style="background:${escapeHtml(getSubmissionVerdictColor('TIME_LIMIT_EXCEEDED'))}"></i>TLE</span>`,
      `<span class="timeline-legend-item"><i class="timeline-legend-dot" style="background:${escapeHtml(getSubmissionVerdictColor('RUNTIME_ERROR'))}"></i>Other</span>`,
      '</div>',
    ].join('');

    return renderPanelFrame(
      'submission-timeline',
      'Submission Timeline',
      'Attempts over time',
      [
        legend,
        `<svg class="timeline-chart" viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-label="Submission timeline chart">`,
        gridLines,
        captions,
        points,
        '</svg>',
      ].join(''),
      'panel-submissions',
      {
        collapsible: true,
        expanded: isPanelExpanded(uiState, 'submission-timeline'),
      }
    );
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

  function renderDashboard(data, uiState = createDashboardUiState()) {
    const tooltipState = uiState?.tooltip || {};
    const primaryColumnPanels = [
      renderPanelResource(data.ratingHistory, {
        panelName: 'rating-trend',
        title: 'Rating Trend',
        subtitle: 'Contests',
        className: 'panel-chart',
        loadingMessage: 'Loading rating history...',
        errorMessage: 'Rating history is unavailable.',
        renderer: renderRatingTrendPanel,
      }),
      renderPanelResource(data.tagStats, {
        panelName: 'tag-ability',
        title: 'Tag Ability',
        subtitle: 'By accepted count',
        className: 'panel-tags',
        loadingMessage: 'Loading tag performance...',
        errorMessage: 'Tag performance is unavailable.',
        renderer(tagStats) {
          return renderTagAbilityPanel(tagStats, uiState);
        },
      }),
      renderPanelResource(data.weak, {
        panelName: 'weak-analysis',
        title: 'Weak Analysis',
        subtitle: 'Training gaps',
        className: 'panel-weak',
        loadingMessage: 'Loading weak analysis...',
        errorMessage: 'Weak analysis is unavailable.',
        renderer(weak) {
          return renderWeakAnalysisPanel(weak, uiState);
        },
      }),
      renderPanelResource(data.submissions, {
        panelName: 'submission-timeline',
        title: 'Submission Timeline',
        subtitle: 'Attempts over time',
        className: 'panel-submissions',
        loadingMessage: 'Loading submission timeline...',
        errorMessage: 'Submission timeline is unavailable.',
        renderer(submissions) {
          return renderSubmissionTimelinePanel(submissions, uiState);
        },
      }),
    ].join('');
    const secondaryColumnPanels = [
      renderPanelResource(data.roadmap, {
        panelName: 'roadmap',
        title: 'Roadmap',
        subtitle: '20 stages',
        className: 'panel-roadmap',
        loadingMessage: 'Loading roadmap progress...',
        errorMessage: 'Roadmap data is unavailable.',
        renderer(roadmap) {
          return renderRoadmapPanel(roadmap, uiState);
        },
      }),
      renderPanelResource(data.ratingBuckets, {
        panelName: 'rating-buckets',
        title: 'Rating Buckets',
        subtitle: 'Accepted problems',
        className: 'panel-buckets',
        loadingMessage: 'Loading rating buckets...',
        errorMessage: 'Rating bucket data is unavailable.',
        renderer(ratingBuckets) {
          return renderRatingBucketPanel(ratingBuckets, uiState);
        },
      }),
      renderPanelResource(data.next, {
        panelName: 'next-problem',
        title: 'Next Problem',
        subtitle: 'Recommendations',
        className: 'panel-next',
        loadingMessage: 'Loading recommendations...',
        errorMessage: 'Recommendations are unavailable.',
        renderer(next) {
          return renderNextProblemPanel(next, uiState);
        },
      }),
    ].join('');

    return [
      `<div class="dashboard-shell dashboard-shell-readable" data-dashboard-layout="masonry" data-dashboard-profile-pinned="${uiState?.profilePinned === true ? 'true' : 'false'}" data-dashboard-tooltip-visible="${tooltipState.visible === true ? 'true' : 'false'}">`,
      renderPanelResource(data.profile, {
        panelName: 'profile',
        title: 'Profile',
        subtitle: 'Profile',
        className: 'panel-profile',
        loadingMessage: 'Loading profile summary...',
        errorMessage: 'Profile data is unavailable.',
        renderer(profile) {
          return renderProfileBar(profile, uiState);
        },
      }),
      '<div class="dashboard-grid dashboard-grid-masonry">',
      `  <div class="dashboard-column dashboard-column-primary" data-dashboard-column="primary">${primaryColumnPanels}</div>`,
      `  <div class="dashboard-column dashboard-column-secondary" data-dashboard-column="secondary">${secondaryColumnPanels}</div>`,
      '</div>',
      `<div class="dashboard-tooltip-layer" data-dashboard-tooltip-layer data-visible="${tooltipState.visible === true ? 'true' : 'false'}" aria-hidden="${tooltipState.visible === true ? 'false' : 'true'}">${escapeHtml(tooltipState.content || '')}</div>`,
      '</div>',
    ].join('');
  }

  function findClosestAttributeTarget(target, attributeName) {
    if (!target || !attributeName) {
      return null;
    }

    if (typeof target.closest === 'function') {
      return target.closest(`[${attributeName}]`);
    }

    let current = target;

    while (current) {
      if (typeof current.getAttribute === 'function' && current.getAttribute(attributeName) != null) {
        return current;
      }

      current = current.parentNode || null;
    }

    return null;
  }

  function createDashboardController(env, root, options = {}) {
    const controllerState = {
      data: options.data || null,
      uiState: createDashboardUiState(options.uiState),
      listenersAttached: false,
      teardownCallbacks: [],
    };

    function syncRootAttributes() {
      if (!root || typeof root.setAttribute !== 'function') {
        return;
      }

      root.setAttribute('data-dashboard-profile-pinned', controllerState.uiState.profilePinned ? 'true' : 'false');
      root.setAttribute('data-dashboard-tooltip-visible', controllerState.uiState.tooltip.visible ? 'true' : 'false');
    }

    function updateTooltipLayer() {
      syncRootAttributes();

      if (!root || typeof root.querySelector !== 'function') {
        return;
      }

      const tooltipLayer = root.querySelector('[data-dashboard-tooltip-layer]');

      if (!tooltipLayer) {
        return;
      }

      const tooltip = controllerState.uiState.tooltip || {};
      tooltipLayer.textContent = tooltip.content || '';
      tooltipLayer.setAttribute('data-visible', tooltip.visible ? 'true' : 'false');
      tooltipLayer.setAttribute('aria-hidden', tooltip.visible ? 'false' : 'true');
    }

    function render() {
      if (!root) {
        return '';
      }

      root.innerHTML = renderDashboard(controllerState.data, controllerState.uiState);
      updateTooltipLayer();
      return root.innerHTML;
    }

    function setData(data) {
      controllerState.data = data;
      return render();
    }

    function togglePanel(panelName) {
      controllerState.uiState = togglePanelExpanded(controllerState.uiState, panelName);
      return render();
    }

    function toggleTagAbilityDisclosure() {
      controllerState.uiState = toggleTagAbilityExpanded(controllerState.uiState);
      return render();
    }

    function showTooltip(tooltip) {
      controllerState.uiState = setTooltipState(controllerState.uiState, {
        visible: true,
        panelName: tooltip?.panelName,
        key: tooltip?.key,
        content: tooltip?.content,
      });
      updateTooltipLayer();
      return controllerState.uiState;
    }

    function hideTooltip() {
      controllerState.uiState = clearTooltipState(controllerState.uiState);
      updateTooltipLayer();
      return controllerState.uiState;
    }

    function setProfilePinned(profilePinned) {
      controllerState.uiState = setProfilePinnedState(controllerState.uiState, profilePinned);
      syncRootAttributes();
      return controllerState.uiState;
    }

    function getState() {
      return createDashboardUiState(controllerState.uiState);
    }

    function attachListeners() {
      if (!root || typeof root.addEventListener !== 'function' || controllerState.listenersAttached) {
        return;
      }

      const handleClick = (event) => {
        const tagAbilityToggleButton = findClosestAttributeTarget(event.target, 'data-dashboard-tag-ability-toggle');

        if (tagAbilityToggleButton) {
          toggleTagAbilityDisclosure();
          return;
        }

        const toggleButton = findClosestAttributeTarget(event.target, 'data-dashboard-toggle');

        if (!toggleButton || typeof toggleButton.getAttribute !== 'function') {
          return;
        }

        togglePanel(toggleButton.getAttribute('data-dashboard-toggle'));
      };

      const handleMouseOver = (event) => {
        const tooltipTarget = findClosestAttributeTarget(event.target, 'data-tooltip-content');

        if (!tooltipTarget || typeof tooltipTarget.getAttribute !== 'function') {
          return;
        }

        showTooltip({
          panelName: tooltipTarget.getAttribute('data-tooltip-panel'),
          key: tooltipTarget.getAttribute('data-tooltip-key'),
          content: tooltipTarget.getAttribute('data-tooltip-content'),
        });
      };

      const handleMouseOut = (event) => {
        const tooltipTarget = findClosestAttributeTarget(event.target, 'data-tooltip-content');

        if (!tooltipTarget) {
          return;
        }

        hideTooltip();
      };

      const handleScroll = () => {
        if (!env) {
          return;
        }

        const scrollY = Number(env.scrollY);

        if (!Number.isFinite(scrollY)) {
          return;
        }

        setProfilePinned(scrollY > 12);
      };

      root.addEventListener('click', handleClick);
      root.addEventListener('mouseover', handleMouseOver);
      root.addEventListener('mouseout', handleMouseOut);
      controllerState.teardownCallbacks.push(() => root.removeEventListener('click', handleClick));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('mouseover', handleMouseOver));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('mouseout', handleMouseOut));

      if (env && typeof env.addEventListener === 'function' && typeof env.removeEventListener === 'function') {
        env.addEventListener('scroll', handleScroll, { passive: true });
        controllerState.teardownCallbacks.push(() => env.removeEventListener('scroll', handleScroll));
      }

      controllerState.listenersAttached = true;
    }

    function destroy() {
      controllerState.teardownCallbacks.splice(0).forEach((teardown) => teardown());
      controllerState.listenersAttached = false;
    }

    attachListeners();

    return {
      destroy,
      getState,
      hideTooltip,
      render,
      setData,
      setProfilePinned,
      showTooltip,
      toggleTagAbilityDisclosure,
      togglePanel,
    };
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

  async function loadPanelResource(fetchImpl, endpoint) {
    try {
      const response = await fetchImpl(endpoint);
      const payload = await readJsonResponse(response, endpoint);

      return {
        state: 'ready',
        payload,
      };
    } catch (error) {
      return {
        state: 'error',
        error,
      };
    }
  }

  async function loadDashboardData(fetchImpl) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('Dashboard fetch implementation is unavailable.');
    }

    const entries = await Promise.all(
      Object.entries(API_ENDPOINTS).map(async ([key, endpoint]) => [key, await loadPanelResource(fetchImpl, endpoint)])
    );

    return Object.fromEntries(entries);
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

    const controller = createDashboardController(env, root);
    dashboardApi.controller = controller;

    root.setAttribute('data-dashboard-ready', 'false');
    root.setAttribute('data-dashboard-state', 'loading');
    root.innerHTML = renderLoadingState();

    try {
      const data = await loadDashboardData(env.fetch);

      controller.setData(data);
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
    COLLAPSIBLE_PANEL_NAMES,
    DASHBOARD_SECTION_IDS,
    bootstrapDashboard,
    buildRatingTrendGeometry,
    buildRatingTrendTooltip,
    buildScatterGeometry,
    buildSubmissionTimelineGeometry,
    buildSubmissionTooltip,
    clearTooltipState,
    createDashboardController,
    createDashboardUiState,
    createLinearScale,
    escapeHtml,
    findClosestAttributeTarget,
    formatNumber,
    formatPercent,
    formatRank,
    formatRatingDelta,
    formatTimestamp,
    getBucketBaseValue,
    getBucketLabel,
    getCodeforcesRatingColor,
    getRatingBucketColor,
    getRoadmapStageClasses,
    getSubmissionVerdictColor,
    getSubmissionVerdictLabel,
    isPanelCollapsible,
    isPanelExpanded,
    isTagAbilityExpanded,
    loadDashboardData,
    renderDashboard,
    renderErrorState,
    renderLoadingState,
    renderNextProblemPanel,
    renderPanelFrame,
    renderPanelResource,
    renderProfileBar,
    renderRatingBucketPanel,
    renderRatingTrendPanel,
    renderRoadmapPanel,
    renderSubmissionTimelinePanel,
    renderTagAbilityPanel,
    renderWeakAnalysisPanel,
    setProfilePinnedState,
    setTooltipState,
    sortTagStats,
    TAG_ABILITY_VISIBLE_COUNT,
    toggleTagAbilityExpanded,
    togglePanelExpanded,
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
