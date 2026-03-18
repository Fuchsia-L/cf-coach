const fs = require('fs');
const path = require('path');

const CACHE_FILES = {
  user: 'user.json',
  submissions: 'submissions.json',
  rating: 'rating.json',
  problems: 'problems.json',
};

function getCachePaths(cacheDir) {
  return {
    userPath: path.join(cacheDir, CACHE_FILES.user),
    submissionsPath: path.join(cacheDir, CACHE_FILES.submissions),
    ratingPath: path.join(cacheDir, CACHE_FILES.rating),
    problemsPath: path.join(cacheDir, CACHE_FILES.problems),
  };
}

function readCacheJson(filePath) {
  try {
    return {
      status: 'ok',
      data: JSON.parse(fs.readFileSync(filePath, 'utf8')),
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        status: 'missing',
        data: null,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        status: 'malformed',
        data: null,
      };
    }

    throw new Error(`读取缓存失败：${filePath}，${error.message}`);
  }
}

function writeAtomicJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      // ignore cleanup errors
    }

    throw new Error(`写入缓存失败：${filePath}，${error.message}`);
  }
}

function sortByNumber(items, fieldName) {
  return items.slice().sort((left, right) => {
    const leftValue = left[fieldName] ?? 0;
    const rightValue = right[fieldName] ?? 0;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }

    return 0;
  });
}

function mergeUserCache(existing, incoming) {
  return {
    changed: JSON.stringify(existing) !== JSON.stringify(incoming),
    data: incoming,
  };
}

function mergeSubmissionsCache(existing, incoming) {
  const previousItems = existing && existing.handle === incoming.handle && Array.isArray(existing.items)
    ? existing.items
    : [];
  const existingIds = new Set(previousItems.map((item) => item.id));
  const existingSolvedProblems = new Set(
    previousItems
      .filter((item) => item.verdict === 'OK' && item.problemKey)
      .map((item) => item.problemKey)
  );
  const newItems = incoming.items.filter((item) => !existingIds.has(item.id));
  const newAcProblems = new Set();

  for (const item of newItems) {
    if (item.verdict === 'OK' && item.problemKey && !existingSolvedProblems.has(item.problemKey)) {
      newAcProblems.add(item.problemKey);
    }
  }

  return {
    summary: {
      newSubmissionCount: newItems.length,
      newAcProblemCount: newAcProblems.size,
    },
    data: {
      handle: incoming.handle,
      fetchedAt: incoming.fetchedAt,
      items: sortByNumber(previousItems.concat(newItems), 'creationTimeSeconds'),
    },
  };
}

function getRatingEntryKey(entry) {
  return `${entry.contestId ?? 'unknown'}:${entry.ratingUpdateTimeSeconds ?? 'unknown'}`;
}

function mergeRatingCache(existing, incoming) {
  const previousItems = existing && existing.handle === incoming.handle && Array.isArray(existing.items)
    ? existing.items
    : [];
  const existingKeys = new Set(previousItems.map(getRatingEntryKey));
  const newItems = incoming.items.filter((item) => !existingKeys.has(getRatingEntryKey(item)));

  return {
    summary: {
      newRatingCount: newItems.length,
    },
    data: {
      handle: incoming.handle,
      fetchedAt: incoming.fetchedAt,
      items: sortByNumber(previousItems.concat(newItems), 'ratingUpdateTimeSeconds'),
    },
  };
}

function mergeProblemsetCache(existing, incoming) {
  const previousItems = existing && Array.isArray(existing.items) ? existing.items : [];
  const previousKeys = new Set(previousItems.map((item) => item.key));
  const mergedByKey = new Map(previousItems.map((item) => [item.key, item]));

  for (const item of incoming.items) {
    mergedByKey.set(item.key, item);
  }

  return {
    summary: {
      newProblemCount: incoming.items.filter((item) => !previousKeys.has(item.key)).length,
    },
    data: {
      fetchedAt: incoming.fetchedAt,
      items: Array.from(mergedByKey.values()).sort((left, right) => left.key.localeCompare(right.key)),
    },
  };
}

function loadFetchCaches(cacheDir) {
  const paths = getCachePaths(cacheDir);
  const user = readCacheJson(paths.userPath);
  const submissions = readCacheJson(paths.submissionsPath);
  const rating = readCacheJson(paths.ratingPath);
  const problems = readCacheJson(paths.problemsPath);

  return {
    paths,
    user: user.data,
    submissions: submissions.data,
    rating: rating.data,
    problems: problems.data,
    meta: {
      user: {
        path: paths.userPath,
        status: user.status,
      },
      submissions: {
        path: paths.submissionsPath,
        status: submissions.status,
      },
      rating: {
        path: paths.ratingPath,
        status: rating.status,
      },
      problems: {
        path: paths.problemsPath,
        status: problems.status,
      },
    },
  };
}

function writeFetchCaches(cacheDir, caches) {
  const paths = getCachePaths(cacheDir);

  writeAtomicJson(paths.userPath, caches.user);
  writeAtomicJson(paths.submissionsPath, caches.submissions);
  writeAtomicJson(paths.ratingPath, caches.rating);
  writeAtomicJson(paths.problemsPath, caches.problems);
}

module.exports = {
  CACHE_FILES,
  getCachePaths,
  loadFetchCaches,
  mergeProblemsetCache,
  mergeRatingCache,
  mergeSubmissionsCache,
  mergeUserCache,
  readCacheJson,
  writeAtomicJson,
  writeFetchCaches,
};
