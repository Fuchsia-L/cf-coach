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

function runCliWithEnv(args, env) {
  return spawnSync(process.execPath, ['cf.js', ...args], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf8',
  });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function createFixtureDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `cf-coach-${name}-`));
}

function writeApiFixture(fixtureDir, method, payload) {
  writeJson(path.join(fixtureDir, `${method}.json`), payload);
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

test('CLI end-to-end fixture flow supports fetch then offline analytics', () => {
  const homeDir = createHomeDir();
  const fixtureDir = createFixtureDir('api-fixture');

  writeApiFixture(fixtureDir, 'user.info', {
    status: 'OK',
    result: [{
      handle: 'tourist',
      rank: 'pupil',
      rating: 1000,
      maxRank: 'pupil',
      maxRating: 1000,
    }],
  });
  writeApiFixture(fixtureDir, 'user.status', {
    status: 'OK',
    result: [
      {
        id: 1,
        creationTimeSeconds: 100,
        verdict: 'OK',
        author: { members: [{ handle: 'tourist' }] },
        problem: {
          contestId: 100,
          index: 'A',
          name: 'Sortings Easy',
          rating: 800,
          tags: ['sortings'],
        },
      },
      {
        id: 2,
        creationTimeSeconds: 200,
        verdict: 'OK',
        author: { members: [{ handle: 'tourist' }] },
        problem: {
          contestId: 100,
          index: 'B',
          name: 'Sortings Medium',
          rating: 900,
          tags: ['sortings'],
        },
      },
      {
        id: 3,
        creationTimeSeconds: 300,
        verdict: 'WRONG_ANSWER',
        author: { members: [{ handle: 'tourist' }] },
        problem: {
          contestId: 101,
          index: 'A',
          name: 'Greedy Fail',
          rating: 800,
          tags: ['greedy'],
        },
      },
    ],
  });
  writeApiFixture(fixtureDir, 'user.rating', {
    status: 'OK',
    result: [{
      contestId: 201,
      contestName: 'Round 201',
      handle: 'tourist',
      rank: 100,
      ratingUpdateTimeSeconds: 1000,
      oldRating: 950,
      newRating: 1000,
    }],
  });
  writeApiFixture(fixtureDir, 'problemset.problems', {
    status: 'OK',
    result: {
      problems: [
        {
          contestId: 100,
          index: 'A',
          name: 'Sortings Easy',
          rating: 800,
          tags: ['sortings'],
        },
        {
          contestId: 100,
          index: 'B',
          name: 'Sortings Medium',
          rating: 900,
          tags: ['sortings'],
        },
        {
          contestId: 101,
          index: 'A',
          name: 'Greedy Fail',
          rating: 800,
          tags: ['greedy'],
        },
        {
          contestId: 300,
          index: 'B',
          name: 'Greedy Combo 1',
          rating: 1190,
          tags: ['greedy', 'sortings'],
        },
        {
          contestId: 310,
          index: 'B',
          name: 'Greedy Combo 2',
          rating: 1290,
          tags: ['greedy', 'sortings'],
        },
        {
          contestId: 320,
          index: 'B',
          name: 'Greedy Combo 3',
          rating: 1390,
          tags: ['greedy', 'sortings'],
        },
        {
          contestId: 400,
          index: 'B',
          name: 'Greedy Combo Anchor',
          rating: 1450,
          tags: ['greedy', 'sortings'],
        },
      ],
      problemStatistics: [
        { contestId: 100, index: 'A', solvedCount: 1000 },
        { contestId: 100, index: 'B', solvedCount: 900 },
        { contestId: 101, index: 'A', solvedCount: 800 },
        { contestId: 300, index: 'B', solvedCount: 700 },
        { contestId: 310, index: 'B', solvedCount: 600 },
        { contestId: 320, index: 'B', solvedCount: 500 },
        { contestId: 400, index: 'B', solvedCount: 400 },
      ],
    },
  });

  const fetchResult = runCliWithEnv(['fetch', '--handle', 'tourist'], {
    CF_COACH_HOME: homeDir,
    CF_COACH_API_FIXTURE_DIR: fixtureDir,
  });

  assert.equal(fetchResult.status, 0);
  assert.match(fetchResult.stdout, /fetch 完成：新提交 3，新增 AC 2，rating 更新 1，新增题目 7。/);

  const statsResult = runCliWithEnv(['stats', '--handle', 'tourist'], {
    CF_COACH_HOME: homeDir,
  });
  const weakResult = runCliWithEnv(['weak', '--handle', 'tourist'], {
    CF_COACH_HOME: homeDir,
  });
  const nextResult = runCliWithEnv(['next', '--handle', 'tourist'], {
    CF_COACH_HOME: homeDir,
  });

  assert.equal(statsResult.status, 0);
  assert.match(statsResult.stdout, /统计：tourist/);
  assert.match(statsResult.stdout, /总 AC 题数：2/);
  assert.equal(weakResult.status, 0);
  assert.match(weakResult.stdout, /优先训练建议：/);
  assert.equal(nextResult.status, 0);
  assert.match(nextResult.stdout, /下一题推荐：tourist/);
  assert.match(nextResult.stdout, /400B Greedy Combo Anchor/);
});

test('CLI analytics commands report missing cache with a fetch hint', () => {
  const homeDir = createHomeDir();
  const result = runCli(['stats', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /缺少本地缓存/);
  assert.match(result.stderr, /node cf\.js fetch --handle tourist/);
});

test('CLI analytics commands report partial or malformed cache files clearly', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rating: 1000,
    rank: 'pupil',
  });
  writeText(path.join(cacheDir, 'submissions.json'), '{broken');

  const result = runCli(['weak', '--handle', 'tourist'], homeDir);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /本地缓存已损坏：submissions\.json/);
  assert.match(result.stderr, /node cf\.js fetch --handle tourist/);
});

