# Release & rollback runbook

**Status:** accepted · **Applies to:** `package.json` deploy scripts, `wrangler.jsonc`

Releasing this Worker is a manual procedure. This document is the procedure —
follow it top to bottom for the environment you are releasing, and do not
reconstruct it from memory at the moment you need it most.

Every command here was run against Wrangler 4.118 in this repository. Where a
command behaves differently from what its name suggests, that is written down
rather than left to be discovered.

## Why deployment is manual

A continuous deployment pipeline was considered and deliberately rejected for
this template.

A pipeline encodes an account identifier, a set of secret names, a branch
convention, and a mapping from branch to environment. A cloner shares none of
those. Worse, nothing in this repository can exercise a deploy — there is no
account attached to it — so a pipeline would ship untested, and be inherited as
though it worked. The failure would surface on someone else's first release.

The gap that leaves is real. It is a documentation gap, and this document closes
it. What compensates for the missing automation is:

- **CI on every pull request and every push to `main`** — `pnpm lint:ci`,
  `pnpm types`, `pnpm test`, `pnpm knip` and `pnpm build`. Nothing below is a
  substitute for a green pipeline; check it before you start.
- **The deploy-time secret check** described under
  [Once per environment: secrets](#once-per-environment-secrets). It is the one
  automated gate that stands between a release and a Worker that deploys
  successfully and then fails every request.

## Why the migration gate is deliberate

Applying migrations is a manual step, and it stays manual.

A migration is the only part of a release that a redeploy cannot undo.
`wrangler rollback` restores the previous code and bindings; it does not restore
the previous schema. Automating "generate, apply, deploy" behind one trigger
would put an irreversible schema change on the same footing as a reversible code
change, with no human between them.

So the gate is: apply the migration, confirm it applied, then deploy the code
that depends on it.

**Ordering rule.** Additive migrations — a new table, a new nullable column —
run *before* the deploy that uses them. Destructive migrations — dropping a
column, tightening a constraint — run *after* the deploy that stopped using
them, as a second release. A destructive migration and the code change that
needs it never ship together; that pairing is what makes a rollback impossible.

If you cannot split the change that way, deploy code that tolerates both
schemas, migrate, then remove the tolerance in a third release.

## Once per environment: secrets

`wrangler.jsonc` is the source of truth for which secrets the Worker requires:

```jsonc
"secrets": {
  "required": ["DATABASE_HOST", "DATABASE_USERNAME", "DATABASE_PASSWORD"]
}
```

This block is **not inherited** by environment blocks — `env.staging` and
`env.production` each repeat it, and `src/secrets-contract.test.ts` fails the
build if they drift apart.

Push the values to Cloudflare once per environment:

```bash
wrangler secret put DATABASE_HOST     --env staging
wrangler secret put DATABASE_USERNAME --env staging
wrangler secret put DATABASE_PASSWORD --env staging
```

**`wrangler deploy` refuses to ship when a declared secret was never set on the
Worker, and names the ones that are missing.** That check is the safety net this
runbook leans on hardest: without it, a forgotten secret produces a deploy that
reports success and a Worker that returns 500 on every request that touches the
database. With it, the release stops before it starts.

Separately, create `.staging.vars` and `.production.vars` locally with the same
keys. Those are read by `dotenvx` for the `db:*` scripts — migrations run from
your machine against the database directly, not through the Worker. They are
gitignored; see `.dev.vars.example` for the shape.

## The sequence

Every environment follows the same four steps in the same order. Nothing here
is optional, and step 4 is not "it deployed without an error".

1. **Migrate** — apply pending schema changes and confirm they landed.
2. **Build** — produce an environment-scoped bundle, which bakes that
   environment's name, vars and routing into the build output.
3. **Deploy** — upload the built bundle.
4. **Verify** — prove the running Worker is the build you just made.

### dev

```bash
pnpm db:generate:dev          # only after changing a table definition
pnpm db:migrate:dev
pnpm run build                # optional: inspect the bundle before shipping
pnpm run deploy               # builds, then deploys
```

Then verify:

```bash
curl -sS https://tanstack-start-app.<your-subdomain>.workers.dev/api/health/ready
```

> **`pnpm run deploy`, not `pnpm deploy`.** `deploy` is one of pnpm's own
> commands — it deploys a workspace package to a directory — and pnpm's command
> wins over the script of the same name. `pnpm deploy` will not release
> anything. The `:staging` and `:production` variants have no such collision,
> but `pnpm run` in front of them costs nothing and reads consistently.

### staging

```bash
pnpm db:generate:staging      # only after changing a table definition
pnpm db:migrate:staging
pnpm run build:staging
pnpm run deploy:staging
```

Then verify:

```bash
curl -sS https://tanstack-start-app-staging.<your-subdomain>.workers.dev/api/health/ready
```

Staging keeps `workers_dev` and `preview_urls` enabled precisely so a change can
be looked at here before it is promoted.

### production

```bash
pnpm db:generate:production   # only after changing a table definition
pnpm db:migrate:production
pnpm run build:production
pnpm run deploy:production
```

Then verify against your custom domain.

Production ships with `workers_dev: false` and `preview_urls: false`, so **it is
not reachable until you configure a custom domain** in the `env.production`
block of `wrangler.jsonc`. A production deploy that appears to have nowhere to
answer has not failed — it is waiting for that decision. Prefer
`custom_domain: true` over a `routes` pattern with `zone_name`; see
`.claude/rules/cloudflare-deployment.md`.

## Verifying a release

`/api/health/ready` is the check that answers all four questions at once:

```bash
curl -sS https://<host>/api/health/ready
```

```json
{
  "status": "ok",
  "env": "staging",
  "service": "tstack-on-cf",
  "time": "2026-08-08T05:00:00.000Z",
  "database": "connected"
}
```

- `env` is the build's own idea of which environment it is. If it disagrees with
  the host you called, you deployed the wrong bundle — the most likely cause is
  a `deploy:*` run without its matching `build:*`.
- `database` proves the secrets reached the Worker and the connection works. A
  `degraded` status with `disconnected` returns HTTP 503 and means the Worker is
  running but its credentials or database are not.
- `time` moving between calls proves you are not reading a cached response.

Then confirm what Cloudflare thinks is live, and watch real traffic:

```bash
wrangler deployments status --env staging
wrangler tail --env staging
```

Leave `wrangler tail` running through the first minutes of production traffic.
Structured error logs from the Hono error handler and the database health check
surface there.

## Rolling back

Rollback replaces the active version with a previous one. It is the fastest
recovery available and it needs no build.

```bash
wrangler deployments list --env production
wrangler rollback <version-id> --env production --message "why you are rolling back"
```

Omit the version id to roll back to the immediately previous version. The
`--message` is not decoration: `wrangler deployments list` shows it, and it is
what tells the next person whether this version is broken or merely superseded.

Three limits, all of which matter more at 02:00 than they do now:

- **It does not undo a migration.** Code goes back; schema does not. If the bad
  release included a destructive migration, rollback restores code that expects
  columns the database no longer has. This is why the ordering rule above
  exists.
- **It does not restore secrets.** Secrets are not part of a version. A rollback
  after a secret rotation still uses the current secret values.
- **It rolls back one Worker.** Environments are separate Workers with separate
  version histories, so a rollback in production leaves staging as it was.

## Shipping to a fraction of traffic first

For a change you want real traffic to exercise before it owns all of it, upload
the version without releasing it, then split traffic between it and the version
already live.

```bash
pnpm run build:production
wrangler versions upload --env=''                    # uploads; releases nothing
wrangler versions list --env production              # note the new version id
wrangler versions deploy <new-id>@10 <current-id>@90 --env production
```

Watch `/api/health/ready` and `wrangler tail --env production`, then either
complete the rollout or abandon it:

```bash
wrangler versions deploy <new-id>@100 --env production      # complete
wrangler versions deploy <current-id>@100 --env production  # abandon
```

Abandoning is preferable to `wrangler rollback` here: you are naming the version
you want live rather than stepping backwards through history.

Gradual rollout splits traffic per request, not per user. A request that lands
on the new version and a follow-up that lands on the old one are both possible,
so the two versions must be able to coexist against one schema — the same
constraint the migration ordering rule imposes.

## Which configuration each command reads

This is the one non-obvious thing about releasing here, and getting it wrong
points a command at the wrong Worker.

`vite build --mode <env>` resolves the `env.<name>` block from `wrangler.jsonc`
and writes a flattened config to `dist/server/wrangler.json` — worker name, vars
and routing already applied, with **no environment blocks left in it**. It also
writes `.wrangler/deploy/config.json`, a pointer that redirects the
code-uploading commands to that flattened file. Hence `--env=''`: the
environment is already baked in, and there is no named env left to select.

The commands that do not upload code never see that redirect. They resolve the
Worker's name from `wrangler.jsonc` as usual, and take a real `--env`.

| Command | Reads | Env flag |
| ------- | ----- | -------- |
| `wrangler deploy` | `dist/server/wrangler.json` (redirected) | `--env=''` |
| `wrangler versions upload` | `dist/server/wrangler.json` (redirected) | `--env=''` |
| `wrangler versions deploy` | `wrangler.jsonc` | `--env staging` |
| `wrangler versions list` | `wrangler.jsonc` | `--env staging` |
| `wrangler rollback` | `wrangler.jsonc` | `--env staging` |
| `wrangler deployments list` / `status` | `wrangler.jsonc` | `--env staging` |
| `wrangler secret put` / `list` | `wrangler.jsonc` | `--env staging` |
| `wrangler tail` | `wrangler.jsonc` | `--env staging` |

The failure this prevents is quiet rather than loud: after a build,
`wrangler deploy --env staging` does **not** error. It follows the redirect,
ignores the flag, and ships whichever environment the last build baked in. Match
each `deploy:*` script to its own `build:*` and the question never arises —
which is why the scripts pair them.
