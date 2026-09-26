'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');
const App = require('../index');
const { BASE, authData, reqheaders } = require('./helpers');

const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const inst = (id, state, updated) => ({
  id,
  sequence_id: 'seq-1',
  tenant_id: 'acme',
  namespace: 'default',
  state,
  metadata: {},
  context: { data: {} },
  created_at: '2026-09-01T00:00:00Z',
  updated_at: updated,
});

beforeAll(() => nock.disableNetConnect());
afterEach(() => {
  expect(nock.isDone()).toBe(true);
  nock.cleanAll();
});
afterAll(() => nock.enableNetConnect());

describe('authentication', () => {
  it('passes with valid credentials and sends auth headers', async () => {
    nock(BASE, { reqheaders })
      .get('/api/v1/sequences')
      .query({ limit: 1 })
      .reply(200, { items: [], has_more: false });
    const result = await appTester(App.authentication.test, { authData });
    expect(result).toEqual({ items: [], has_more: false });
  });

  it('fails with a refresh-auth error on 401', async () => {
    nock(BASE).get('/api/v1/sequences').query(true).reply(401, { error: 'unauthorized' });
    await expect(appTester(App.authentication.test, { authData })).rejects.toThrow(/rejected the credentials/);
  });
});

describe('triggers', () => {
  it('instance_completed polls completed instances newest first', async () => {
    nock(BASE, { reqheaders })
      .get('/api/v1/instances')
      .query({ state: 'completed', limit: 100, sequence_id: 'seq-1' })
      .reply(200, {
        items: [inst('a', 'completed', '2026-09-01T00:01:00Z'), inst('b', 'completed', '2026-09-01T00:05:00Z')],
        has_more: false,
      });
    const results = await appTester(App.triggers.instance_completed.operation.perform, {
      authData,
      inputData: { sequence_id: 'seq-1' },
    });
    expect(results.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('instance_failed polls failed instances with namespace filter', async () => {
    nock(BASE)
      .get('/api/v1/instances')
      .query({ state: 'failed', limit: 100, namespace: 'ops' })
      .reply(200, { items: [inst('f', 'failed', '2026-09-01T00:01:00Z')], has_more: false });
    const results = await appTester(App.triggers.instance_failed.operation.perform, {
      authData,
      inputData: { namespace: 'ops' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].state).toBe('failed');
  });

  it('sequence_list maps sequences for dropdowns with pagination', async () => {
    nock(BASE)
      .get('/api/v1/sequences')
      .query({ limit: 100, offset: 100 })
      .reply(200, {
        items: [{ id: 's1', name: 'welcome', version: 2, namespace: 'default', deprecated: false }],
        has_more: false,
      });
    const results = await appTester(App.triggers.sequence_list.operation.perform, {
      authData,
      meta: { page: 1 },
    });
    expect(results).toEqual([
      { id: 's1', name: 'welcome v2 (default)', sequence_name: 'welcome', version: 2, namespace: 'default' },
    ]);
  });
});

describe('creates', () => {
  it('start_instance posts the instance with tenant and parsed JSON', async () => {
    nock(BASE, { reqheaders })
      .post('/api/v1/instances', {
        sequence_id: 'seq-1',
        tenant_id: 'acme',
        namespace: 'default',
        context: { data: { email: 'a@b.c' } },
        metadata: { src: 'zapier' },
        idempotency_key: 'k1',
      })
      .reply(201, { id: 'new-id' });
    const result = await appTester(App.creates.start_instance.operation.perform, {
      authData,
      inputData: {
        sequence_id: 'seq-1',
        input: '{"email":"a@b.c"}',
        metadata: '{"src":"zapier"}',
        idempotency_key: 'k1',
      },
    });
    expect(result).toEqual({ id: 'new-id', deduplicated: false, sequence_id: 'seq-1' });
  });

  it('start_instance reports deduplication', async () => {
    nock(BASE).post('/api/v1/instances').reply(200, { id: 'old', deduplicated: true });
    const result = await appTester(App.creates.start_instance.operation.perform, {
      authData,
      inputData: { sequence_id: 'seq-1', idempotency_key: 'k1' },
    });
    expect(result.deduplicated).toBe(true);
  });

  it('start_instance rejects invalid JSON input', async () => {
    await expect(
      appTester(App.creates.start_instance.operation.perform, {
        authData,
        inputData: { sequence_id: 'seq-1', input: '{nope' },
      }),
    ).rejects.toThrow(/must be valid JSON/);
  });

  it('send_signal sends builtin signals as plain strings', async () => {
    nock(BASE, { reqheaders })
      .post('/api/v1/instances/i-1/signals', { signal_type: 'cancel' })
      .reply(201, { signal_id: 'sig-1' });
    const result = await appTester(App.creates.send_signal.operation.perform, {
      authData,
      inputData: { instance_id: 'i-1', signal_type: 'cancel' },
    });
    expect(result).toEqual({ signal_id: 'sig-1', instance_id: 'i-1' });
  });

  it('send_signal wraps custom signals (approval resolution)', async () => {
    nock(BASE)
      .post('/api/v1/instances/i-1/signals', {
        signal_type: { custom: 'human_input:review' },
        payload: { value: 'approve' },
      })
      .reply(201, { signal_id: 'sig-2' });
    const result = await appTester(App.creates.send_signal.operation.perform, {
      authData,
      inputData: {
        instance_id: 'i-1',
        signal_type: 'custom',
        custom_signal: 'custom:human_input:review',
        payload: '{"value":"approve"}',
      },
    });
    expect(result.signal_id).toBe('sig-2');
  });

  it('send_signal surfaces engine errors', async () => {
    nock(BASE)
      .post('/api/v1/instances/i-1/signals')
      .reply(400, { error: 'target is in a terminal state' });
    await expect(
      appTester(App.creates.send_signal.operation.perform, {
        authData,
        inputData: { instance_id: 'i-1', signal_type: 'resume' },
      }),
    ).rejects.toThrow(/terminal state/);
  });

  it('enqueue_job posts to the jobs API', async () => {
    const job = {
      id: 'j1',
      instance_id: 'i9',
      handler: 'send_email',
      status: 'scheduled',
      created_at: '2026-09-01T00:00:00Z',
      run_at: '2026-09-01T00:00:05Z',
    };
    nock(BASE, { reqheaders })
      .post('/api/v1/jobs', {
        handler: 'send_email',
        payload: { to: 'x@y.z' },
        queue: 'emails',
        delay_ms: 5000,
        idempotency_key: 'j-k',
      })
      .reply(201, job);
    const result = await appTester(App.creates.enqueue_job.operation.perform, {
      authData,
      inputData: {
        handler: 'send_email',
        payload: '{"to":"x@y.z"}',
        queue: 'emails',
        delay_ms: '5000',
        idempotency_key: 'j-k',
      },
    });
    expect(result).toEqual(job);
  });

  it('enqueue_job explains a missing jobs API on 404', async () => {
    nock(BASE).post('/api/v1/jobs').reply(404, 'Not Found');
    await expect(
      appTester(App.creates.enqueue_job.operation.perform, {
        authData,
        inputData: { handler: 'h' },
      }),
    ).rejects.toThrow(/does not expose POST \/api\/v1\/jobs/);
  });
});

describe('searches', () => {
  it('find_instance by id returns the instance', async () => {
    nock(BASE, { reqheaders })
      .get('/api/v1/instances/i-1')
      .reply(200, inst('i-1', 'running', '2026-09-01T00:00:00Z'));
    const results = await appTester(App.searches.find_instance.operation.perform, {
      authData,
      inputData: { instance_id: 'i-1' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('i-1');
  });

  it('find_instance by id returns [] on 404', async () => {
    nock(BASE).get('/api/v1/instances/missing').reply(404, { error: 'not found' });
    const results = await appTester(App.searches.find_instance.operation.perform, {
      authData,
      inputData: { instance_id: 'missing' },
    });
    expect(results).toEqual([]);
  });

  it('find_instance by metadata uses metadata.<key> filters', async () => {
    nock(BASE)
      .get('/api/v1/instances')
      .query({ limit: 10, 'metadata.order_id': '42', state: 'completed' })
      .reply(200, { items: [inst('m', 'completed', '2026-09-01T00:00:00Z')], has_more: false });
    const results = await appTester(App.searches.find_instance.operation.perform, {
      authData,
      inputData: { metadata_key: 'order_id', metadata_value: '42', state: 'completed' },
    });
    expect(results[0].id).toBe('m');
  });

  it('find_instance requires an id or metadata key', async () => {
    await expect(
      appTester(App.searches.find_instance.operation.perform, { authData, inputData: {} }),
    ).rejects.toThrow(/Provide an Instance ID/);
  });
});
