'use strict';

const { apiUrl } = require('../lib/client');

// Hidden trigger powering the "Sequence" dropdowns.
module.exports = {
  key: 'sequence_list',
  noun: 'Sequence',
  display: {
    label: 'List Sequences',
    description: 'Lists sequence versions for dropdowns.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    canPaginate: true,
    perform: async (z, bundle) => {
      const limit = 100;
      const response = await z.request({
        url: apiUrl(bundle, '/sequences'),
        params: { limit, offset: (bundle.meta.page || 0) * limit },
      });
      const items = (response.data && response.data.items) || [];
      return items.map((s) => ({
        id: s.id,
        name: `${s.name} v${s.version} (${s.namespace})${s.deprecated ? ' [deprecated]' : ''}`,
        sequence_name: s.name,
        version: s.version,
        namespace: s.namespace,
      }));
    },
    sample: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'welcome v3 (default)',
      sequence_name: 'welcome',
      version: 3,
      namespace: 'default',
    },
  },
};
