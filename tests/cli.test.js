const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');

function createHomeDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cf-coach-cli-'));
}

function runCli(args, homeDir) {
  return spawnSync(process.execPath, ['cf.js', ...args], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      CF_COACH_HOME: homeDir,
    },
    encoding: 'utf8',
  });
}

test('CLI help output is shown with no arguments', () => {
  const homeDir = createHomeDir();
  const result = runCli([], homeDir);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /用法：node cf\.js <命令> \[选项\]/);
  assert.equal(fs.existsSync(path.join(homeDir, '.cf-coach')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.cf-coach', 'cache')), true);
});

test('CLI returns non-zero for invalid commands', () => {
  const homeDir = createHomeDir();
  const result = runCli(['unknown'], homeDir);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /未知命令：unknown/);
});

test('CLI handle override takes precedence over config default', () => {
  const homeDir = createHomeDir();
  const result = runCli(['stats', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /当前 handle：tourist/);
});
