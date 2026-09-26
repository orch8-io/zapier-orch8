'use strict';

const { apiUrl } = require('./client');

const sampleInstance = (state) => ({
  id: '0194d2e6-7f44-7e2a-9c3e-1a2b3c4d5e6f',
  sequence_id: '550e8400-e29b-41d4-a716-446655440000',
  tenant_id: 'acme',
  namespace: 'default',
  state,
  priority: 'Normal',
  timezone: 'UTC',
  metadata: { campaign: 'spring' },
  context: { data: { email: 'john@acme.com' }, config: {} },
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-01T12:05:00Z',
});

const outputFields = [
  { key: 'id', label: 'Instance ID' },
  { key: 'sequence_id', label: 'Sequence ID' },
  { key: 'tenant_id', label: 'Tenant ID' },
  { key: 'namespace', label: 'Namespace' },
  { key: 'state', label: 'State' },
  { key: 'created_at', label: 'Created At', type: 'datetime' },
  { key: 'updated_at', label: 'Updated At', type: 'datetime' },
];

// Polling trigger over GET /instances?state=<state>. The engine has no
// webhook subscribe/unsubscribe API (outbound webhooks are static server
// config), so these are polling triggers. Zapier dedupes on `id`, which is
// stable for a terminal instance.
const makeInstanceTrigger = ({ key, state, noun, label, description }) => ({
  key,
  noun,
  display: { label, description },
  operation: {
    type: 'polling',
    inputFields: [
      {
        key: 'sequence_id',
        label: 'Sequence',
        required: false,
        dynamic: 'sequence_list.id.name',
        helpText: 'Only fire for instances of this sequence version (optional).',
      },
      { key: 'namespace', label: 'Namespace', required: false, helpText: 'Optional namespace filter.' },
    ],
    perform: async (z, bundle) => {
      const params = { state, limit: 100 };
      if (bundle.inputData.sequence_id) params.sequence_id = bundle.inputData.sequence_id;
      if (bundle.inputData.namespace) params.namespace = bundle.inputData.namespace;
      const response = await z.request({ url: apiUrl(bundle, '/instances'), params });
      const items = (response.data && response.data.items) || [];
      // Newest-first so Zapier's dedupe sees fresh items at the top.
      return items
        .slice()
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    },
    sample: sampleInstance(state),
    outputFields,
  },
});

module.exports = { makeInstanceTrigger, sampleInstance, outputFields };
