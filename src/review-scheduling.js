const { assertValidReviewItem, isIsoDateString } = require('./review-schema');

const MAX_REVIEWS_PER_DAY = 10;

const REVIEW_STAGE_GAPS = Object.freeze({
  A: Object.freeze([1, 3, 7, 21]),
  B: Object.freeze([1, 3, 7, 21]),
  C: Object.freeze([1, 3, 7, 21]),
  D: Object.freeze([1, 3, 7, 14, 21]),
});

function normalizeToday(today) {
  if (!isIsoDateString(today)) {
    throw new TypeError('today must be an ISO date string (YYYY-MM-DD).');
  }

  return today;
}

function parseIsoDate(dateString) {
  if (!isIsoDateString(dateString)) {
    throw new TypeError('dateString must be an ISO date string (YYYY-MM-DD).');
  }

  return new Date(`${dateString}T00:00:00.000Z`);
}

function addDays(dateString, days) {
  const date = parseIsoDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getReviewStageGaps(type) {
  const gaps = REVIEW_STAGE_GAPS[type];

  if (!gaps) {
    throw new TypeError('type must be A, B, C, or D.');
  }

  return [...gaps];
}

function getEffectiveReviewDate(item, today) {
  if (item.completed) {
    return item.nextReviewDate;
  }

  return item.nextReviewDate < today ? today : item.nextReviewDate;
}

function compareReviewItems(left, right, today) {
  return getEffectiveReviewDate(left, today).localeCompare(getEffectiveReviewDate(right, today))
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id);
}

function advanceReviewItem(item, options = {}) {
  const validatedItem = assertValidReviewItem(item);
  const today = normalizeToday(options.today);

  if (validatedItem.completed) {
    return { ...validatedItem };
  }

  const gaps = getReviewStageGaps(validatedItem.type);

  if (validatedItem.stage >= gaps.length) {
    return {
      ...validatedItem,
      completed: true,
    };
  }

  return {
    ...validatedItem,
    stage: validatedItem.stage + 1,
    completed: false,
    nextReviewDate: addDays(today, gaps[validatedItem.stage]),
  };
}

function resetReviewItem(item, options = {}) {
  const validatedItem = assertValidReviewItem(item);
  const today = normalizeToday(options.today);

  return {
    ...validatedItem,
    stage: 0,
    completed: false,
    nextReviewDate: addDays(today, 1),
  };
}

function scheduleReviewItems(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array.');
  }

  const today = normalizeToday(options.today);
  const maxPerDay = options.maxPerDay ?? MAX_REVIEWS_PER_DAY;

  if (!Number.isInteger(maxPerDay) || maxPerDay <= 0) {
    throw new TypeError('maxPerDay must be a positive integer.');
  }

  const indexedItems = items.map((item, index) => ({
    index,
    item: assertValidReviewItem(item),
  }));
  const scheduledByIndex = new Map();
  const dueTodayBeforeCap = [];
  const perDayCounts = new Map();
  const activeEntries = indexedItems
    .filter(({ item }) => !item.completed)
    .sort((left, right) => compareReviewItems(left.item, right.item, today));

  for (const entry of activeEntries) {
    const effectiveDate = getEffectiveReviewDate(entry.item, today);

    if (effectiveDate <= today) {
      dueTodayBeforeCap.push(entry.item);
    }

    let assignedDate = effectiveDate;

    while ((perDayCounts.get(assignedDate) || 0) >= maxPerDay) {
      assignedDate = addDays(assignedDate, 1);
    }

    perDayCounts.set(assignedDate, (perDayCounts.get(assignedDate) || 0) + 1);
    scheduledByIndex.set(entry.index, {
      ...entry.item,
      nextReviewDate: assignedDate,
    });
  }

  for (const entry of indexedItems) {
    if (!scheduledByIndex.has(entry.index)) {
      scheduledByIndex.set(entry.index, { ...entry.item });
    }
  }

  const scheduledItems = indexedItems.map(({ index }) => scheduledByIndex.get(index));
  const dueItems = activeEntries
    .map(({ index }) => scheduledByIndex.get(index))
    .filter((item) => item.nextReviewDate === today);

  return {
    items: scheduledItems,
    dueItems,
    todayCount: dueTodayBeforeCap.length,
    totalActive: activeEntries.length,
    totalCompleted: indexedItems.length - activeEntries.length,
  };
}

function selectReviewsDueToday(items, options = {}) {
  return scheduleReviewItems(items, options);
}

module.exports = {
  MAX_REVIEWS_PER_DAY,
  REVIEW_STAGE_GAPS,
  addDays,
  advanceReviewItem,
  compareReviewItems,
  getEffectiveReviewDate,
  getReviewStageGaps,
  resetReviewItem,
  scheduleReviewItems,
  selectReviewsDueToday,
};
