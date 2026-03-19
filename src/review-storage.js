const fs = require('fs');
const path = require('path');

const { getAppPaths } = require('./paths');
const { ReviewValidationError, assertValidReviewItems } = require('./review-schema');
const { ensureAppHome } = require('./storage');

class ReviewStorageError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ReviewStorageError';
    this.code = code;
    this.details = details;
  }
}

function getReviewFilePath(env = process.env) {
  return getAppPaths(env).reviewPath;
}

function writeReviewItemsToFile(filePath, items) {
  try {
    assertValidReviewItems(items);
  } catch (error) {
    if (error instanceof ReviewValidationError) {
      throw new ReviewStorageError(`保存复习条目失败：${error.message}`, 'INVALID_REVIEW_ITEMS', error.details);
    }

    throw error;
  }

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    throw new ReviewStorageError(`保存复习条目失败：${error.message}`, 'WRITE_FAILED');
  }
}

function ensureReviewFile(filePath) {
  if (!fs.existsSync(filePath)) {
    writeReviewItemsToFile(filePath, []);
  }
}

function readReviewItemsFromFile(filePath) {
  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ReviewStorageError('加载复习条目失败：review.json 格式错误。', 'INVALID_JSON');
    }

    throw new ReviewStorageError(`加载复习条目失败：${error.message}`, 'READ_FAILED');
  }

  try {
    return assertValidReviewItems(parsed);
  } catch (error) {
    if (error instanceof ReviewValidationError) {
      throw new ReviewStorageError(`加载复习条目失败：${error.message}`, 'INVALID_REVIEW_ITEMS', error.details);
    }

    throw error;
  }
}

function ensureReviewStorage(env = process.env) {
  const paths = ensureAppHome(env);
  ensureReviewFile(paths.reviewPath);
  return paths;
}

function loadReviewItems(env = process.env) {
  const paths = ensureReviewStorage(env);

  return {
    paths,
    items: readReviewItemsFromFile(paths.reviewPath),
  };
}

function saveReviewItems(env = process.env, items) {
  const paths = ensureReviewStorage(env);
  writeReviewItemsToFile(paths.reviewPath, items);

  return {
    paths,
    items,
  };
}

module.exports = {
  ReviewStorageError,
  ensureReviewStorage,
  getReviewFilePath,
  loadReviewItems,
  readReviewItemsFromFile,
  saveReviewItems,
  writeReviewItemsToFile,
};
