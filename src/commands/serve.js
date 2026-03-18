const { createDashboardServer } = require('../dashboard-server');
const { writeLine } = require('../terminal');

const DEFAULT_DASHBOARD_PORT = 3000;

function parseServeArgs(args = []) {
  let port = DEFAULT_DASHBOARD_PORT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg !== '--port') {
      return {
        port,
        error: `serve 不支持选项：${arg}`,
      };
    }

    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      return {
        port,
        error: '选项 --port 需要一个值',
      };
    }

    if (!/^\d+$/.test(value)) {
      return {
        port,
        error: `端口无效：${value}`,
      };
    }

    const numericPort = Number(value);

    if (!Number.isInteger(numericPort) || numericPort < 0 || numericPort > 65535) {
      return {
        port,
        error: `端口无效：${value}`,
      };
    }

    port = numericPort;
    index += 1;
  }

  return {
    port,
    error: null,
  };
}

function waitForShutdown(serverRef, processRef) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      processRef.removeListener('SIGINT', handleSignal);
      processRef.removeListener('SIGTERM', handleSignal);
    };

    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback();
    };

    const handleSignal = () => {
      Promise.resolve(serverRef.close())
        .then(() => {
          finish(() => resolve(0));
        })
        .catch((error) => {
          finish(() => reject(error));
        });
    };

    processRef.once('SIGINT', handleSignal);
    processRef.once('SIGTERM', handleSignal);
  });
}

async function runServeCommand(context) {
  const parsed = parseServeArgs(context.args);

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  const serverFactory = context.createDashboardServer || createDashboardServer;
  const serverRef = serverFactory();
  const activePort = await serverRef.listen(parsed.port);

  writeLine(context.stdout, `Dashboard: http://localhost:${activePort}`);

  return waitForShutdown(serverRef, context.processRef || process);
}

module.exports = {
  DEFAULT_DASHBOARD_PORT,
  parseServeArgs,
  runServeCommand,
  waitForShutdown,
};
