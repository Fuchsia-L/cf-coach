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
    review: '/api/review',
  };

  const REVIEW_STAGE_GAPS = {
    A: [1, 3, 7, 21],
    B: [1, 3, 7, 21],
    C: [1, 3, 7, 21],
    D: [1, 3, 7, 14, 21],
  };
  const REVIEW_PANEL_MAX_ITEMS = 10;

  const REVIEW_TYPE_ORDER = ['A', 'B', 'C', 'D'];
  const REVIEW_TYPE_DEFINITIONS = {
    A: {
      label: 'Syntax',
      format: '语法名称 + 用法说明',
      fields: [
        {
          name: 'syntaxName',
          label: 'Syntax name',
          placeholder: 'lower_bound',
        },
        {
          name: 'usageNote',
          label: 'Usage note',
          placeholder: 'Returns the first iterator >= value.',
        },
      ],
    },
    B: {
      label: 'Strategy',
      format: '题目描述 + 解题策略',
      fields: [
        {
          name: 'problemContext',
          label: 'Problem context',
          placeholder: 'CF 1735C — LCM + grouping',
        },
        {
          name: 'strategy',
          label: 'Strategy',
          placeholder: 'Think DSU and greedily merge by lexicographic order.',
        },
      ],
    },
    C: {
      label: 'Pitfall',
      format: '踩坑原因 + 下次如何避免',
      fields: [
        {
          name: 'pitfall',
          label: 'Pitfall',
          placeholder: 'Array out of bounds in DSU find.',
        },
        {
          name: 'prevention',
          label: 'Avoid next time',
          placeholder: 'Write asserts before the first full submission.',
        },
      ],
    },
    D: {
      label: 'Knowledge',
      format: '解决哪种问题 + 简易写法',
      fields: [
        {
          name: 'problemType',
          label: 'Problem type',
          placeholder: 'Interval merge',
        },
        {
          name: 'snippet',
          label: 'Simple pattern',
          placeholder: 'Sort by left endpoint, then merge overlaps.',
        },
      ],
    },
  };

  const DASHBOARD_SECTION_IDS = [
    'review-session',
    'review-entry',
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

  const ROADMAP_VISIBLE_STAGE_COUNT = 5;
  const TAG_ABILITY_VISIBLE_COUNT = 10;
  const TOOLTIP_TARGET_ATTRIBUTE = 'data-tooltip-title';
  const TOOLTIP_OFFSET_X = 18;
  const TOOLTIP_OFFSET_Y = 18;
  const TOOLTIP_ESTIMATED_WIDTH = 260;
  const TOOLTIP_ESTIMATED_HEIGHT = 104;

  const numberFormatter = new Intl.NumberFormat('en-US');

  function buildTooltipContent(tooltip) {
    const title = tooltip?.title ? String(tooltip.title) : '';
    const body = tooltip?.body ? String(tooltip.body) : '';
    const meta = tooltip?.meta ? String(tooltip.meta) : '';
    const fallbackContent = tooltip?.content ? String(tooltip.content) : '';
    const sections = [title, body, meta].filter(Boolean);

    return sections.length > 0 ? sections.join(' · ') : fallbackContent;
  }

  function normalizeTooltipState(tooltip) {
    const normalizedX = Number(tooltip?.x);
    const normalizedY = Number(tooltip?.y);

    return {
      visible: tooltip?.visible === true,
      panelName: tooltip?.panelName || null,
      key: tooltip?.key || null,
      title: tooltip?.title || '',
      body: tooltip?.body || '',
      meta: tooltip?.meta || '',
      content: buildTooltipContent(tooltip),
      x: Number.isFinite(normalizedX) ? normalizedX : null,
      y: Number.isFinite(normalizedY) ? normalizedY : null,
    };
  }

  function createDashboardUiState(initialState = {}) {
    return {
      expandedPanels: {
        ...DEFAULT_EXPANDED_PANELS,
        ...(initialState.expandedPanels || {}),
      },
      expandedRoadmap: initialState.expandedRoadmap === true,
      expandedTagAbility: initialState.expandedTagAbility === true,
      tooltip: normalizeTooltipState(initialState.tooltip),
      profilePinned: initialState.profilePinned === true,
      reviewSession: createReviewSessionState(initialState.reviewSession),
      reviewComposer: createReviewComposerState(initialState.reviewComposer),
    };
  }

  function createReviewSessionState(initialState = {}) {
    return {
      pendingItemId: initialState.pendingItemId ? String(initialState.pendingItemId) : null,
      pendingAction: initialState.pendingAction === 'pass' || initialState.pendingAction === 'reset'
        ? initialState.pendingAction
        : null,
      feedback: {
        kind: initialState.feedback?.kind === 'success' || initialState.feedback?.kind === 'error'
          ? initialState.feedback.kind
          : 'idle',
        message: initialState.feedback?.message ? String(initialState.feedback.message) : '',
      },
    };
  }

  function createEmptyReviewDrafts() {
    return REVIEW_TYPE_ORDER.reduce((result, type) => {
      result[type] = REVIEW_TYPE_DEFINITIONS[type].fields.reduce((draft, field) => {
        draft[field.name] = '';
        return draft;
      }, {});
      return result;
    }, {});
  }

  function cloneReviewDrafts(source) {
    const emptyDrafts = createEmptyReviewDrafts();

    return REVIEW_TYPE_ORDER.reduce((result, type) => {
      result[type] = {
        ...emptyDrafts[type],
        ...(source && source[type] ? source[type] : {}),
      };
      return result;
    }, {});
  }

  function getReviewTypeDefinition(type) {
    return REVIEW_TYPE_DEFINITIONS[type] || REVIEW_TYPE_DEFINITIONS.A;
  }

  function createReviewComposerState(initialState = {}) {
    const selectedType = REVIEW_TYPE_ORDER.includes(initialState.selectedType) ? initialState.selectedType : 'A';

    return {
      selectedType,
      drafts: cloneReviewDrafts(initialState.drafts),
      submitting: initialState.submitting === true,
      feedback: {
        kind: initialState.feedback?.kind === 'success' || initialState.feedback?.kind === 'error'
          ? initialState.feedback.kind
          : 'idle',
        message: initialState.feedback?.message ? String(initialState.feedback.message) : '',
      },
    };
  }

  function setReviewSessionPending(uiState, itemId, action) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      reviewSession: {
        ...currentState.reviewSession,
        pendingItemId: itemId ? String(itemId) : null,
        pendingAction: action === 'pass' || action === 'reset' ? action : null,
        feedback: {
          kind: 'idle',
          message: '',
        },
      },
    };
  }

  function setReviewSessionFeedback(uiState, kind, message) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      reviewSession: {
        ...currentState.reviewSession,
        pendingItemId: null,
        pendingAction: null,
        feedback: {
          kind,
          message: String(message || ''),
        },
      },
    };
  }

  function clearReviewSessionFeedback(uiState) {
    return setReviewSessionFeedback(uiState, 'idle', '');
  }

  function setReviewComposerType(uiState, type) {
    const currentState = createDashboardUiState(uiState);
    const selectedType = REVIEW_TYPE_ORDER.includes(type) ? type : currentState.reviewComposer.selectedType;

    return {
      ...currentState,
      reviewComposer: {
        ...currentState.reviewComposer,
        selectedType,
        feedback: {
          kind: 'idle',
          message: '',
        },
      },
    };
  }

  function setReviewComposerField(uiState, fieldName, value) {
    const currentState = createDashboardUiState(uiState);
    const composer = createReviewComposerState(currentState.reviewComposer);
    const selectedType = composer.selectedType;

    if (!Object.prototype.hasOwnProperty.call(composer.drafts[selectedType], fieldName)) {
      return currentState;
    }

    return {
      ...currentState,
      reviewComposer: {
        ...composer,
        drafts: {
          ...composer.drafts,
          [selectedType]: {
            ...composer.drafts[selectedType],
            [fieldName]: String(value ?? ''),
          },
        },
        feedback: {
          kind: 'idle',
          message: '',
        },
      },
    };
  }

  function setReviewComposerSubmitting(uiState, submitting) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      reviewComposer: {
        ...currentState.reviewComposer,
        submitting: submitting === true,
      },
    };
  }

  function setReviewComposerFeedback(uiState, kind, message) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      reviewComposer: {
        ...currentState.reviewComposer,
        submitting: false,
        feedback: {
          kind,
          message: String(message || ''),
        },
      },
    };
  }

  function clearReviewComposerDraft(uiState, type) {
    const currentState = createDashboardUiState(uiState);
    const selectedType = REVIEW_TYPE_ORDER.includes(type) ? type : currentState.reviewComposer.selectedType;
    const definition = getReviewTypeDefinition(selectedType);
    const nextDraft = definition.fields.reduce((result, field) => {
      result[field.name] = '';
      return result;
    }, {});

    return {
      ...currentState,
      reviewComposer: {
        ...currentState.reviewComposer,
        submitting: false,
        drafts: {
          ...currentState.reviewComposer.drafts,
          [selectedType]: nextDraft,
        },
      },
    };
  }

  function buildReviewCreatePayload(reviewComposerState) {
    const composer = createReviewComposerState(reviewComposerState);
    const definition = getReviewTypeDefinition(composer.selectedType);
    const draft = composer.drafts[composer.selectedType] || {};
    const payload = { type: composer.selectedType };

    for (const field of definition.fields) {
      const value = typeof draft[field.name] === 'string' ? draft[field.name].trim() : '';

      if (!value) {
        throw new Error(`${field.label} is required.`);
      }

      payload[field.name] = value;
    }

    return payload;
  }

  function normalizeReviewPayload(reviewPayload) {
    const items = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
    const todayCount = Number(reviewPayload?.todayCount);
    const totalActive = Number(reviewPayload?.totalActive);
    const totalCompleted = Number(reviewPayload?.totalCompleted);

    return {
      items,
      todayCount: Number.isFinite(todayCount) ? todayCount : items.length,
      totalActive: Number.isFinite(totalActive) ? totalActive : items.length,
      totalCompleted: Number.isFinite(totalCompleted) ? totalCompleted : 0,
    };
  }

  function getReviewStageGaps(type) {
    return REVIEW_STAGE_GAPS[type] ? [...REVIEW_STAGE_GAPS[type]] : [...REVIEW_STAGE_GAPS.A];
  }

  function formatDayCount(days) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  function getReviewPassSummary(item) {
    const gaps = getReviewStageGaps(item?.type);
    const stage = Number(item?.stage);

    if (!Number.isInteger(stage) || stage < 0) {
      return 'Pass follows the next scheduled interval.';
    }

    if (stage >= gaps.length) {
      return 'Pass completes this item.';
    }

    return `Pass schedules the next review in ${formatDayCount(gaps[stage])}.`;
  }

  function getReviewTypeLabel(type) {
    return getReviewTypeDefinition(type).label;
  }

  function updateReviewDataAfterCreate(data, item) {
    if (!data?.review || data.review.state !== 'ready' || !item) {
      return data;
    }

    const payload = normalizeReviewPayload(data.review.payload);

    return {
      ...data,
      review: {
        ...data.review,
        payload: {
          ...payload,
          totalActive: payload.totalActive + (item.completed ? 0 : 1),
        },
      },
    };
  }

  function updateReviewDataAfterAction(data, itemId, updatedItem) {
    if (!data?.review || data.review.state !== 'ready' || !itemId) {
      return data;
    }

    const payload = normalizeReviewPayload(data.review.payload);
    const existingItem = payload.items.find((item) => item.id === itemId);

    if (!existingItem) {
      return data;
    }

    const nextPayload = {
      ...payload,
      items: payload.items.filter((item) => item.id !== itemId),
      todayCount: Math.max(0, payload.todayCount - 1),
      totalActive: payload.totalActive,
      totalCompleted: payload.totalCompleted,
    };

    if (updatedItem?.completed) {
      nextPayload.totalActive = Math.max(0, nextPayload.totalActive - 1);
      nextPayload.totalCompleted += 1;
    }

    return {
      ...data,
      review: {
        ...data.review,
        payload: nextPayload,
      },
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

  function isRoadmapExpanded(uiState) {
    return createDashboardUiState(uiState).expandedRoadmap === true;
  }

  function toggleRoadmapExpanded(uiState) {
    const currentState = createDashboardUiState(uiState);

    return {
      ...currentState,
      expandedRoadmap: !currentState.expandedRoadmap,
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
      tooltip: normalizeTooltipState(tooltip),
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

  function renderMarkdownLite(value) {
    const raw = String(value ?? '');
    const escaped = escapeHtml(raw);
    // Split on fenced code blocks: ```lang\n...\n```
    const parts = escaped.split(/(```[\s\S]*?```)/g);

    return parts.map((part) => {
      if (/^```/.test(part)) {
        const inner = part.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
        return `<pre class="review-code-block"><code>${inner}</code></pre>`;
      }

      // Inline code: `...` (must be first — protect from later replacements)
      let result = part.replace(/`([^`]+)`/g, '<code class="review-code-inline">$1</code>');
      // Bold: **...**
      result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic: *...*
      result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Process each line: split on // for comment styling, apply symbols only to non-comment part
      return result.split('\n').map((line) => {
        const commentIdx = line.indexOf('//');
        let before = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
        const comment = commentIdx >= 0 ? line.slice(commentIdx) : '';
        // Stylize symbols in the non-comment part
        before = before.replace(/(<[^>]*>|&[a-z]+;)|([()[\]{}\/])/g, (match, skip, sym) => {
          if (skip) return skip;
          return `<span class="review-sym">${sym}</span>`;
        });
        if (comment) {
          return `${before}<span class="review-comment">${comment}</span>`;
        }
        return before;
      }).join('<br>');
    }).join('');
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

  function buildSubmissionTooltipData(point) {
    const title = point.title || point.problemId || 'Unknown problem';
    const body = getSubmissionVerdictLabel(point.verdict);
    const meta = formatTimestamp(point.timestamp);

    return {
      title,
      body,
      meta,
      content: buildSubmissionTooltip({
        ...point,
        title,
      }),
    };
  }

  function buildRatingTrendTooltipData(point) {
    const title = point.contestName || 'Contest';
    const body = `Delta ${formatRatingDelta(point)}`;
    const meta = `Rating ${formatNumber(point.newRating)}`;

    return {
      title,
      body,
      meta,
      content: buildRatingTrendTooltip({
        ...point,
        contestName: title,
      }),
    };
  }

  function buildChartAreaPath(points, baselineY) {
    if (!Array.isArray(points) || points.length === 0) {
      return '';
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const commands = [`M ${firstPoint.x} ${baselineY}`, `L ${firstPoint.x} ${firstPoint.y}`];

    points.slice(1).forEach((point) => {
      commands.push(`L ${point.x} ${point.y}`);
    });

    commands.push(`L ${lastPoint.x} ${baselineY}`, 'Z');
    return commands.join(' ');
  }

  function renderTooltipInner(tooltip) {
    const normalizedTooltip = normalizeTooltipState(tooltip);

    if (!normalizedTooltip.title && !normalizedTooltip.body && !normalizedTooltip.meta) {
      return normalizedTooltip.content ? `<p class="dashboard-tooltip-body">${escapeHtml(normalizedTooltip.content)}</p>` : '';
    }

    return [
      normalizedTooltip.title ? `<p class="dashboard-tooltip-title">${escapeHtml(normalizedTooltip.title)}</p>` : '',
      normalizedTooltip.body ? `<p class="dashboard-tooltip-body">${escapeHtml(normalizedTooltip.body)}</p>` : '',
      normalizedTooltip.meta ? `<p class="dashboard-tooltip-meta">${escapeHtml(normalizedTooltip.meta)}</p>` : '',
    ].join('');
  }

  function getTooltipLayerStyle(tooltip) {
    const normalizedTooltip = normalizeTooltipState(tooltip);

    if (!Number.isFinite(normalizedTooltip.x) || !Number.isFinite(normalizedTooltip.y)) {
      return '';
    }

    return `left:${normalizedTooltip.x}px;top:${normalizedTooltip.y}px;`;
  }

  function renderTooltipLayer(tooltip) {
    const normalizedTooltip = normalizeTooltipState(tooltip);
    const inlineStyle = getTooltipLayerStyle(normalizedTooltip);

    return [
      `<div class="dashboard-tooltip-layer" data-dashboard-tooltip-layer data-visible="${normalizedTooltip.visible ? 'true' : 'false'}" aria-hidden="${normalizedTooltip.visible ? 'false' : 'true'}"${inlineStyle ? ` style="${escapeHtml(inlineStyle)}"` : ''}>`,
      renderTooltipInner(normalizedTooltip),
      '</div>',
    ].join('');
  }

  function getTooltipPosition(event, env) {
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return {};
    }

    const viewportWidth = Math.max(Number(env?.innerWidth) || 0, TOOLTIP_ESTIMATED_WIDTH + 24);
    const viewportHeight = Math.max(Number(env?.innerHeight) || 0, TOOLTIP_ESTIMATED_HEIGHT + 24);
    const maxX = Math.max(12, viewportWidth - TOOLTIP_ESTIMATED_WIDTH - 12);
    const maxY = Math.max(12, viewportHeight - TOOLTIP_ESTIMATED_HEIGHT - 12);

    return {
      x: Math.min(Math.max(clientX + TOOLTIP_OFFSET_X, 12), maxX),
      y: Math.min(Math.max(clientY + TOOLTIP_OFFSET_Y, 12), maxY),
    };
  }

  function readTooltipTarget(target) {
    if (!target || typeof target.getAttribute !== 'function') {
      return null;
    }

    return normalizeTooltipState({
      panelName: target.getAttribute('data-tooltip-panel'),
      key: target.getAttribute('data-tooltip-key'),
      title: target.getAttribute('data-tooltip-title'),
      body: target.getAttribute('data-tooltip-body'),
      meta: target.getAttribute('data-tooltip-meta'),
      content: target.getAttribute('data-tooltip-content'),
    });
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

  function renderReviewComposerPanel(uiState) {
    const composer = createReviewComposerState(uiState?.reviewComposer);
    const definition = getReviewTypeDefinition(composer.selectedType);
    const draft = composer.drafts[composer.selectedType] || {};
    const typeButtons = REVIEW_TYPE_ORDER.map((type) => {
      const active = composer.selectedType === type;
      const typeDefinition = getReviewTypeDefinition(type);

      return [
        `<button class="review-type-button${active ? ' is-active' : ''}" type="button" data-review-type="${escapeHtml(type)}" aria-pressed="${active ? 'true' : 'false'}">`,
        `  <span class="review-type-button-code">${escapeHtml(type)}</span>`,
        `  <span class="review-type-button-label">${escapeHtml(typeDefinition.label)}</span>`,
        '</button>',
      ].join('');
    }).join('');
    const fieldMarkup = definition.fields.map((field) => {
      const fieldValue = escapeHtml(draft[field.name] || '');
      const disabled = composer.submitting ? ' disabled' : '';

      if (field.multiline) {
        return [
          `<label class="review-field" data-review-field-group="${escapeHtml(field.name)}">`,
          `  <span class="review-field-label">${escapeHtml(field.label)}</span>`,
          `  <textarea class="review-input review-input-multiline" name="${escapeHtml(field.name)}" data-review-field="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder)}" autocomplete="off" rows="3"${disabled}>${fieldValue}</textarea>`,
          '</label>',
        ].join('');
      }

      return [
        `<label class="review-field" data-review-field-group="${escapeHtml(field.name)}">`,
        `  <span class="review-field-label">${escapeHtml(field.label)}</span>`,
        `  <textarea class="review-input review-input-single" name="${escapeHtml(field.name)}" data-review-field="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder)}" autocomplete="off" rows="1"${disabled}>${fieldValue}</textarea>`,
        '</label>',
      ].join('');
    }).join('');
    const feedbackMarkup = composer.feedback.kind !== 'idle' && composer.feedback.message
      ? `<p class="review-feedback review-feedback-${escapeHtml(composer.feedback.kind)}" role="${composer.feedback.kind === 'error' ? 'alert' : 'status'}">${escapeHtml(composer.feedback.message)}</p>`
      : '';

    const draftValues = definition.fields.map((f) => draft[f.name] || '');
    const hasPreviewContent = draftValues.some((v) => v.trim());
    const previewMarkup = hasPreviewContent
      ? [
          '<div class="review-preview">',
          '  <p class="review-preview-label">Preview</p>',
          `  <div class="review-preview-content">${renderMarkdownLite(draftValues.join('\n\n'))}</div>`,
          '</div>',
        ].join('')
      : '';

    return renderPanelFrame(
      'review-entry',
      'Add Review',
      'Spaced review',
      [
        '<form class="review-form" data-review-form="true">',
        '  <p class="panel-hint">Capture a new review item in a stable two-field format. New items start at stage 0 and are scheduled for tomorrow.</p>',
        `  <div class="review-type-switcher" aria-label="Review type">${typeButtons}</div>`,
        `  <p class="review-format-hint">Format: ${escapeHtml(definition.format)}</p>`,
        `  <div class="review-fields">${fieldMarkup}</div>`,
        `  ${previewMarkup}`,
        `  ${feedbackMarkup}`,
        '  <div class="review-form-actions">',
        `    <button class="panel-toggle review-submit-button" type="submit"${composer.submitting ? ' disabled' : ''}>${composer.submitting ? 'Adding...' : 'Add Review'}</button>`,
        '  </div>',
        '</form>',
      ].join(''),
      'panel-review-entry'
    );
  }

  function renderReviewSessionPanel(reviewPayload, uiState) {
    const review = normalizeReviewPayload(reviewPayload);
    const reviewSession = createReviewSessionState(uiState?.reviewSession);
    const backlogCount = Math.max(0, review.todayCount - review.items.length);
    const reviewSummaryMarkup = [
      '<div class="review-session-summary">',
      `  <p class="panel-hint">Showing today\'s due reviews from the server queue. No defer button exists here: if you leave an item untouched, it stays in rotation and can reappear on later dates under the server scheduling rules.</p>`,
      '  <div class="review-session-meta">',
      `    <span class="review-meta-chip">Visible today: ${escapeHtml(String(review.items.length))}</span>`,
      `    <span class="review-meta-chip">Due before cap: ${escapeHtml(String(review.todayCount))}</span>`,
      `    <span class="review-meta-chip">Active total: ${escapeHtml(String(review.totalActive))}</span>`,
      '  </div>',
      '  <ul class="review-rules">',
      '    <li>A/B/C intervals: 1, 3, 7, 21 days.</li>',
      '    <li>D intervals: 1, 3, 7, 14, 21 days.</li>',
      `    <li>Daily backlog cap: the server returns at most ${escapeHtml(String(REVIEW_PANEL_MAX_ITEMS))} items and keeps the original order.</li>`,
      backlogCount > 0
        ? `    <li>Backlog active: showing ${escapeHtml(String(review.items.length))} of ${escapeHtml(String(review.todayCount))} due items; the remaining ${escapeHtml(String(backlogCount))} roll forward by server rules.</li>`
        : '    <li>If you do nothing, the item is not lost; it remains governed by the next server-side schedule check.</li>',
      '  </ul>',
      '</div>',
    ].join('');
    const feedbackMarkup = reviewSession.feedback.kind !== 'idle' && reviewSession.feedback.message
      ? `<p class="review-feedback review-feedback-${escapeHtml(reviewSession.feedback.kind)}" role="${reviewSession.feedback.kind === 'error' ? 'alert' : 'status'}">${escapeHtml(reviewSession.feedback.message)}</p>`
      : '';

    if (review.items.length === 0) {
      return renderPanelFrame(
        'review-session',
        'Today Review',
        'Up to 10 due items',
        `${reviewSummaryMarkup}${feedbackMarkup}${renderPanelStatus('empty', 'No review items are due right now.')}`,
        'panel-review-session'
      );
    }

    const itemsMarkup = review.items.map((item) => {
      const pending = reviewSession.pendingItemId === item.id;
      const passLabel = pending && reviewSession.pendingAction === 'pass' ? 'Passing...' : 'Pass';
      const resetLabel = pending && reviewSession.pendingAction === 'reset' ? 'Resetting...' : 'Reset';

      return [
        `<article class="review-item-card" data-review-item="${escapeHtml(item.id)}">`,
        '  <div class="review-item-header">',
        '    <div class="review-item-badges">',
        `      <span class="review-type-pill">${escapeHtml(item.type)} · ${escapeHtml(getReviewTypeLabel(item.type))}</span>`,
        `      <span class="review-stage-pill">Stage ${escapeHtml(String(item.stage))}</span>`,
        '    </div>',
        `    <p class="review-item-date">Due ${escapeHtml(item.nextReviewDate || 'today')}</p>`,
        '  </div>',
        `  <div class="review-item-content">${renderMarkdownLite(item.content || '')}</div>`,
        `  <p class="review-item-semantic">${escapeHtml(getReviewPassSummary(item))} Reset sends it back to stage 0 for tomorrow.</p>`,
        '  <div class="review-item-actions">',
        `    <button class="panel-toggle review-action-button review-action-pass" type="button" data-review-item-id="${escapeHtml(item.id)}" data-review-action="pass"${pending ? ' disabled' : ''}>${escapeHtml(passLabel)}</button>`,
        `    <button class="panel-toggle review-action-button review-action-reset" type="button" data-review-item-id="${escapeHtml(item.id)}" data-review-action="reset"${pending ? ' disabled' : ''}>${escapeHtml(resetLabel)}</button>`,
        '  </div>',
        '</article>',
      ].join('');
    }).join('');

    return renderPanelFrame(
      'review-session',
      'Today Review',
      'Up to 10 due items',
      `${reviewSummaryMarkup}${feedbackMarkup}<div class="review-session-list">${itemsMarkup}</div>`,
      'panel-review-session'
    );
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

    const areaPath = buildChartAreaPath(geometry.points, geometry.height - geometry.padding.bottom);

    const pointMarkup = geometry.points.map((point, index) => {
      const tooltip = buildRatingTrendTooltipData(point);

      return [
        `<g class="trend-point-group" data-contest-name="${escapeHtml(point.contestName)}" data-tooltip-panel="rating-trend" data-tooltip-key="rating-trend-${escapeHtml(index)}" data-tooltip-title="${escapeHtml(tooltip.title)}" data-tooltip-body="${escapeHtml(tooltip.body)}" data-tooltip-meta="${escapeHtml(tooltip.meta)}" data-tooltip-content="${escapeHtml(tooltip.content)}">`,
        `  <circle class="trend-point" cx="${point.x}" cy="${point.y}" r="5">`,
        '  </circle>',
        '</g>',
      ].join('');
    }).join('');

    return renderPanelFrame(
      'rating-trend',
      'Rating Trend',
      'Contests',
      [
        `<svg class="trend-chart" viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-label="Rating trend chart">`,
        '  <defs>',
        '    <linearGradient id="rating-trend-fill" x1="0" y1="0" x2="0" y2="1">',
        '      <stop offset="0%" stop-color="#8a7db3" stop-opacity="0.42"></stop>',
        '      <stop offset="100%" stop-color="#8a7db3" stop-opacity="0"></stop>',
        '    </linearGradient>',
        '  </defs>',
        gridLines,
        `<path class="trend-area" d="${escapeHtml(areaPath)}"></path>`,
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

  function getRoadmapVisibleStages(stages, uiState) {
    const roadmapStages = Array.isArray(stages) ? stages : [];

    if (roadmapStages.length <= ROADMAP_VISIBLE_STAGE_COUNT || isRoadmapExpanded(uiState)) {
      return roadmapStages;
    }

    const currentStageIndex = roadmapStages.findIndex((stage) => stage?.isCurrentStage);

    if (currentStageIndex === -1) {
      return roadmapStages.slice(0, ROADMAP_VISIBLE_STAGE_COUNT);
    }

    let startIndex = Math.max(currentStageIndex - Math.floor(ROADMAP_VISIBLE_STAGE_COUNT / 2), 0);
    let endIndex = startIndex + ROADMAP_VISIBLE_STAGE_COUNT;

    if (endIndex > roadmapStages.length) {
      endIndex = roadmapStages.length;
      startIndex = Math.max(endIndex - ROADMAP_VISIBLE_STAGE_COUNT, 0);
    }

    return roadmapStages.slice(startIndex, endIndex);
  }

  function renderRoadmapPanel(roadmap, uiState) {
    const stages = Array.isArray(roadmap?.items) ? roadmap.items : [];
    const visibleStages = getRoadmapVisibleStages(stages, uiState);
    const roadmapExpanded = isRoadmapExpanded(uiState);
    const canToggleRoadmapWindow = stages.length > ROADMAP_VISIBLE_STAGE_COUNT;
    const body = stages.length === 0
      ? renderPanelStatus('empty', 'Roadmap data is not available.')
      : [
          `<div class="roadmap-panel-stack" data-roadmap-state="${roadmapExpanded ? 'expanded' : 'collapsed'}">`,
          `  <div class="roadmap-grid">${visibleStages.map((stage) => [
              `<article class="${getRoadmapStageClasses(stage)}" data-stage-id="${escapeHtml(stage.stageId)}">`,
              `  <p class="roadmap-stage-index">Stage ${escapeHtml(stage.stageId)}</p>`,
              `  <h3 class="roadmap-stage-name">${escapeHtml(stage.stageName)}</h3>`,
              `  <p class="roadmap-stage-tag">${escapeHtml(stage.tag || 'n/a')}</p>`,
              `  <p class="roadmap-stage-progress">${escapeHtml(formatNumber(stage.acceptedProgress))} / ${escapeHtml(formatNumber(stage.target))}</p>`,
              '</article>',
            ].join('')).join('')}</div>`,
          canToggleRoadmapWindow
            ? [
                '  <div class="roadmap-disclosure">',
                `    <p class="roadmap-context">${roadmapExpanded ? `Showing all ${escapeHtml(formatNumber(stages.length))} stages.` : `Showing ${ROADMAP_VISIBLE_STAGE_COUNT} stages around the current focus.`}</p>`,
                `    <button class="panel-toggle roadmap-toggle" type="button" data-dashboard-roadmap-toggle="true" aria-expanded="${roadmapExpanded ? 'true' : 'false'}">${roadmapExpanded ? `Show focused ${ROADMAP_VISIBLE_STAGE_COUNT}-stage view` : `Show all ${escapeHtml(formatNumber(stages.length))} stages`}</button>`,
                '  </div>',
              ].join('')
            : '',
          '</div>',
        ].join('');

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

    const points = geometry.points.map((point, index) => {
      const tooltip = buildSubmissionTooltipData(point);

      return [
        `<g class="timeline-point-group" data-problem-id="${escapeHtml(point.problemId)}" data-verdict="${escapeHtml(point.verdictLabel)}" data-tooltip-panel="submission-timeline" data-tooltip-key="submission-timeline-${escapeHtml(index)}" data-tooltip-title="${escapeHtml(tooltip.title)}" data-tooltip-body="${escapeHtml(tooltip.body)}" data-tooltip-meta="${escapeHtml(tooltip.meta)}" data-tooltip-content="${escapeHtml(tooltip.content)}">`,
        `  <circle class="timeline-point" cx="${point.x}" cy="${point.y}" r="7" fill="${escapeHtml(point.color)}" data-x="${escapeHtml(point.x)}" data-y="${escapeHtml(point.y)}">`,
        '  </circle>',
        '</g>',
      ].join('');
    }).join('');

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
    const normalizedUiState = createDashboardUiState(uiState);
    const tooltipState = normalizedUiState.tooltip || {};
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
          return renderTagAbilityPanel(tagStats, normalizedUiState);
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
          return renderWeakAnalysisPanel(weak, normalizedUiState);
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
          return renderSubmissionTimelinePanel(submissions, normalizedUiState);
        },
      }),
    ].join('');
    const secondaryColumnPanels = [
      renderPanelResource(data.review, {
        panelName: 'review-session',
        title: 'Today Review',
        subtitle: 'Up to 10 due items',
        className: 'panel-review-session',
        loadingMessage: 'Loading today\'s review queue...',
        errorMessage: 'Today\'s review queue is unavailable.',
        renderer(review) {
          return renderReviewSessionPanel(review, normalizedUiState);
        },
      }),
      renderReviewComposerPanel(normalizedUiState),
      renderPanelResource(data.roadmap, {
        panelName: 'roadmap',
        title: 'Roadmap',
        subtitle: '20 stages',
        className: 'panel-roadmap',
        loadingMessage: 'Loading roadmap progress...',
        errorMessage: 'Roadmap data is unavailable.',
        renderer(roadmap) {
          return renderRoadmapPanel(roadmap, normalizedUiState);
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
          return renderRatingBucketPanel(ratingBuckets, normalizedUiState);
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
          return renderNextProblemPanel(next, normalizedUiState);
        },
      }),
    ].join('');

    return [
      `<div class="dashboard-shell dashboard-shell-readable" data-dashboard-layout="masonry" data-dashboard-profile-pinned="${normalizedUiState.profilePinned === true ? 'true' : 'false'}" data-dashboard-tooltip-visible="${tooltipState.visible === true ? 'true' : 'false'}">`,
      renderPanelResource(data.profile, {
        panelName: 'profile',
        title: 'Profile',
        subtitle: 'Profile',
        className: 'panel-profile',
        loadingMessage: 'Loading profile summary...',
        errorMessage: 'Profile data is unavailable.',
        renderer(profile) {
          return renderProfileBar(profile, normalizedUiState);
        },
      }),
      '<div class="dashboard-grid dashboard-grid-masonry">',
      `  <div class="dashboard-column dashboard-column-primary" data-dashboard-column="primary">${primaryColumnPanels}</div>`,
      `  <div class="dashboard-column dashboard-column-secondary" data-dashboard-column="secondary">${secondaryColumnPanels}</div>`,
      '</div>',
      renderTooltipLayer(tooltipState),
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
      tooltipLayer.innerHTML = renderTooltipInner(tooltip);
      tooltipLayer.setAttribute('data-visible', tooltip.visible ? 'true' : 'false');
      tooltipLayer.setAttribute('aria-hidden', tooltip.visible ? 'false' : 'true');
      tooltipLayer.setAttribute('style', getTooltipLayerStyle(tooltip));
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

    function toggleRoadmapDisclosure() {
      controllerState.uiState = toggleRoadmapExpanded(controllerState.uiState);
      return render();
    }

    function showTooltip(tooltip) {
      controllerState.uiState = setTooltipState(controllerState.uiState, {
        visible: true,
        panelName: tooltip?.panelName,
        key: tooltip?.key,
        title: tooltip?.title,
        body: tooltip?.body,
        meta: tooltip?.meta,
        content: tooltip?.content,
        x: tooltip?.x,
        y: tooltip?.y,
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

    function setReviewType(type) {
      controllerState.uiState = setReviewComposerType(controllerState.uiState, type);
      return render();
    }

    function updateReviewField(fieldName, value) {
      controllerState.uiState = setReviewComposerField(controllerState.uiState, fieldName, value);
      // Intentionally skip render() — the input already shows the typed value.
      // A full render() would replace the entire DOM via innerHTML, destroying
      // the focused input element and causing it to lose focus after every keystroke.
      return controllerState.uiState;
    }

    async function submitReviewAction(itemId, action) {
      if (!itemId) {
        return { ok: false, error: new Error('Review item id is required.') };
      }

      if (action !== 'pass' && action !== 'reset') {
        return { ok: false, error: new Error('Review action must be pass or reset.') };
      }

      if (!env || typeof env.fetch !== 'function') {
        const error = new Error('Review actions are unavailable because fetch is missing.');
        controllerState.uiState = setReviewSessionFeedback(controllerState.uiState, 'error', error.message);
        render();
        return { ok: false, error };
      }

      controllerState.uiState = setReviewSessionPending(controllerState.uiState, itemId, action);
      render();

      try {
        const response = await env.fetch(`/api/review/${encodeURIComponent(itemId)}/${action}`, {
          method: 'POST',
        });
        const result = await readJsonResponse(response, `/api/review/${itemId}/${action}`);

        controllerState.data = updateReviewDataAfterAction(controllerState.data, itemId, result?.item);
        controllerState.uiState = setReviewSessionFeedback(
          controllerState.uiState,
          'success',
          result?.message || (action === 'pass' ? 'Review item advanced.' : 'Review item reset.')
        );
        render();

        return {
          ok: true,
          item: result?.item || null,
          payload: result,
        };
      } catch (error) {
        controllerState.uiState = setReviewSessionFeedback(controllerState.uiState, 'error', error.message);
        render();
        return { ok: false, error };
      }
    }

    async function submitReview() {
      if (!env || typeof env.fetch !== 'function') {
        controllerState.uiState = setReviewComposerFeedback(
          controllerState.uiState,
          'error',
          'Review creation is unavailable because fetch is missing.'
        );
        render();
        return { ok: false, error: new Error('Review creation is unavailable because fetch is missing.') };
      }

      let payload;

      try {
        payload = buildReviewCreatePayload(controllerState.uiState.reviewComposer);
      } catch (error) {
        controllerState.uiState = setReviewComposerFeedback(controllerState.uiState, 'error', error.message);
        render();
        return { ok: false, error };
      }

      controllerState.uiState = setReviewComposerSubmitting(controllerState.uiState, true);
      render();

      try {
        const response = await env.fetch('/api/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const result = await readJsonResponse(response, '/api/review');

        controllerState.uiState = clearReviewComposerDraft(controllerState.uiState, payload.type);
        controllerState.uiState = setReviewComposerFeedback(
          controllerState.uiState,
          'success',
          `Created review item for ${result?.item?.nextReviewDate || 'tomorrow'}.`
        );
        controllerState.data = updateReviewDataAfterCreate(controllerState.data, result?.item);
        render();

        return {
          ok: true,
          item: result?.item || null,
          payload: result,
        };
      } catch (error) {
        controllerState.uiState = setReviewComposerFeedback(controllerState.uiState, 'error', error.message);
        render();
        return { ok: false, error };
      }
    }

    function getState() {
      return createDashboardUiState(controllerState.uiState);
    }

    function attachListeners() {
      if (!root || typeof root.addEventListener !== 'function' || controllerState.listenersAttached) {
        return;
      }

      const handleClick = (event) => {
        const reviewTypeButton = findClosestAttributeTarget(event.target, 'data-review-type');

        if (reviewTypeButton && typeof reviewTypeButton.getAttribute === 'function') {
          setReviewType(reviewTypeButton.getAttribute('data-review-type'));
          return;
        }

        const reviewActionButton = findClosestAttributeTarget(event.target, 'data-review-action');

        if (reviewActionButton && typeof reviewActionButton.getAttribute === 'function') {
          submitReviewAction(
            reviewActionButton.getAttribute('data-review-item-id'),
            reviewActionButton.getAttribute('data-review-action')
          ).catch(() => null);
          return;
        }

        const roadmapToggleButton = findClosestAttributeTarget(event.target, 'data-dashboard-roadmap-toggle');

        if (roadmapToggleButton) {
          toggleRoadmapDisclosure();
          return;
        }

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

      const handleInput = (event) => {
        const field = findClosestAttributeTarget(event.target, 'data-review-field');

        if (!field || typeof field.getAttribute !== 'function') {
          return;
        }

        updateReviewField(field.getAttribute('data-review-field'), event.target?.value);

        // Auto-resize textarea
        if (event.target?.tagName === 'TEXTAREA') {
          event.target.style.height = 'auto';
          event.target.style.height = event.target.scrollHeight + 'px';
        }

        // Update live preview without full re-render (preserves focus)
        const previewEl = root.querySelector('.review-preview-content');
        const previewWrapper = root.querySelector('.review-preview');
        const allFields = root.querySelectorAll('[data-review-field]');
        const values = Array.from(allFields).map((el) => el.value || '');
        const hasContent = values.some((v) => v.trim());
        if (hasContent) {
          if (!previewWrapper) {
            // Preview doesn't exist yet — need a full render to create it
            render();
            // Restore focus to the field that was being typed in
            const restored = root.querySelector(`[data-review-field="${field.getAttribute('data-review-field')}"]`);
            if (restored) restored.focus();
          } else if (previewEl) {
            previewEl.innerHTML = renderMarkdownLite(values.join('\n\n'));
          }
        } else if (previewWrapper) {
          previewWrapper.remove();
        }
      };

      const handleSubmit = (event) => {
        const form = findClosestAttributeTarget(event.target, 'data-review-form');

        if (!form) {
          return;
        }

        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }

        submitReview().catch(() => null);
      };

      const handleMouseOver = (event) => {
        const tooltipTarget = findClosestAttributeTarget(event.target, TOOLTIP_TARGET_ATTRIBUTE);

        if (!tooltipTarget || typeof tooltipTarget.getAttribute !== 'function') {
          return;
        }

        showTooltip({
          ...readTooltipTarget(tooltipTarget),
          ...getTooltipPosition(event, env),
        });
      };

      const handleMouseMove = (event) => {
        const tooltipTarget = findClosestAttributeTarget(event.target, TOOLTIP_TARGET_ATTRIBUTE);

        if (!tooltipTarget) {
          return;
        }

        showTooltip({
          ...readTooltipTarget(tooltipTarget),
          ...getTooltipPosition(event, env),
        });
      };

      const handleMouseOut = (event) => {
        const tooltipTarget = findClosestAttributeTarget(event.target, TOOLTIP_TARGET_ATTRIBUTE);

        if (!tooltipTarget) {
          return;
        }

        const nextTooltipTarget = findClosestAttributeTarget(event.relatedTarget, TOOLTIP_TARGET_ATTRIBUTE);

        if (
          nextTooltipTarget
          && typeof tooltipTarget.getAttribute === 'function'
          && typeof nextTooltipTarget.getAttribute === 'function'
          && tooltipTarget.getAttribute('data-tooltip-key') === nextTooltipTarget.getAttribute('data-tooltip-key')
        ) {
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
      root.addEventListener('input', handleInput);
      root.addEventListener('mouseover', handleMouseOver);
      root.addEventListener('mousemove', handleMouseMove);
      root.addEventListener('mouseout', handleMouseOut);
      root.addEventListener('submit', handleSubmit);
      controllerState.teardownCallbacks.push(() => root.removeEventListener('click', handleClick));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('input', handleInput));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('mouseover', handleMouseOver));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('mousemove', handleMouseMove));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('mouseout', handleMouseOut));
      controllerState.teardownCallbacks.push(() => root.removeEventListener('submit', handleSubmit));

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
      submitReviewAction,
      setData,
      setProfilePinned,
      setReviewType,
      showTooltip,
      submitReview,
      toggleRoadmapDisclosure,
      toggleTagAbilityDisclosure,
      togglePanel,
      updateReviewField,
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
    REVIEW_TYPE_DEFINITIONS,
    REVIEW_TYPE_ORDER,
    bootstrapDashboard,
    buildReviewCreatePayload,
    buildRatingTrendGeometry,
    buildRatingTrendTooltip,
    buildRatingTrendTooltipData,
    buildScatterGeometry,
    buildSubmissionTimelineGeometry,
    buildSubmissionTooltip,
    buildSubmissionTooltipData,
    buildTooltipContent,
    buildChartAreaPath,
    clearTooltipState,
    clearReviewSessionFeedback,
    createDashboardController,
    createReviewComposerState,
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
    getRoadmapVisibleStages,
    getReviewTypeDefinition,
    getRoadmapStageClasses,
    getSubmissionVerdictColor,
    getSubmissionVerdictLabel,
    isPanelCollapsible,
    isPanelExpanded,
    isRoadmapExpanded,
    isTagAbilityExpanded,
    loadDashboardData,
    ROADMAP_VISIBLE_STAGE_COUNT,
    renderDashboard,
    renderErrorState,
    renderLoadingState,
    renderNextProblemPanel,
    renderPanelFrame,
    renderPanelResource,
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
    setReviewComposerField,
    setReviewComposerFeedback,
    setReviewComposerSubmitting,
    setReviewComposerType,
    setReviewSessionFeedback,
    setReviewSessionPending,
    setProfilePinnedState,
    setTooltipState,
    sortTagStats,
    TAG_ABILITY_VISIBLE_COUNT,
    clearReviewComposerDraft,
    toggleRoadmapExpanded,
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
