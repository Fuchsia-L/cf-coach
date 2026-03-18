const COMMANDS = [
  'fetch',
  'stats',
  'weak',
  'next',
  'log',
  'progress',
  'edit',
  'advice',
];

const DEFAULT_CONFIG = {
  handle: 'Fuchsia_L',
  currentTopic: null,
  topicOverrides: {},
};

module.exports = {
  COMMANDS,
  DEFAULT_CONFIG,
};
