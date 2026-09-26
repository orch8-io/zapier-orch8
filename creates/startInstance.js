'use strict';

const { apiUrl, parseJsonField } = require('../lib/client');

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const body = {
    sequence_id: input.sequence_id,
    tenant_id: bundle.authData.tenantId,
    namespace: input.namespace || 'default',
  };
  const data = parseJsonField(z, input.input, 'Input (context.data)');
  if (data !== undefined) body.context = { data };
  const metadata = parseJsonField(z, input.metadata, 'Metadata');
  if (metadata !== undefined) body.metadata = metadata;
  if (input.idempotency_key) body.idempotency_key = input.idempotency_key;
  if (input.next_fire_at) body.next_fire_at = input.next_fire_at;
  if (input.timezone) body.timezone = input.timezone;
  if (input.dry_run) body.dry_run = true;

  const response = await z.request({ method: 'POST', url: apiUrl(bundle, '/instances'), body });
  const result = response.data || {};
  return { id: result.id, deduplicated: Boolean(result.deduplicated), sequence_id: input.sequence_id };
};

module.exports = {
  key: 'start_instance',
  noun: 'Instance',
  display: {
    label: 'Start Workflow Instance',
    description: 'Starts a new instance of an Orch8 sequence.',
  },
  operation: {
    inputFields: [
      {
        key: 'sequence_id',
        label: 'Sequence',
        required: true,
        dynamic: 'sequence_list.id.name',
        helpText: 'Sequence version to run (UUID).',
      },
      { key: 'namespace', label: 'Namespace', default: 'default', required: false },
      {
        key: 'input',
        label: 'Input (JSON)',
        type: 'text',
        required: false,
        helpText: 'JSON object that becomes the instance `context.data`.',
      },
      { key: 'metadata', label: 'Metadata (JSON)', type: 'text', required: false },
      {
        key: 'idempotency_key',
        label: 'Idempotency Key',
        required: false,
        helpText: 'Repeated starts with the same key return the existing instance instead of creating a new one.',
      },
      { key: 'next_fire_at', label: 'Start At', type: 'datetime', required: false },
      { key: 'timezone', label: 'Timezone', required: false, helpText: 'IANA timezone, default UTC.' },
      { key: 'dry_run', label: 'Dry Run', type: 'boolean', required: false, default: 'false' },
    ],
    perform,
    sample: {
      id: '0194d2e6-7f44-7e2a-9c3e-1a2b3c4d5e6f',
      deduplicated: false,
      sequence_id: '550e8400-e29b-41d4-a716-446655440000',
    },
    outputFields: [
      { key: 'id', label: 'Instance ID' },
      { key: 'deduplicated', label: 'Deduplicated', type: 'boolean' },
      { key: 'sequence_id', label: 'Sequence ID' },
    ],
  },
};
