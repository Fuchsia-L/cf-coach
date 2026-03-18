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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'specialist',
    rating: 1500,
    maxRating: 1500,
  });
  writeJson(path.join(cacheDir, 'submissions.json'), {
    handle: 'tourist',
    items: [],
  });
  writeJson(path.join(cacheDir, 'rating.json'), {
    handle: 'tourist',
    items: [],
  });
  writeJson(path.join(cacheDir, 'problems.json'), {
    items: [],
  });

  const result = runCli(['stats', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /统计：tourist/);
});

test('CLI weak prints prioritized mixed-data recommendations', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'pupil',
    rating: 930,
    maxRating: 930,
  });
  writeJson(path.join(cacheDir, 'submissions.json'), {
    handle: 'tourist',
    items: [
      {
        id: 1,
        verdict: 'OK',
        creationTimeSeconds: 1,
        problemKey: '100A',
        problem: { key: '100A', name: '100A', rating: 900, tags: ['sortings'] },
      },
      {
        id: 2,
        verdict: 'WRONG_ANSWER',
        creationTimeSeconds: 2,
        problemKey: '100B',
        problem: { key: '100B', name: '100B', rating: 800, tags: ['greedy'] },
      },
      {
        id: 3,
        verdict: 'WRONG_ANSWER',
        creationTimeSeconds: 3,
        problemKey: '100C',
        problem: { key: '100C', name: '100C', rating: 850, tags: ['greedy'] },
      },
      {
        id: 4,
        verdict: 'WRONG_ANSWER',
        creationTimeSeconds: 4,
        problemKey: '100D',
        problem: { key: '100D', name: '100D', rating: 880, tags: ['greedy'] },
      },
      {
        id: 5,
        verdict: 'OK',
        creationTimeSeconds: 5,
        problemKey: '100D',
        problem: { key: '100D', name: '100D', rating: 880, tags: ['greedy'] },
      },
    ],
  });
  writeJson(path.join(cacheDir, 'rating.json'), {
    handle: 'tourist',
    items: [],
  });
  writeJson(path.join(cacheDir, 'problems.json'), {
    items: [
      { key: '100A', name: '100A', rating: 900, tags: ['sortings'] },
      { key: '100B', name: '100B', rating: 800, tags: ['greedy'] },
      { key: '100C', name: '100C', rating: 850, tags: ['greedy'] },
      { key: '100D', name: '100D', rating: 880, tags: ['greedy'] },
    ],
  });

  const result = runCli(['weak', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /优先训练建议：/);
  assert.match(result.stdout, /补当前阶段主题 greedy/);
  assert.match(result.stdout, /强化 tag greedy/);
  assert.match(result.stdout, /回补 800-899 分档/);
});

test('CLI weak handles low-data scenarios gracefully', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'newbie',
    rating: 850,
    maxRating: 850,
  });
  writeJson(path.join(cacheDir, 'submissions.json'), {
    handle: 'tourist',
    items: [
      {
        id: 1,
        verdict: 'OK',
        creationTimeSeconds: 1,
        problemKey: '100A',
        problem: { key: '100A', name: '100A', rating: 800, tags: ['greedy'] },
      },
      {
        id: 2,
        verdict: 'WRONG_ANSWER',
        creationTimeSeconds: 2,
        problemKey: '100B',
        problem: { key: '100B', name: '100B', rating: 900, tags: ['sortings'] },
      },
    ],
  });
  writeJson(path.join(cacheDir, 'rating.json'), {
    handle: 'tourist',
    items: [],
  });
  writeJson(path.join(cacheDir, 'problems.json'), {
    items: [
      { key: '100A', name: '100A', rating: 800, tags: ['greedy'] },
      { key: '100B', name: '100B', rating: 900, tags: ['sortings'] },
    ],
  });

  const result = runCli(['weak', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /强化 tag /);
  assert.doesNotMatch(result.stdout, /回补 .* 分档/);
  assert.match(result.stdout, /Tag 薄弱项：/);
  assert.match(result.stdout, /暂无明显薄弱项/);
  assert.match(result.stdout, /Rating 薄弱分档：/);
});
