'use strict';

const { makeInstanceTrigger } = require('../lib/instanceTrigger');

module.exports = makeInstanceTrigger({
  key: 'instance_failed',
  state: 'failed',
  noun: 'Instance',
  label: 'Instance Failed',
  description: 'Triggers when a workflow instance reaches the failed state (including DLQ entry).',
});
