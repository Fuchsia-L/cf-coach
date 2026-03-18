const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { readJsonFile, writeJsonFile } = require('../src/json-file');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cf-coach-json-'));
}

test('writeJsonFile and readJsonFile round-trip valid JSON', () => {
  const tempDir = createTempDir();
  const filePath = path.join(tempDir, 'data.json');

  writeJsonFile(filePath, { handle: 'Fuchsia_L' });

  assert.deepEqual(readJsonFile(filePath), { handle: 'Fuchsia_L' });
});

test('readJsonFile reports missing files clearly', () => {
  const tempDir = createTempDir();
  const filePath = path.join(tempDir, 'missing.json');

  assert.throws(
    () => readJsonFile(filePath),
    /读取 JSON 文件失败：文件不存在/
  );
});

test('readJsonFile reports malformed JSON clearly', () => {
  const tempDir = createTempDir();
  const filePath = path.join(tempDir, 'broken.json');

  fs.writeFileSync(filePath, '{bad json', 'utf8');

  assert.throws(
    () => readJsonFile(filePath),
    /读取 JSON 文件失败：JSON 格式错误/
  );
});
