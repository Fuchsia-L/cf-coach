const http = require('http');
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

const { createDashboardServer } = require('../src/dashboard-server');
const { parseServeArgs, runServeCommand } = require('../src/commands/serve');

function createCaptureStream() {
  let output = '';

  return {
    write(chunk) {
      output += chunk;
    },
    toString() {
      return output;
    },
  };
}

function request(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method: 'GET',
    }, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function waitForMatch(getValue, matcher) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      const value = getValue();
      const match = value.match(matcher);

      if (match) {
        resolve(match);
        return;
      }
      if (Date.now() - startedAt >= 5000) {
        reject(new Error(`timed out waiting for output: ${value}`));
        return;
      }

      setTimeout(check, 20);
    };

    check();
  });
}

test('parseServeArgs uses port 3000 by default', () => {
  const result = parseServeArgs([]);

  assert.equal(result.port, 3000);
  assert.equal(result.error, null);
});

test('runServeCommand passes explicit --port override and logs startup URL', async () => {
  const stdout = createCaptureStream();
  const processRef = new EventEmitter();
  let listenPort = null;
  let closed = false;

  const commandPromise = runServeCommand({
    args: ['--port', '3456'],
    stdout,
    processRef,
    createDashboardServer() {
      return {
        async listen(port) {
          listenPort = port;
          return port;
        },
        async close() {
          closed = true;
        },
      };
    },
  });

  await new Promise((resolve) => setImmediate(resolve));
  processRef.emit('SIGINT');

  const exitCode = await commandPromise;

  assert.equal(listenPort, 3456);
  assert.equal(exitCode, 0);
  assert.equal(closed, true);
  assert.equal(stdout.toString(), 'Dashboard: http://localhost:3456\n');
});

test('dashboard server returns HTML shell, assets, and JSON 404 for missing API routes', async () => {
  const serverRef = createDashboardServer();
  const port = await serverRef.listen(0);

  try {
    const rootResponse = await request(port, '/');
    assert.equal(rootResponse.statusCode, 200);
    assert.match(rootResponse.headers['content-type'], /^text\/html/);
    assert.match(rootResponse.body, /<title>cf-coach Dashboard<\/title>/);
    assert.match(rootResponse.body, /\/assets\/dashboard\.css/);
    assert.match(rootResponse.body, /\/assets\/dashboard\.js/);

    const assetResponse = await request(port, '/assets/dashboard.css');
    assert.equal(assetResponse.statusCode, 200);
    assert.match(assetResponse.headers['content-type'], /^text\/css/);
    assert.match(assetResponse.body, /color-scheme: dark/);

    const apiResponse = await request(port, '/api/missing');
    assert.equal(apiResponse.statusCode, 404);
    assert.match(apiResponse.headers['content-type'], /^application\/json/);
    assert.deepEqual(JSON.parse(apiResponse.body), { error: 'Not found' });
  } finally {
    await serverRef.close();
  }
});

test('CLI serve shuts down cleanly on SIGINT without throwing', async () => {
  const stdout = createCaptureStream();
  const processRef = new EventEmitter();

  const commandPromise = runServeCommand({
    args: ['--port', '0'],
    stdout,
    processRef,
  });

  const startupMatch = await waitForMatch(
    () => stdout.toString(),
    /Dashboard: http:\/\/localhost:(\d+)/
  );
  const port = Number(startupMatch[1]);

  const response = await request(port, '/');
  assert.equal(response.statusCode, 200);

  processRef.emit('SIGINT');
  const exitCode = await commandPromise;

  assert.equal(exitCode, 0);
  await assert.rejects(() => request(port, '/'), /ECONNREFUSED|ECONNRESET/);
});
