function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTag(tag, options = {}) {
  const normalized = normalizeString(tag);

  if (!normalized) {
    return '';
  }

  return options.lowerCase === false ? normalized : normalized.toLowerCase();
}

function normalizeTags(tags, options = {}) {
  return Array.from(new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => normalizeTag(tag, options))
    .filter(Boolean)));
}

function hasAnyCache(caches = {}) {
  return Boolean(caches.user || caches.submissions || caches.rating || caches.problems);
}

function getCacheHandle(caches = {}, fallbackHandle = null) {
  return caches.user?.handle || caches.submissions?.handle || caches.rating?.handle || fallbackHandle || null;
}

function formatRating(value) {
  return value === null || value === undefined ? 'N/A' : String(value);
}

module.exports = {
  formatRating,
  getCacheHandle,
  hasAnyCache,
  isFiniteNumber,
  normalizeString,
  normalizeTag,
  normalizeTags,
};
