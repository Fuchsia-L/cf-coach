function writeLine(stream, message = '') {
  stream.write(`${message}\n`);
}

function printError(stderr, error) {
  writeLine(stderr, error.message || String(error));
}

module.exports = {
  printError,
  writeLine,
};
