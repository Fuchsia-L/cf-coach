const { COMMANDS } = require('./constants');

const COMMAND_SET = new Set(COMMANDS);

function parseArgs(argv) {
  const options = {
    handle: null,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      return {
        command: null,
        commandArgs: [],
        options,
        showHelp: true,
        error: null,
      };
    }

    if (arg === '--handle') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        return {
          command: null,
          commandArgs: [],
          options,
          showHelp: false,
          error: '选项 --handle 需要一个值',
        };
      }

      options.handle = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      return {
        command: null,
        commandArgs: [],
        options,
        showHelp: false,
        error: `未知选项：${arg}`,
      };
    }

    positional.push(arg);
  }

  const command = positional[0] || null;
  const commandArgs = positional.slice(1);

  if (!command) {
    return {
      command: null,
      commandArgs: [],
      options,
      showHelp: true,
      error: null,
    };
  }

  if (!COMMAND_SET.has(command)) {
    return {
      command,
      commandArgs,
      options,
      showHelp: false,
      error: `未知命令：${command}`,
    };
  }

  return {
    command,
    commandArgs,
    options,
    showHelp: false,
    error: null,
  };
}

module.exports = {
  parseArgs,
};