test('CLI analytics commands reject stale cache for another handle', () => {
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
    items: [],
  });
  writeJson(path.join(cacheDir, 'rating.json'), {
    handle: 'tourist',
    items: [],
  });
  writeJson(path.join(cacheDir, 'problems.json'), {
    items: [],
  });

  const result = runCli(['stats', '--handle', 'Benq'], homeDir);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /本地缓存较旧，当前为 tourist/);
  assert.match(result.stderr, /fetch --handle Benq/);
});

test('CLI reports malformed roadmap files with the configured path', () => {
  const homeDir = createHomeDir();
  const cacheDir = path.join(homeDir, '.cf-coach', 'cache');
  const brokenMapPath = path.join(homeDir, 'broken-map.md');

  writeJson(path.join(cacheDir, 'user.json'), {
    handle: 'tourist',
    rank: 'pupil',
    rating: 1000,
    maxRating: 1000,
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
    items: [
      { key: '400B', name: 'Greedy Combo Anchor', rating: 1450, tags: ['greedy', 'sortings'] },
    ],
  });
  writeText(brokenMapPath, '## Stage 1 - Broken\n- Rating: 800-1000\n');

  const result = runCliWithEnv(['next', '--handle', 'tourist'], {
    CF_COACH_HOME: homeDir,
    CF_COACH_MAP_PATH: brokenMapPath,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /解析训练路线失败/);
  assert.match(result.stderr, /broken-map\.md/);
  assert.match(result.stderr, /缺少 tags/);
});

test('CLI fetch reports invalid handles from fixture responses', () => {
  const homeDir = createHomeDir();
  const fixtureDir = createFixtureDir('api-invalid-handle');

  writeApiFixture(fixtureDir, 'user.info', {
    status: 'FAILED',
    comment: 'handles: User with handle missing_handle not found',
  });
  writeApiFixture(fixtureDir, 'user.status', {
    status: 'OK',
    result: [],
  });
  writeApiFixture(fixtureDir, 'user.rating', {
    status: 'OK',
    result: [],
  });
  writeApiFixture(fixtureDir, 'problemset.problems', {
    status: 'OK',
    result: {
      problems: [],
      problemStatistics: [],
    },
  });

  const result = runCliWithEnv(['fetch', '--handle', 'missing_handle'], {
    CF_COACH_HOME: homeDir,
    CF_COACH_API_FIXTURE_DIR: fixtureDir,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /handle missing_handle 不存在/);
});

test('README and help text document the supported workflow', () => {
  const readme = fs.readFileSync(path.resolve(__dirname, '..', 'README.md'), 'utf8');
  const helpResult = runCli(['--help'], createHomeDir());
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));

  assert.equal(helpResult.status, 0);
  assert.match(helpResult.stdout, /fetch/);
  assert.match(helpResult.stdout, /stats/);
  assert.match(helpResult.stdout, /weak/);
  assert.match(helpResult.stdout, /next/);
  assert.match(readme, /安装与运行/);
  assert.match(readme, /常用命令/);
  assert.match(readme, /配置/);
  assert.match(readme, /缓存布局/);
  assert.match(readme, /典型工作流/);
  assert.match(readme, /node cf\.js fetch --handle <handle>/);
  assert.match(readme, /node cf\.js stats --handle <handle>/);
  assert.match(readme, /node cf\.js weak --handle <handle>/);
  assert.match(readme, /node cf\.js next --handle <handle>/);
  assert.ok(!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0);
});
