'use strict';

const { apiUrl } = require('./lib/client');

// Cheap authenticated call: list at most one sequence for the tenant.
const test = async (z, bundle) => {
  const response = await z.request({
    url: apiUrl(bundle, '/sequences'),
    params: { limit: 1 },
  });
  return response.data;
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'baseUrl',
      label: 'Engine Base URL',
      required: true,
      type: 'string',
      helpText: 'Root URL of your Orch8 engine, e.g. `https://orch8.example.com` (no `/api/v1` suffix).',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      required: true,
      type: 'password',
      helpText: 'Orch8 API key, sent as the `x-api-key` header. An `operator`-capability tenant key is recommended.',
    },
    {
      key: 'tenantId',
      label: 'Tenant ID',
      required: true,
      type: 'string',
      helpText: 'Tenant to operate in, sent as the `x-tenant-id` header.',
    },
  ],
  test,
  connectionLabel: '{{bundle.authData.tenantId}} @ {{bundle.authData.baseUrl}}',
};
