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

test('CLI next default mode prints inferred topic, anchor, and prerequisites', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'pupil',
    rating: 1000,
    maxRating: 1000,
  });
  writeJson(path.join(cacheDir, 'submissions.json'), {
    handle: 'tourist',
    items: [
      {
        id: 1,
        verdict: 'OK',
        creationTimeSeconds: 1,
        problemKey: '100A',
        problem: { key: '100A', name: '100A', rating: 800, tags: ['sortings'] },
      },
      {
        id: 2,
        verdict: 'OK',
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
      { key: '100A', name: '100A', rating: 800, tags: ['sortings'] },
      { key: '100B', name: '100B', rating: 900, tags: ['sortings'] },
      { key: '300B', name: 'Greedy Combo 1', rating: 1190, tags: ['greedy', 'sortings'] },
      { key: '310B', name: 'Greedy Combo 2', rating: 1290, tags: ['greedy', 'sortings'] },
      { key: '320B', name: 'Greedy Combo 3', rating: 1390, tags: ['greedy', 'sortings'] },
      { key: '400A', name: 'Greedy Single Anchor', rating: 1450, tags: ['greedy'] },
      { key: '400B', name: 'Greedy Combo Anchor', rating: 1450, tags: ['greedy', 'sortings'] },
    ],
  });

  const result = runCli(['next', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, [
    '下一题推荐：tourist',
    '当前 rating：1000',
    '当前阶段：第 1 阶段 排序 + 贪心',
    '当前主题：greedy（自动推断，已完成 0/4）',
    '锚点难度：1400-1500',
    '',
    'Anchor：',
    '  - 400B Greedy Combo Anchor | 1450 | greedy, sortings',
    '',
    'Prerequisites：',
    '  1. 300B Greedy Combo 1 | 1190 | greedy, sortings | target 1150',
    '  2. 310B Greedy Combo 2 | 1290 | greedy, sortings | target 1250',
    '  3. 320B Greedy Combo 3 | 1390 | greedy, sortings | target 1350',
    '',
  ].join('\n'));
});

test('CLI next topic override uses the requested topic', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'pupil',
    rating: 1000,
    maxRating: 1000,
  });
  writeJson(path.join(cacheDir, 'submissions.json'), {
    handle: 'tourist',
    items: [
      {
        id: 1,
        verdict: 'OK',
        creationTimeSeconds: 1,
        problemKey: '100A',
        problem: { key: '100A', name: '100A', rating: 800, tags: ['sortings'] },
      },
      {
        id: 2,
        verdict: 'OK',
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
      { key: '100A', name: '100A', rating: 800, tags: ['sortings'] },
      { key: '100B', name: '100B', rating: 900, tags: ['sortings'] },
      { key: '500B', name: 'Sortings Combo Anchor', rating: 1450, tags: ['sortings', 'greedy'] },
      { key: '510B', name: 'Sortings Combo 1', rating: 1190, tags: ['sortings', 'greedy'] },
      { key: '520B', name: 'Sortings Combo 2', rating: 1290, tags: ['sortings', 'greedy'] },
      { key: '530B', name: 'Sortings Combo 3', rating: 1390, tags: ['sortings', 'greedy'] },
    ],
  });

  const result = runCli(['next', '--handle', 'tourist', '--topic', 'sortings'], homeDir);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, [
    '下一题推荐：tourist',
    '当前 rating：1000',
    '当前阶段：第 1 阶段 排序 + 贪心',
    '当前主题：sortings（手动指定，已完成 2/4）',
    '锚点难度：1400-1500',
    '',
    'Anchor：',
    '  - 500B Sortings Combo Anchor | 1450 | sortings, greedy',
    '',
    'Prerequisites：',
    '  1. 510B Sortings Combo 1 | 1190 | sortings, greedy | target 1150',
    '  2. 520B Sortings Combo 2 | 1290 | sortings, greedy | target 1250',
    '  3. 530B Sortings Combo 3 | 1390 | sortings, greedy | target 1350',
    '',
  ].join('\n'));
});

test('CLI next review mode prints anchors that need revisit', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'pupil',
    rating: 1000,
    maxRating: 1000,
  });
  writeJson(path.join(cacheDir, 'submissions.json'), {
    handle: 'tourist',
    items: [
      {
        id: 1,
        verdict: 'OK',
        creationTimeSeconds: 1,
        problemKey: '700A',
        problem: { key: '700A', name: 'Old Anchor', rating: 1450, tags: ['greedy', 'sortings'] },
      },
      {
        id: 2,
        verdict: 'OK',
        creationTimeSeconds: 2,
        problemKey: '710A',
        problem: { key: '710A', name: 'Prereq 1', rating: 1180, tags: ['greedy', 'sortings'] },
      },
      {
        id: 3,
        verdict: 'OK',
        creationTimeSeconds: 3,
        problemKey: '720A',
        problem: { key: '720A', name: 'Prereq 2', rating: 1280, tags: ['greedy', 'sortings'] },
      },
      {
        id: 4,
        verdict: 'OK',
        creationTimeSeconds: 4,
        problemKey: '730A',
        problem: { key: '730A', name: 'Prereq 3', rating: 1380, tags: ['greedy', 'sortings'] },
      },
    ],
  });
  writeJson(path.join(cacheDir, 'rating.json'), {
    handle: 'tourist',
    items: [],
  });
  writeJson(path.join(cacheDir, 'problems.json'), {
    items: [
      { key: '700A', name: 'Old Anchor', rating: 1450, tags: ['greedy', 'sortings'] },
      { key: '710A', name: 'Prereq 1', rating: 1180, tags: ['greedy', 'sortings'] },
      { key: '720A', name: 'Prereq 2', rating: 1280, tags: ['greedy', 'sortings'] },
      { key: '730A', name: 'Prereq 3', rating: 1380, tags: ['greedy', 'sortings'] },
    ],
  });

  const result = runCli(['next', '--handle', 'tourist', '--review', '--topic', 'greedy'], homeDir);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, [
    '复习锚点：tourist',
    '当前 rating：1000',
    '当前阶段：第 1 阶段 排序 + 贪心',
    '当前主题：greedy',
    '',
    '待回打锚点：',
    '  1. 700A Old Anchor | 1450 | greedy, sortings',
    '     前置已完成：710A(1180), 720A(1280), 730A(1380)',
    '',
  ].join('\n'));
});
