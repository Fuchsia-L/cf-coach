const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatRating,
  getCacheHandle,
  hasAnyCache,
  isFiniteNumber,
  normalizeString,
  normalizeTag,
  normalizeTags,
} = require('../src/utils');

test('isFiniteNumber accepts only finite numeric values', () => {
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber(-42.5), true);
  assert.equal(isFiniteNumber(Number.POSITIVE_INFINITY), false);
  assert.equal(isFiniteNumber(Number.NaN), false);
  assert.equal(isFiniteNumber('42'), false);
});

test('normalizeString trims strings and rejects non-strings', () => {
  assert.equal(normalizeString('  demo  '), 'demo');
  assert.equal(normalizeString(''), '');
  assert.equal(normalizeString(null), '');
  assert.equal(normalizeString(123), '');
});

test('normalizeTag and normalizeTags lowercase by default and can preserve case', () => {
  assert.equal(normalizeTag('  GrEeDy  '), 'greedy');
  assert.equal(normalizeTag('  Math  ', { lowerCase: false }), 'Math');
  assert.deepEqual(normalizeTags(['  Greedy ', 'greedy', ' DP ', null]), ['greedy', 'dp']);
  assert.deepEqual(normalizeTags([' Math ', 'Math', 'math '], { lowerCase: false }), ['Math', 'math']);
});

test('hasAnyCache detects available local cache payloads', () => {
  assert.equal(hasAnyCache({}), false);
  assert.equal(hasAnyCache({ problems: { items: [] } }), true);
  assert.equal(hasAnyCache({ user: { handle: 'demo' } }), true);
});

test('getCacheHandle picks the first available cached handle or fallback', () => {
  assert.equal(getCacheHandle({ user: { handle: 'tourist' } }, 'demo'), 'tourist');
  assert.equal(getCacheHandle({ submissions: { handle: 'Benq' } }, 'demo'), 'Benq');
  assert.equal(getCacheHandle({}, 'demo'), 'demo');
  assert.equal(getCacheHandle({ problems: { items: [] } }), null);
});

test('formatRating renders nullish values as N/A', () => {
  assert.equal(formatRating(null), 'N/A');
  assert.equal(formatRating(undefined), 'N/A');
  assert.equal(formatRating(1500), '1500');
});
