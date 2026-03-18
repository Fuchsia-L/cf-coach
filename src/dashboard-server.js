const fs = require('fs');
const http = require('http');
const path = require('path');

const { createDashboardDataLayer } = require('./dashboard-data');

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

  return (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const { pathname } = requestUrl;

    if (pathname === '/' || pathname === '/index.html') {
      writeResponse(response, 200, htmlShell, 'text/html; charset=utf-8');
      return;
    }

    const asset = DASHBOARD_ASSETS[pathname];

    if (asset) {
      serveStaticAsset(response, asset);
      return;
    }

    const apiRoute = apiRoutes[pathname];

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
