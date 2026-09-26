'use strict';

const addAuthHeaders = (request, z, bundle) => {
  request.headers = request.headers || {};
  if (bundle.authData.apiKey) request.headers['x-api-key'] = bundle.authData.apiKey;
  if (bundle.authData.tenantId) request.headers['x-tenant-id'] = bundle.authData.tenantId;
  request.headers.Accept = request.headers.Accept || 'application/json';
  return request;
};

// Map engine errors ({"error": "..."} bodies) to Zapier errors.
const handleErrors = (response, z) => {
  // Actions that inspect status codes themselves opt out.
  if (response.request && response.request.skipThrowForStatus) return response;
  if (response.status === 401 || response.status === 403) {
    throw new z.errors.RefreshAuthError(
      `Orch8 rejected the credentials (${response.status}). Check the API key and tenant.`,
    );
  }
  if (response.status >= 400) {
    let detail = response.content;
    try {
      const body = JSON.parse(response.content);
      detail = body.error || body.message || response.content;
    } catch (_) {
      /* non-JSON body */
    }
    throw new z.errors.Error(`Orch8 API error ${response.status}: ${detail}`, 'ApiError', response.status);
  }
  return response;
};

module.exports = { addAuthHeaders, handleErrors };
