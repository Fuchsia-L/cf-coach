const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs } = require('../src/args');

test('parseArgs detects help when no command is provided', () => {
  const result = parseArgs([]);

  assert.equal(result.command, null);
  assert.equal(result.showHelp, true);
  assert.equal(result.error, null);
});

test('parseArgs detects a valid command', () => {
  const result = parseArgs(['stats']);

  assert.equal(result.command, 'stats');
  assert.deepEqual(result.commandArgs, []);
  assert.equal(result.error, null);
});

test('parseArgs reads handle override after command', () => {
  const result = parseArgs(['stats', '--handle', 'tourist']);

  assert.equal(result.command, 'stats');
  assert.equal(result.options.handle, 'tourist');
});

test('parseArgs reads handle override before command', () => {
  const result = parseArgs(['--handle', 'Benq', 'fetch']);

  assert.equal(result.command, 'fetch');
  assert.equal(result.options.handle, 'Benq');
});

test('parseArgs reports a missing handle value', () => {
  const result = parseArgs(['stats', '--handle']);

  assert.equal(result.error, '选项 --handle 需要一个值');
});

test('parseArgs preserves command-specific flags after the command name', () => {
  const result = parseArgs(['next', '--topic', 'dp', '--review']);

  assert.equal(result.command, 'next');
  assert.deepEqual(result.commandArgs, ['--topic', 'dp', '--review']);
  assert.equal(result.error, null);
});
