'use strict';

const { apiUrl } = require('../lib/client');
const { sampleInstance, outputFields } = require('../lib/instanceTrigger');

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  if (input.instance_id) {
    const response = await z.request({
      url: apiUrl(bundle, `/instances/${encodeURIComponent(input.instance_id)}`),
      skipThrowForStatus: true,
    });
    if (response.status === 404) return [];
    if (response.status === 401 || response.status === 403) {
      throw new z.errors.RefreshAuthError(`Orch8 rejected the credentials (${response.status}).`);
    }
    response.throwForStatus();
    return [response.data];
  }
  if (!input.metadata_key) {
    throw new z.errors.Error('Provide an Instance ID, or a Metadata Key and Value to search by.', 'InvalidInput', 400);
  }
  const params = { limit: 10, [`metadata.${input.metadata_key}`]: input.metadata_value || '' };
  if (input.state) params.state = input.state;
  if (input.sequence_id) params.sequence_id = input.sequence_id;
  const response = await z.request({ url: apiUrl(bundle, '/instances'), params });
  return (response.data && response.data.items) || [];
};

module.exports = {
  key: 'find_instance',
  noun: 'Instance',
  display: {
    label: 'Find Instance',
    description: 'Finds a workflow instance by ID, or by a metadata key/value pair.',
  },
  operation: {
    inputFields: [
      { key: 'instance_id', label: 'Instance ID', required: false },
      {
        key: 'metadata_key',
        label: 'Metadata Key',
        required: false,
        helpText: 'Top-level metadata key to match (used when Instance ID is empty).',
      },
      { key: 'metadata_value', label: 'Metadata Value', required: false },
      {
        key: 'state',
        label: 'State',
        required: false,
        choices: ['scheduled', 'running', 'waiting', 'paused', 'completed', 'failed', 'cancelled'],
      },
      { key: 'sequence_id', label: 'Sequence', required: false, dynamic: 'sequence_list.id.name' },
    ],
    perform,
    sample: sampleInstance('completed'),
    outputFields,
  },
};
