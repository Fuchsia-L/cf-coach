const { COMMANDS } = require('./constants');
const { parseArgs } = require('./args');
const { loadConfig } = require('./storage');
const { printError, writeLine } = require('./terminal');

function formatHelp() {
  return [
    '用法：node cf.js <命令> [选项]',
    '',
    '可用命令：',
    ...COMMANDS.map((command) => `  ${command}`),
    '',
    '全局选项：',
    '  --handle <value>  指定本次命令使用的 Codeforces handle',
    '  -h, --help        显示帮助信息',
  ].join('\n');
}

function runPlaceholderCommand(command, context) {
  writeLine(context.stdout, `命令 ${command} 已就绪，当前 handle：${context.handle}`);
  return 0;
}

function runCli(argv, runtime = {}) {
  const stdout = runtime.stdout || process.stdout;
  const stderr = runtime.stderr || process.stderr;
  const env = runtime.env || process.env;

  try {
    const parsed = parseArgs(argv);

    if (parsed.error) {
      writeLine(stderr, parsed.error);

      if (parsed.error.startsWith('未知命令')) {
        writeLine(stderr);
        writeLine(stderr, formatHelp());
      }

      return 1;
    }

    const { config } = loadConfig(env);

    if (parsed.showHelp) {
      writeLine(stdout, formatHelp());
      return 0;
    }

    const handle = parsed.options.handle || config.handle;

    return runPlaceholderCommand(parsed.command, {
      stdout,
      stderr,
      env,
      handle,
      args: parsed.commandArgs,
    });
  } catch (error) {
    printError(stderr, error);
    return 1;
  }
}

module.exports = {
  formatHelp,
  runCli,
};
