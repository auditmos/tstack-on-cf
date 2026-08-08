# Decision: keep the fetch-based Neon driver, not Hyperdrive

**Status:** accepted · **Applies to:** `src/db/setup.ts`, `wrangler.jsonc`

## Decision

Database access goes through `@neondatabase/serverless` over HTTP, wired to
Drizzle as `neon-http`. Hyperdrive — Cloudflare's connection pooling and query
caching product for external Postgres — is deliberately not configured.

## Why

Hyperdrive is the platform's standard answer for talking to a Postgres database
that lives outside Cloudflare, and on the merits it is the better mechanism:
pooled connections, no per-query TCP handshake, optional query caching.

For a template, that is not the deciding axis. Hyperdrive is a resource a cloner
must provision, name, and bind *before the repository runs at all*. Every such
prerequisite is a step between `git clone` and a working development server, and
a step at that position is where people stop. The fetch-based driver needs
nothing beyond the database itself — the same three secrets that would be
required anyway.

So the trade is one round trip per query against one fewer thing to provision.
For the demo surface this template ships — a handful of queries, one per
request — the round trip is not what a cloner will notice. The provisioning step
is.

The driver sits behind `initDatabase()` / `getDb()` in `src/db/setup.ts`, and
nothing outside that module knows which driver it got. That is the point: this
decision is reversible in one file, so making the low-prerequisite choice first
costs a cloner nothing later.

## Decide differently when

Switch to Hyperdrive when any of these describe your project rather than this
template:

- **A request makes several sequential queries.** HTTP round trips compound; a
  pooled connection amortises them. This is the most common reason to switch.
- **You need interactive transactions, session state, `LISTEN`/`NOTIFY`, or
  anything else that needs a real Postgres connection.** The HTTP driver issues
  one statement at a time and cannot hold a session open.
- **Your Postgres is not Neon.** The fetch driver is Neon-specific. Any other
  provider means Hyperdrive with a TCP driver.
- **Connection count is your bottleneck**, or you want Hyperdrive's query
  caching for read-heavy endpoints.

## How to switch

1. Create a Hyperdrive configuration pointing at your connection string, and add
   the binding to `wrangler.jsonc` — in the top-level block *and* in each `env`
   block, the same way `secrets` has to be repeated.
2. Replace `drizzle-orm/neon-http` with `drizzle-orm/node-postgres` in
   `src/db/setup.ts`, constructing the client from
   `env.HYPERDRIVE.connectionString`.
3. Leave `initDatabase()` and `getDb()` exactly as they are. Every call site
   keeps working; that is what the module boundary is for.
4. Run `pnpm cf-typegen` so `Env` picks up the new binding.

Migrations are unaffected — the `db:*` scripts talk to Postgres directly from
your machine, not through the Worker.
