#!/usr/bin/env node

const { runCli } = require('./src/cli');

process.exitCode = runCli(process.argv.slice(2));
