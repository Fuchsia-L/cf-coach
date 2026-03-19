const { REVIEW_TYPES } = require('./review-schema');
const { addDays } = require('./review-scheduling');

const REVIEW_CREATE_DEFINITIONS = Object.freeze({
  A: Object.freeze({
    label: 'Syntax',
    format: '语法名称 + 用法说明',
    fields: Object.freeze([
      Object.freeze({
        name: 'syntaxName',
        label: 'Syntax name',
        placeholder: 'lower_bound',
      }),
      Object.freeze({
        name: 'usageNote',
        label: 'Usage note',
        placeholder: 'Returns the first iterator >= value.',
      }),
    ]),
    composeContent(values) {
      return `${values.syntaxName} — ${values.usageNote}`;
    },
  }),
  B: Object.freeze({
    label: 'Strategy',
    format: '题目描述 + 解题策略',
    fields: Object.freeze([
      Object.freeze({
        name: 'problemContext',
        label: 'Problem context',
        placeholder: 'CF 1735C — LCM + grouping',
      }),
      Object.freeze({
        name: 'strategy',
        label: 'Strategy',
        placeholder: 'Think DSU and greedily merge by lexicographic order.',
      }),
    ]),
    composeContent(values) {
      return `${values.problemContext} — ${values.strategy}`;
    },
  }),
  C: Object.freeze({
    label: 'Pitfall',
    format: '踩坑原因 + 下次如何避免',
    fields: Object.freeze([
      Object.freeze({
        name: 'pitfall',
        label: 'Pitfall',
        placeholder: 'Array out of bounds in DSU find.',
      }),
      Object.freeze({
        name: 'prevention',
        label: 'Avoid next time',
        placeholder: 'Write asserts before the first full submission.',
      }),
    ]),
    composeContent(values) {
      return `${values.pitfall} — ${values.prevention}`;
    },
  }),
  D: Object.freeze({
    label: 'Knowledge',
    format: '解决哪种问题 + 简易写法',
    fields: Object.freeze([
      Object.freeze({
        name: 'problemType',
        label: 'Problem type',
        placeholder: 'Interval merge',
      }),
      Object.freeze({
        name: 'snippet',
        label: 'Simple pattern',
        placeholder: 'Sort by left endpoint, then merge overlaps.',
      }),
    ]),
    composeContent(values) {
      return `${values.problemType} — ${values.snippet}`;
    },
  }),
});

class ReviewCreateError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ReviewCreateError';
    this.code = 'INVALID_REVIEW_PAYLOAD';
    this.details = details;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getReviewCreateDefinition(type) {
  const normalizedType = typeof type === 'string' ? type.trim().toUpperCase() : '';
  const definition = REVIEW_CREATE_DEFINITIONS[normalizedType];

  if (!definition) {
    throw new ReviewCreateError('type must be A, B, C, or D.', { field: 'type' });
  }

  return {
    type: normalizedType,
    ...definition,
  };
}

function resolveNow(now = Date.now()) {
  if (now instanceof Date) {
    return new Date(now.getTime());
  }

  if (typeof now === 'string' || typeof now === 'number') {
    const resolved = new Date(now);

    if (!Number.isNaN(resolved.getTime())) {
      return resolved;
    }
  }

  throw new TypeError('now must be a valid Date, timestamp, or ISO timestamp string.');
}

function createReviewId(now, existingIds = []) {
  const knownIds = new Set(Array.isArray(existingIds) ? existingIds : []);
  const baseId = `r_${now.getTime()}`;

  if (!knownIds.has(baseId)) {
    return baseId;
  }

  let suffix = 1;

  while (knownIds.has(`${baseId}_${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}_${suffix}`;
}

function normalizeCreateFields(definition, payload) {
  const allowedFields = new Set(['type', ...definition.fields.map((field) => field.name)]);

  for (const key of Object.keys(payload)) {
    if (!allowedFields.has(key)) {
      throw new ReviewCreateError(`Unexpected review payload field: ${key}.`, {
        field: key,
        type: definition.type,
      });
    }
  }

  return definition.fields.reduce((result, field) => {
    if (!isNonEmptyString(payload[field.name])) {
      throw new ReviewCreateError(`${field.label} is required.`, {
        field: field.name,
        type: definition.type,
      });
    }

    result[field.name] = payload[field.name].trim();
    return result;
  }, {});
}

function createReviewItem(payload, options = {}) {
  if (!isPlainObject(payload)) {
    throw new ReviewCreateError('Review payload must be an object.');
  }

  const definition = getReviewCreateDefinition(payload.type);
  const normalizedFields = normalizeCreateFields(definition, payload);
  const now = resolveNow(options.now);
  const createdAt = now.toISOString();
  const today = createdAt.slice(0, 10);
  const existingIds = Array.isArray(options.existingIds)
    ? options.existingIds
    : Array.isArray(options.items)
      ? options.items.map((item) => item && item.id).filter(Boolean)
      : [];

  return {
    id: createReviewId(now, existingIds),
    type: definition.type,
    content: definition.composeContent(normalizedFields),
    stage: 0,
    nextReviewDate: addDays(today, 1),
    completed: false,
    createdAt,
  };
}

module.exports = {
  REVIEW_CREATE_DEFINITIONS,
  ReviewCreateError,
  createReviewItem,
  createReviewId,
  getReviewCreateDefinition,
  resolveNow,
};
