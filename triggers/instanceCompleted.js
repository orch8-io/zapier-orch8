'use strict';

const { makeInstanceTrigger } = require('../lib/instanceTrigger');

module.exports = makeInstanceTrigger({
  key: 'instance_completed',
  state: 'completed',
  noun: 'Instance',
  label: 'Instance Completed',
  description: 'Triggers when a workflow instance reaches the completed state.',
});
