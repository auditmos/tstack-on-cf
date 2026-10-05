---
paths:
  - "src/server.ts"
  - "src/hono/**/*.ts"
---

# Cloudflare Workers Rules

## Worker Entry

- ES module syntax with default export
- Initialize resources (DB) in fetch handler
- Route `/api/*` → Hono, rest → TanStack Start — `isApiRequest()` in `src/server.ts` decides, and matches `/api` and `/api/…` only (not `/apiary`)

## Env Bindings

- Run `pnpm cf-typegen` to generate types from wrangler.jsonc
- Generates `Env` interface in `worker-configuration.d.ts`
- Access via `c.env` (Hono) — never `process.env`

## Secrets Management

- Never hardcode secrets
- Use `.dev.vars` for local dev (gitignored)
- Remote secrets are set per wrangler env — follow `docs/release-runbook.md`
- Access same as env vars: `env.SECRET_NAME`

## Request Handling

- Workers are stateless — no global mutable state
- Use `waitUntil()` for async work after response
- Respect CPU time limits (Free: 10 ms; Paid: 30 s default, up to 5 min via `limits.cpu_ms`)

```ts
ctx.waitUntil(logAnalytics(request)) // non-blocking
return response
```
