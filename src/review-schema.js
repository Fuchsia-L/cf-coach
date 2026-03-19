const REVIEW_TYPES = ['A', 'B', 'C', 'D'];
const REVIEW_OPTIONAL_FIELDS = ['sourceProblem', 'note'];

const REVIEW_STAGE_LIMITS = {
  A: { min: 0, max: 4 },
  B: { min: 0, max: 4 },
  C: { min: 0, max: 4 },
  D: { min: 0, max: 5 },
};

const REVIEW_REQUIRED_FIELDS = [
  'id',
  'type',
  'content',
  'stage',
  'nextReviewDate',
  'completed',
  'createdAt',
];

class ReviewValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ReviewValidationError';
    this.code = 'INVALID_REVIEW_ITEM';
    this.details = details;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

function isIsoTimestampString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString() === value;
}

function validateSourceProblem(sourceProblem, context) {
  if (!isPlainObject(sourceProblem)) {
    throw new ReviewValidationError('sourceProblem must be an object.', context);
  }

  if (!isNonEmptyString(sourceProblem.key)) {
    throw new ReviewValidationError('sourceProblem.key is required.', context);
  }

  if (sourceProblem.name !== undefined && !isNonEmptyString(sourceProblem.name)) {
    throw new ReviewValidationError('sourceProblem.name must be a non-empty string.', context);
  }

  if (sourceProblem.url !== undefined && !isNonEmptyString(sourceProblem.url)) {
    throw new ReviewValidationError('sourceProblem.url must be a non-empty string.', context);
  }
}

function assertAllowedFields(item, context) {
  const allowedFields = new Set([...REVIEW_REQUIRED_FIELDS, ...REVIEW_OPTIONAL_FIELDS]);

  for (const key of Object.keys(item)) {
    if (!allowedFields.has(key)) {
      throw new ReviewValidationError(`Unexpected review field: ${key}.`, context);
    }
  }
}

function assertValidReviewItem(item, options = {}) {
  const context = { index: options.index };

  if (!isPlainObject(item)) {
    throw new ReviewValidationError('Review item must be an object.', context);
  }

  assertAllowedFields(item, context);

  for (const field of REVIEW_REQUIRED_FIELDS) {
    if (!(field in item)) {
      throw new ReviewValidationError(`Missing required review field: ${field}.`, context);
    }
  }

  if (!isNonEmptyString(item.id)) {
    throw new ReviewValidationError('id must be a non-empty string.', context);
  }

  if (!REVIEW_TYPES.includes(item.type)) {
    throw new ReviewValidationError('type must be A, B, C, or D.', context);
  }

  if (!isNonEmptyString(item.content)) {
    throw new ReviewValidationError('content must be a non-empty string.', context);
  }

  if (!Number.isInteger(item.stage)) {
    throw new ReviewValidationError('stage must be an integer.', context);
  }

  const stageLimit = REVIEW_STAGE_LIMITS[item.type];

  if (item.stage < stageLimit.min || item.stage > stageLimit.max) {
    throw new ReviewValidationError(
      `stage must be between ${stageLimit.min} and ${stageLimit.max} for type ${item.type}.`,
      context
    );
  }

  if (!isIsoDateString(item.nextReviewDate)) {
    throw new ReviewValidationError('nextReviewDate must be an ISO date string (YYYY-MM-DD).', context);
  }

  if (typeof item.completed !== 'boolean') {
    throw new ReviewValidationError('completed must be a boolean.', context);
  }

  if (!isIsoTimestampString(item.createdAt)) {
    throw new ReviewValidationError('createdAt must be an ISO timestamp string.', context);
  }

  if (item.note !== undefined && !isNonEmptyString(item.note)) {
    throw new ReviewValidationError('note must be a non-empty string.', context);
  }

  if (item.sourceProblem !== undefined) {
    validateSourceProblem(item.sourceProblem, context);
  }

  return item;
}

function assertValidReviewItems(items) {
  if (!Array.isArray(items)) {
    throw new ReviewValidationError('Review data must be an array.', { index: null });
  }

  items.forEach((item, index) => {
    assertValidReviewItem(item, { index });
  });

  return items;
}

module.exports = {
  REVIEW_OPTIONAL_FIELDS,
  REVIEW_REQUIRED_FIELDS,
  REVIEW_STAGE_LIMITS,
  REVIEW_TYPES,
  ReviewValidationError,
  assertValidReviewItem,
  assertValidReviewItems,
  isIsoDateString,
};
