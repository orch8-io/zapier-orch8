'use strict';

const BASE = 'https://orch8.test';
const authData = { baseUrl: `${BASE}/`, apiKey: 'secret-key', tenantId: 'acme' };
const reqheaders = { 'x-api-key': 'secret-key', 'x-tenant-id': 'acme' };

module.exports = { BASE, authData, reqheaders };
