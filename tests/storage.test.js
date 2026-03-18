const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_CONFIG } = require('../src/constants');
const { ensureAppHome, loadConfig } = require('../src/storage');

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
