const test = require('node:test');
const assert = require('node:assert/strict');

const { assertValidReviewItem, ReviewValidationError } = require('../src/review-schema');

function createReviewItem(overrides = {}) {
  return {
    id: 'r_1710000000000',
    type: 'A',
    content: 'lower_bound usage',
    stage: 0,
    nextReviewDate: '2026-03-22',
    completed: false,
    createdAt: '2026-03-19T15:00:00.000Z',
    ...overrides,
  };
}

test('assertValidReviewItem accepts valid A/B/C/D review items', () => {
  const items = [
    createReviewItem({ type: 'A', stage: 4 }),
    createReviewItem({ id: 'r_2', type: 'B', stage: 2 }),
    createReviewItem({ id: 'r_3', type: 'C', stage: 1 }),
    createReviewItem({ id: 'r_4', type: 'D', stage: 5, completed: true }),
  ];

  items.forEach((item) => {
    assert.equal(assertValidReviewItem(item), item);
  });
});

test('assertValidReviewItem rejects stage values outside the allowed range', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ stage: 5 })),
    (error) => error instanceof ReviewValidationError && /stage must be between 0 and 4/.test(error.message)
  );

  assert.throws(
    () => assertValidReviewItem(createReviewItem({ type: 'D', stage: 6 })),
    (error) => error instanceof ReviewValidationError && /stage must be between 0 and 5/.test(error.message)
  );
});

test('assertValidReviewItem rejects invalid nextReviewDate values', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ nextReviewDate: '2026-02-30' })),
    (error) => error instanceof ReviewValidationError && /nextReviewDate/.test(error.message)
  );
});

test('assertValidReviewItem rejects invalid ISO timestamp values', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ createdAt: '2026T0' })),
    (error) => error instanceof ReviewValidationError && /createdAt/.test(error.message)
  );
});

test('assertValidReviewItem rejects unexpected fields', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ extraField: 'foo' })),
    (error) => error instanceof ReviewValidationError && /Unexpected review field/.test(error.message)
  );
});

test('assertValidReviewItem rejects negative stage values', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ stage: -1 })),
    (error) => error instanceof ReviewValidationError && /stage must be between 0 and 4/.test(error.message)
  );
});

test('assertValidReviewItem rejects empty id values', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ id: '' })),
    (error) => error instanceof ReviewValidationError && /id must be a non-empty string/.test(error.message)
  );
});

test('assertValidReviewItem rejects blank content values', () => {
  assert.throws(
    () => assertValidReviewItem(createReviewItem({ content: '  ' })),
    (error) => error instanceof ReviewValidationError && /content must be a non-empty string/.test(error.message)
  );
});

test('assertValidReviewItem preserves allowed optional metadata fields', () => {
  const item = createReviewItem({
    type: 'D',
    sourceProblem: {
      key: '1735C',
      name: 'Phase Shift',
      url: 'https://codeforces.com/problemset/problem/1735/C',
    },
    note: 'Revisit the greedy mapping proof.',
  });

  assert.deepEqual(assertValidReviewItem(item), item);
});
