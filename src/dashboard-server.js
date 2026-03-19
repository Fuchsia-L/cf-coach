const fs = require('fs');
const http = require('http');
const path = require('path');

const { createDashboardDataLayer } = require('./dashboard-data');
const { ReviewCreateError, createReviewItem, resolveNow } = require('./review-creation');
const { advanceReviewItem, resetReviewItem, selectReviewsDueToday } = require('./review-scheduling');
const { ReviewStorageError, loadReviewItems, saveReviewItems } = require('./review-storage');

const DASHBOARD_ASSETS = {
  '/assets/dashboard.css': {
    contentType: 'text/css; charset=utf-8',
    filePath: path.join(__dirname, 'dashboard', 'dashboard.css'),
  },
  '/assets/dashboard.js': {
    contentType: 'application/javascript; charset=utf-8',
    filePath: path.join(__dirname, 'dashboard', 'dashboard.js'),
  },
};

function renderDashboardShell() {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>cf-coach Dashboard</title>',
    '  <link rel="stylesheet" href="/assets/dashboard.css">',
    '</head>',
    '<body>',
    '  <main id="app" data-dashboard-ready="false" data-dashboard-state="loading">',
    '    <section class="panel panel-loading">',
    '      <p class="eyebrow">cf-coach</p>',
    '      <h1>Dashboard</h1>',
    '      <p class="summary">Loading local cache insights...</p>',
    '    </section>',
    '  </main>',
    '  <script src="/assets/dashboard.js"></script>',
    '</body>',
    '</html>',
  ].join('\n');
}

function writeResponse(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function writeJson(response, statusCode, payload) {
  writeResponse(
    response,
    statusCode,
    `${JSON.stringify(payload)}\n`,
    'application/json; charset=utf-8'
  );
}

function createJsonError(code, message, details) {
  const payload = {
    error: {
      code,
      message,
    },
  };

  if (details && Object.keys(details).length > 0) {
    payload.error.details = details;
  }

  return payload;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', reject);
  });
}

async function readJsonRequestBody(request) {
  const body = await readRequestBody(request);

  if (!body.trim()) {
    throw new ReviewCreateError('Request body must be a JSON object.');
  }

  let parsed;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new ReviewCreateError('Request body must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ReviewCreateError('Request body must be a JSON object.');
  }

  return parsed;
}

function getRequestNow(options = {}) {
  const nowValue = typeof options.now === 'function' ? options.now() : options.now;
  return resolveNow(nowValue === undefined ? Date.now() : nowValue);
}

function getRequestToday(options = {}) {
  return getRequestNow(options).toISOString().slice(0, 10);
}

class ReviewSessionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ReviewSessionError';
    this.code = code;
    this.details = details;
  }
}

function haveReviewItemsChanged(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function loadScheduledReviewState(options = {}) {
  const reviewState = loadReviewItems(options.env);
  const scheduledState = selectReviewsDueToday(reviewState.items, {
    today: getRequestToday(options),
  });

  if (haveReviewItemsChanged(reviewState.items, scheduledState.items)) {
    saveReviewItems(options.env, scheduledState.items);
  }

  return scheduledState;
}

function findReviewItemIndex(items, itemId) {
  return items.findIndex((item) => item.id === itemId);
}

function parseReviewActionPath(pathname) {
  const match = /^\/api\/review\/([^/]+)\/(pass|reset)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    itemId: decodeURIComponent(match[1]),
    action: match[2],
  };
}

async function handleCreateReviewRequest(request, response, options = {}) {
  try {
    const payload = await readJsonRequestBody(request);
    const reviewState = loadReviewItems(options.env);
    const item = createReviewItem(payload, {
      now: getRequestNow(options),
      items: reviewState.items,
    });

    saveReviewItems(options.env, [...reviewState.items, item]);
    writeJson(response, 201, {
      item,
      message: 'Review item created.',
    });
  } catch (error) {
    if (error instanceof ReviewCreateError) {
      writeJson(response, 400, createJsonError(error.code, error.message, error.details));
      return;
    }

    if (error instanceof ReviewStorageError) {
      writeJson(response, 500, createJsonError(error.code, error.message, error.details));
      return;
    }

    writeJson(response, 500, createJsonError('INTERNAL_ERROR', error.message || 'Internal server error.'));
  }
}

function handleGetReviewRequest(response, options = {}) {
  try {
    const reviewState = loadScheduledReviewState(options);

    writeJson(response, 200, {
      items: reviewState.dueItems,
      todayCount: reviewState.todayCount,
      totalActive: reviewState.totalActive,
      totalCompleted: reviewState.totalCompleted,
    });
  } catch (error) {
    if (error instanceof ReviewStorageError) {
      writeJson(response, 500, createJsonError(error.code, error.message, error.details));
      return;
    }

    writeJson(response, 500, createJsonError('INTERNAL_ERROR', error.message || 'Internal server error.'));
  }
}

