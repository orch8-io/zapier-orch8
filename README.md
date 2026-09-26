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

## Install (private app, works today)

The app is not listed in Zapier's public directory. The account owner can deploy it as a **private integration** in a few minutes:

```bash
git clone --branch v0.1.0 https://github.com/orch8-io/zapier-orch8.git && cd zapier-orch8
npm ci
npx zapier-platform login              # your Zapier account
npx zapier-platform register "Orch8"   # once; writes .zapierapprc (gitignored)
npx zapier-platform push               # uploads version 0.1.0 as a private integration
```

Then open the Zapier editor, search for **Orch8** (it shows under your private apps), and connect it with your engine URL, API key and tenant ID.
To let teammates use it: `npx zapier-platform users:add <email> 0.1.0`, or print a shareable invite link with `npx zapier-platform users:links`.

Each [GitHub Release](https://github.com/orch8-io/zapier-orch8/releases) also carries the exact `build.zip` / `source.zip` that `zapier-platform build` produced for that tag.

## CI and releases

- `.github/workflows/ci.yml` runs `npm test`, `zapier-platform validate --without-style` and `zapier-platform build` on every push and PR to `main` (none of these need a Zapier login).
- Pushing a tag `vX.Y.Z` (must equal `version` in `package.json`) runs `.github/workflows/release.yml`: tests, validate, build, and a GitHub Release with the two zips.
- The same workflow runs `zapier-platform push` **only if** both are set on the repository:
  - secret `ZAPIER_DEPLOY_KEY`: a deploy key from https://developer.zapier.com/partner-settings/deploy-keys/ (account that owns the app);
  - variable `ZAPIER_APP_ID`: the numeric `id` that `zapier-platform register` wrote into `.zapierapprc`.

## Public listing (manual, not done yet)

1. After `register` + `push` above, run `npx zapier-platform validate` (includes the style checks that need a login) and fix any findings.
2. Add the app's branding (logo, description, homepage) at developer.zapier.com.
3. Test privately and invite testers with `npx zapier-platform users:add <email> 0.1.0`.
4. `npx zapier-platform promote 0.1.0`, then developer.zapier.com → your app → **Publishing** → submit for review. Zapier requires live Zaps from test users and a reachable engine plus API key for the reviewer.
5. Later versions: bump `version`, tag, push (CI pushes if the deploy key is set), then `promote`, and `npx zapier-platform migrate <old> <new>` to move existing users.
