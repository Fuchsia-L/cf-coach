const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_CONFIG } = require('../src/constants');
const { ensureAppHome, loadConfig } = require('../src/storage');
const {
  ReviewStorageError,
  ensureReviewStorage,
  loadReviewItems,
  readReviewItemsFromFile,
  saveReviewItems,
  writeReviewItemsToFile,
} = require('../src/review-storage');

function createTempEnv() {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-coach-home-'));

  return {
    CF_COACH_HOME: homeDir,
  };
}

test('ensureAppHome creates app, cache, and default config', () => {
  const env = createTempEnv();
  const paths = ensureAppHome(env);

  assert.equal(fs.existsSync(paths.appDir), true);
  assert.equal(fs.existsSync(paths.cacheDir), true);
  assert.equal(fs.existsSync(paths.configPath), true);

  const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
  assert.deepEqual(config, DEFAULT_CONFIG);
});

test('loadConfig reads the bootstrapped default handle', () => {
  const env = createTempEnv();
  const { config, paths } = loadConfig(env);

  assert.equal(config.handle, 'Fuchsia_L');
  assert.equal(paths.cacheDir.endsWith(path.join('.cf-coach', 'cache')), true);
});

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

test('ensureReviewStorage initializes review.json as an empty array under CF_COACH_HOME', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);

  assert.equal(paths.reviewPath.endsWith(path.join('.cf-coach', 'review.json')), true);
  assert.equal(fs.existsSync(paths.reviewPath), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(paths.reviewPath, 'utf8')), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(paths.configPath, 'utf8')), DEFAULT_CONFIG);
});

test('loadReviewItems and writeReviewItemsToFile round-trip valid review items', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);
  const items = [
    createReviewItem(),
    createReviewItem({
      id: 'r_1710000000001',
      type: 'D',
      stage: 5,
      completed: true,
      nextReviewDate: '2026-04-01',
      sourceProblem: {
        key: '1735C',
        name: 'Phase Shift',
      },
      note: 'Remember the DSU mapping trick.',
    }),
  ];

  writeReviewItemsToFile(paths.reviewPath, items);

  assert.deepEqual(loadReviewItems(env).items, items);
});

test('saveReviewItems bootstraps storage and round-trips valid review items', () => {
  const env = createTempEnv();
  const items = [
    createReviewItem(),
    createReviewItem({
      id: 'r_1710000000002',
      type: 'C',
      content: 'prefix sums',
      stage: 2,
    }),
  ];

  const result = saveReviewItems(env, items);

  assert.equal(fs.existsSync(result.paths.reviewPath), true);
  assert.deepEqual(loadReviewItems(env).items, items);
});

test('writeReviewItemsToFile creates missing parent directories', () => {
  const env = createTempEnv();
  const filePath = path.join(env.CF_COACH_HOME, 'nested', 'review.json');
  const items = [createReviewItem()];

  writeReviewItemsToFile(filePath, items);

  assert.equal(fs.existsSync(filePath), true);
  assert.deepEqual(readReviewItemsFromFile(filePath), items);
});

test('readReviewItemsFromFile reports missing review file clearly', () => {
  const env = createTempEnv();
  const missingPath = path.join(env.CF_COACH_HOME, '.cf-coach', 'review.json');

  assert.throws(
    () => readReviewItemsFromFile(missingPath),
    (error) => error instanceof ReviewStorageError && error.code === 'READ_FAILED'
  );
});

test('readReviewItemsFromFile reports malformed review JSON clearly', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);

  fs.writeFileSync(paths.reviewPath, '{broken json', 'utf8');

  assert.throws(
    () => readReviewItemsFromFile(paths.reviewPath),
    (error) => error instanceof ReviewStorageError && error.code === 'INVALID_JSON'
  );
});

test('readReviewItemsFromFile rejects review items with missing required fields', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);
  const invalidItems = [
    {
      type: 'A',
      content: 'missing id',
      stage: 0,
      nextReviewDate: '2026-03-22',
      completed: false,
      createdAt: '2026-03-19T15:00:00.000Z',
    },
  ];

  fs.writeFileSync(paths.reviewPath, `${JSON.stringify(invalidItems, null, 2)}\n`, 'utf8');

  assert.throws(
    () => readReviewItemsFromFile(paths.reviewPath),
    (error) => error instanceof ReviewStorageError && error.code === 'INVALID_REVIEW_ITEMS'
  );
});

test('writeReviewItemsToFile rejects review items with invalid types', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);

  assert.throws(
    () => writeReviewItemsToFile(paths.reviewPath, [createReviewItem({ type: 'Z' })]),
    (error) => error instanceof ReviewStorageError && error.code === 'INVALID_REVIEW_ITEMS'
  );
});

test('writeReviewItemsToFile rejects review items with non-boolean completed values', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);

  assert.throws(
    () => writeReviewItemsToFile(paths.reviewPath, [createReviewItem({ completed: 'yes' })]),
    (error) => error instanceof ReviewStorageError && error.code === 'INVALID_REVIEW_ITEMS'
  );
});

test('writeReviewItemsToFile rejects review items with non-integer stage values', () => {
  const env = createTempEnv();
  const paths = ensureReviewStorage(env);

  assert.throws(
    () => writeReviewItemsToFile(paths.reviewPath, [createReviewItem({ stage: 1.5 })]),
    (error) => error instanceof ReviewStorageError && error.code === 'INVALID_REVIEW_ITEMS'
  );
});
