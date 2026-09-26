'use strict';

const authentication = require('./authentication');
const { addAuthHeaders, handleErrors } = require('./lib/middleware');

const instanceCompleted = require('./triggers/instanceCompleted');
const instanceFailed = require('./triggers/instanceFailed');
const sequenceList = require('./triggers/sequenceList');
const startInstance = require('./creates/startInstance');
const sendSignal = require('./creates/sendSignal');
const enqueueJob = require('./creates/enqueueJob');
const findInstance = require('./searches/findInstance');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,
  beforeRequest: [addAuthHeaders],
  afterResponse: [handleErrors],

  triggers: {
    [instanceCompleted.key]: instanceCompleted,
    [instanceFailed.key]: instanceFailed,
    [sequenceList.key]: sequenceList,
  },
  creates: {
    [startInstance.key]: startInstance,
    [sendSignal.key]: sendSignal,
    [enqueueJob.key]: enqueueJob,
  },
  searches: {
    [findInstance.key]: findInstance,
  },
  searchOrCreates: {
    [findInstance.key]: {
      key: findInstance.key,
      display: {
        label: 'Find or Start Instance',
        description: 'Finds an instance by ID/metadata, or starts a new one.',
      },
      search: findInstance.key,
      create: startInstance.key,
    },
  },
};
