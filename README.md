# Orch8 for Zapier

Zapier Platform CLI app (`zapier-platform-core` 19.x) for [Orch8](https://orch8.io), the self-hosted durable workflow engine.

## Authentication

Custom auth with three fields:

| Field | Sent as |
|---|---|
| Engine Base URL | prefix for every request. The app calls `<base>/api/v1/...` |
| API Key | `x-api-key` header |
| Tenant ID | `x-tenant-id` header (the start action also uses it as `tenant_id` in the body) |

The connection test calls `GET /api/v1/sequences?limit=1`.

## Triggers, actions and searches

| Kind | Key | Engine endpoint |
|---|---|---|
| Trigger (polling) | `instance_completed` | `GET /api/v1/instances?state=completed&limit=100[&sequence_id][&namespace]` |
| Trigger (polling) | `instance_failed` | `GET /api/v1/instances?state=failed&limit=100[...]` |
| Trigger (hidden, dropdown) | `sequence_list` | `GET /api/v1/sequences?limit&offset` |
| Create | `start_instance` | `POST /api/v1/instances` |
| Create | `send_signal` | `POST /api/v1/instances/{id}/signals` |
| Create | `enqueue_job` | `POST /api/v1/jobs` (**needs an engine release with the Jobs API**) |
| Search | `find_instance` | `GET /api/v1/instances/{id}`, or `GET /api/v1/instances?metadata.<key>=<value>` |
| Search-or-create | `find_instance` | the search above, then `start_instance` |

### Why the triggers poll instead of using REST hooks

Orch8's outbound webhooks (`instance.completed`, `instance.failed`) are set in server config (`[engine.webhooks] urls` / `ORCH8_WEBHOOK_URLS`). The engine has no API to subscribe or unsubscribe, which Zapier's REST hooks need. The triggers poll instead, and Zapier dedupes on the instance `id`. `GET /instances` returns up to 100 rows per poll. On a high-volume tenant, filter the trigger by sequence or namespace so no terminal instances fall outside the page between polls.

If the engine later adds webhook subscribe and unsubscribe endpoints, switch these to `type: 'hook'` with `performSubscribe`/`performUnsubscribe`.

### Signals and approvals

Built-in signals (`pause`, `resume`, `cancel`, `update_context`) go on the wire as strings. Choose **custom** to send any other signal, which goes out as `{"custom": "<name>"}`. To answer a human-review gate, use `human_input:<block_id>` with the payload `{"value": "<choice>"}`. An `approver`-capability key may only send `human_input:*` signals.

## Development

```bash
npm install
npm test              # jest + nock with zapier.createAppTester; no network needed
npm run validate      # local schema validation (zapier-platform validate --without-style)
```

## Submitting to Zapier (manual, not done by this repo)

Every step below runs under the maintainer's Zapier account. None of them has been run.

1. `npx zapier-platform login` (or `npm i -g zapier-platform-cli && zapier login`)
2. `npx zapier-platform register "Orch8"`. This creates the app and writes `.zapierapprc` (gitignored; see `.zapierapprc.example`).
3. `npx zapier-platform validate`. This includes the style checks that need a login.
4. `npx zapier-platform push`. This uploads version `0.1.0` as a private integration.
5. Test it privately in the Zapier editor. Invite testers with `npx zapier-platform users:add <email> 0.1.0`.
6. Add the app's branding (logo, description, homepage) in the Zapier developer platform UI at developer.zapier.com.
7. Once it's ready, `npx zapier-platform promote 0.1.0`, then request public listing: developer.zapier.com → your app → **Publishing** → submit for review. Zapier requires live Zaps from test users and a passing validation before approval.
8. To release a later version: bump `version` in `package.json`, then `push`, then `promote`. Use `npx zapier-platform migrate <old> <new>` to move existing users.
