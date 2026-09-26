'use strict';

const { apiUrl, parseJsonField } = require('../lib/client');

// POST /api/v1/jobs — background-jobs API. Requires an engine release that
// ships the jobs endpoint (newer than the current 0.x release line).
const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const body = { handler: input.handler };
  const payload = parseJsonField(z, input.payload, 'Payload');
  body.payload = payload === undefined ? {} : payload;
  if (input.queue) body.queue = input.queue;
  if (input.priority) body.priority = input.priority;
  const retry = parseJsonField(z, input.retry, 'Retry Policy');
  if (retry !== undefined) body.retry = retry;
  if (input.delay_ms !== undefined && input.delay_ms !== null && input.delay_ms !== '') {
    body.delay_ms = Number(input.delay_ms);
  }
  if (input.run_at) body.run_at = input.run_at;
  if (input.idempotency_key) body.idempotency_key = input.idempotency_key;
  const metadata = parseJsonField(z, input.metadata, 'Metadata');
  if (metadata !== undefined) body.metadata = metadata;

  const response = await z.request({ method: 'POST', url: apiUrl(bundle, '/jobs'), body, skipThrowForStatus: true });
  if (response.status === 404) {
    throw new z.errors.Error(
      'This Orch8 engine does not expose POST /api/v1/jobs. Upgrade the engine to a release with the background-jobs API.',
      'JobsApiUnavailable',
      404,
    );
  }
  if (response.status >= 400) {
    let detail = response.content;
    try {
      detail = JSON.parse(response.content).error || detail;
    } catch (_) {
      /* non-JSON */
    }
    if (response.status === 401 || response.status === 403) {
      throw new z.errors.RefreshAuthError(`Orch8 rejected the credentials (${response.status}).`);
    }
    throw new z.errors.Error(`Orch8 API error ${response.status}: ${detail}`, 'ApiError', response.status);
  }
  return response.data;
};

module.exports = {
  key: 'enqueue_job',
  noun: 'Job',
  display: {
    label: 'Enqueue Job',
    description: 'Enqueues a background job for a worker handler (requires an engine release with the Jobs API).',
  },
  operation: {
    inputFields: [
      { key: 'handler', label: 'Handler', required: true, helpText: 'Worker handler name.' },
      { key: 'payload', label: 'Payload (JSON)', type: 'text', required: false },
      { key: 'queue', label: 'Queue', required: false },
      { key: 'priority', label: 'Priority', required: false },
      { key: 'retry', label: 'Retry Policy (JSON)', type: 'text', required: false },
      { key: 'delay_ms', label: 'Delay (ms)', type: 'integer', required: false },
      { key: 'run_at', label: 'Run At', type: 'datetime', required: false },
      { key: 'idempotency_key', label: 'Idempotency Key', required: false },
      { key: 'metadata', label: 'Metadata (JSON)', type: 'text', required: false },
    ],
    perform,
    sample: {
      id: '0194d2e6-9000-7000-8000-000000000002',
      instance_id: '0194d2e6-9000-7000-8000-000000000003',
      handler: 'send_email',
      status: 'scheduled',
      created_at: '2026-09-01T12:00:00Z',
      run_at: '2026-09-01T12:00:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Job ID' },
      { key: 'instance_id', label: 'Instance ID' },
      { key: 'handler', label: 'Handler' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'run_at', label: 'Run At', type: 'datetime' },
    ],
  },
};
