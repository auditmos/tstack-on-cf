---
paths:
  - "src/server.ts"
  - "src/hono/**/*.ts"
---

# Cloudflare Workers Rules

## Worker Entry

- ES module syntax with default export
- Initialize resources (DB) in fetch handler
- Route `/api/*` → Hono, rest → TanStack Start

```ts
// src/server.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    initDatabase({ host: env.DATABASE_HOST, ... })
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api')) {
      return honoApp.fetch(request, env)
    }
    return tanstackHandler(request)
  }
}
```

## Env Bindings

- Run `pnpm cf-typegen` to generate types from wrangler.jsonc
- Generates `Env` interface in `worker-configuration.d.ts`
- Access via `c.env` (Hono) — never `process.env`

## Secrets Management

- Never hardcode secrets
- Use `.dev.vars` for local dev (gitignored)
- Use Cloudflare dashboard for remote secrets
- Access same as env vars: `env.SECRET_NAME`

## Request Handling

- Workers are stateless — no global mutable state
- Use `waitUntil()` for async work after response
- Respect CPU time limits (50ms free, 30s paid)

```ts
ctx.waitUntil(logAnalytics(request)) // non-blocking
return response
```

## Deployment

- Deploy via `pnpm deploy`
- Configure environments in `wrangler.jsonc`
