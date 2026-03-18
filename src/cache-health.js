const path = require('path');

const REQUIRED_CACHE_KEYS = {
  stats: ['user', 'submissions', 'rating', 'problems'],
  weak: ['user', 'submissions', 'rating', 'problems'],
  next: ['user', 'submissions', 'rating', 'problems'],
};

const STALE_SNAPSHOT_SKEW_MS = 36 * 60 * 60 * 1000;

function getRequiredCacheKeys(commandName) {
  return REQUIRED_CACHE_KEYS[commandName] || [];
}

function getCacheFileName(caches, key) {
  const filePath = caches.meta?.[key]?.path;
  return filePath ? path.basename(filePath) : `${key}.json`;
}

function formatFileList(items) {
  return items.join('、');
}

function buildFetchHint(handle) {
  if (handle) {
    return `请运行 node cf.js fetch --handle ${handle} 刷新本地缓存`;
  }

  return '请先运行 node cf.js fetch --handle <your-handle> 生成本地缓存';
}

function getKnownHandleMap(caches = {}) {
  return {
    user: caches.user?.handle || null,
    submissions: caches.submissions?.handle || null,
    rating: caches.rating?.handle || null,
  };
}

function getSnapshotSkew(caches = {}, requiredKeys = []) {
  const timestamps = requiredKeys
    .map((key) => Date.parse(caches[key]?.fetchedAt || ''))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length < 2) {
    return 0;
  }

  return Math.max(...timestamps) - Math.min(...timestamps);
}

function assertAnalyticsCacheReady(caches = {}, options = {}) {
  const commandName = options.commandName || 'stats';
  const requiredKeys = getRequiredCacheKeys(commandName);
  const missingFiles = [];
  const malformedFiles = [];

  for (const key of requiredKeys) {
    const status = caches.meta?.[key]?.status || (caches[key] ? 'ok' : 'missing');

    if (status === 'missing') {
      missingFiles.push(getCacheFileName(caches, key));
      continue;
    }

    if (status === 'malformed') {
      malformedFiles.push(getCacheFileName(caches, key));
    }
  }

  if (malformedFiles.length > 0) {
    throw new Error(`本地缓存已损坏：${formatFileList(malformedFiles)}。${buildFetchHint(options.handle || null)}`);
  }

  if (missingFiles.length === requiredKeys.length) {
    throw new Error(`缺少本地缓存。${buildFetchHint(options.handle || null)}`);
  }

  if (missingFiles.length > 0) {
    throw new Error(`本地缓存不完整，缺少 ${formatFileList(missingFiles)}。${buildFetchHint(options.handle || null)}`);
  }

  const handleMap = getKnownHandleMap(caches);
  const distinctHandles = Array.from(new Set(Object.values(handleMap).filter(Boolean)));

  if (distinctHandles.length > 1) {
    const details = Object.entries(handleMap)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('，');
    throw new Error(`本地缓存快照不一致：${details}。${buildFetchHint(options.handle || distinctHandles[distinctHandles.length - 1])}`);
  }

  if (options.handle && distinctHandles.length === 1 && distinctHandles[0] !== options.handle) {
    throw new Error(`本地缓存较旧，当前为 ${distinctHandles[0]}。${buildFetchHint(options.handle)}`);
  }

  if (getSnapshotSkew(caches, requiredKeys) > STALE_SNAPSHOT_SKEW_MS) {
    throw new Error(`本地缓存时间戳差异过大，可能是过期或部分更新的快照。${buildFetchHint(options.handle || distinctHandles[0] || null)}`);
  }
}

module.exports = {
  assertAnalyticsCacheReady,
};