function handleReviewActionRequest(response, pathname, options = {}) {
  try {
    const actionMatch = parseReviewActionPath(pathname);

    if (!actionMatch) {
      writeJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
      return;
    }

    const reviewState = loadScheduledReviewState(options);
    const itemIndex = findReviewItemIndex(reviewState.items, actionMatch.itemId);

    if (itemIndex === -1) {
      throw new ReviewSessionError('Review item not found.', 'REVIEW_ITEM_NOT_FOUND', {
        id: actionMatch.itemId,
      });
    }

    const today = getRequestToday(options);
    const currentItem = reviewState.items[itemIndex];
    const updatedItem = actionMatch.action === 'pass'
      ? advanceReviewItem(currentItem, { today })
      : resetReviewItem(currentItem, { today });
    const updatedItems = reviewState.items.map((item, index) => (index === itemIndex ? updatedItem : item));

    saveReviewItems(options.env, updatedItems);
    writeJson(response, 200, {
      item: updatedItem,
      message: actionMatch.action === 'pass' ? 'Review item advanced.' : 'Review item reset.',
    });
  } catch (error) {
    if (error instanceof ReviewSessionError) {
      writeJson(response, error.code === 'REVIEW_ITEM_NOT_FOUND' ? 404 : 400, createJsonError(
        error.code,
        error.message,
        error.details
      ));
      return;
    }

    if (error instanceof ReviewStorageError) {
      writeJson(response, 500, createJsonError(error.code, error.message, error.details));
      return;
    }

    writeJson(response, 500, createJsonError('INTERNAL_ERROR', error.message || 'Internal server error.'));
  }
}

function serveStaticAsset(response, asset) {
  const body = fs.readFileSync(asset.filePath);

  response.writeHead(200, {
    'Content-Type': asset.contentType,
    'Content-Length': body.length,
  });
  response.end(body);
}

function createDashboardRequestHandler(options = {}) {
  const htmlShell = renderDashboardShell();
  const dataLayer = options.dataLayer || createDashboardDataLayer(options);
  const apiRoutes = {
    '/api/profile': () => dataLayer.getProfile(),
    '/api/rating-history': () => dataLayer.getRatingHistory(),
    '/api/tag-stats': () => dataLayer.getTagStats(),
    '/api/rating-buckets': () => dataLayer.getRatingBuckets(),
    '/api/roadmap': () => dataLayer.getRoadmap(),
    '/api/weak': () => dataLayer.getWeak(),
    '/api/next': () => dataLayer.getNext(),
    '/api/submissions': () => dataLayer.getSubmissions(),
  };

  return async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      const { pathname } = requestUrl;
      const method = (request.method || 'GET').toUpperCase();

      if (pathname === '/' || pathname === '/index.html') {
        writeResponse(response, 200, htmlShell, 'text/html; charset=utf-8');
        return;
      }

      const asset = DASHBOARD_ASSETS[pathname];

      if (asset) {
        serveStaticAsset(response, asset);
        return;
      }

      if (pathname === '/api/review' && method === 'POST') {
        await handleCreateReviewRequest(request, response, options);
        return;
      }

      if (pathname === '/api/review' && method === 'GET') {
        handleGetReviewRequest(response, options);
        return;
      }

      if (method === 'POST' && parseReviewActionPath(pathname)) {
        handleReviewActionRequest(response, pathname, options);
        return;
      }

      const apiRoute = method === 'GET' ? apiRoutes[pathname] : null;

      if (apiRoute) {
        const result = apiRoute();
        writeJson(response, result.statusCode, result.payload);
        return;
      }

      if (pathname.startsWith('/api/')) {
        writeJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
        return;
      }

      writeResponse(response, 404, 'Not found\n', 'text/plain; charset=utf-8');
    } catch (error) {
      writeJson(response, 500, createJsonError('INTERNAL_ERROR', error.message || 'Internal server error.'));
    }
  };
}

function createDashboardServer(options = {}) {
  const sockets = new Set();
  const server = http.createServer(createDashboardRequestHandler(options));

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return {
    server,
    async listen(port) {
      await new Promise((resolve, reject) => {
        const handleError = (error) => {
          server.off('listening', handleListening);
          reject(error);
        };

        const handleListening = () => {
          server.off('error', handleError);
          resolve();
        };

        server.once('error', handleError);
        server.once('listening', handleListening);
        server.listen(port, '127.0.0.1');
      });

      return server.address().port;
    },
    async close() {
      if (!server.listening) {
        return;
      }

      for (const socket of sockets) {
        socket.end();
      }

      const destroyTimer = setTimeout(() => {
        for (const socket of sockets) {
          socket.destroy();
        }
      }, 100);

      if (typeof destroyTimer.unref === 'function') {
        destroyTimer.unref();
      }

      await new Promise((resolve, reject) => {
        server.close((error) => {
          clearTimeout(destroyTimer);

          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    getPort() {
      return server.address() ? server.address().port : null;
    },
  };
}

module.exports = {
  createDashboardRequestHandler,
  createDashboardServer,
  renderDashboardShell,
};
