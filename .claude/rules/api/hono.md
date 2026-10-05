---
paths:
  - "src/hono/**/*.ts"
---

# Hono Framework Rules

## App Setup

- Build every endpoint with `createHono(...middleware)` from `src/hono/factory.ts` — it types bindings as `Env`
- Mount endpoints on `apiHono` in `src/hono/api.ts`; `src/server.ts` calls `apiHono.fetch`
- Access env via `c.env`, not `process.env`

## Middleware

Middleware passed to `createHono()` runs on `*` before the endpoint's handlers. That is the one place to attach auth: an endpoint is only as protected as the factory call that built it. The template ships no middleware — see the README's "Security posture" section before deploying.

## Route Structure

- Handlers: thin wrappers, call query functions from `@/db/{domain}`
- Keep handlers focused on HTTP concerns (validation, status codes, response shape)

## Request Validation

Validate with `parseRequest` and `parseJsonBody` from `src/hono/validation.ts`, against named schemas from `@/db/{domain}` — never inline `z.object()`. Both throw a `VALIDATION` `AppError` carrying the first failing issue's message and its field, so the client can show it under that field.

```ts
import { ClientCreateRequestSchema, IdParamSchema } from '@/db/client'
import { parseJsonBody, parseRequest } from '@/hono/validation'

const { id } = parseRequest(IdParamSchema, { id: c.req.param('id') })
const data = await parseJsonBody(ClientCreateRequestSchema, c.req)
```

Read a JSON body only through `parseJsonBody`: `c.req.json()` throws a bare `SyntaxError` on malformed input, which the global handler turns into a 500. `src/hono/request-bodies.test.ts` enforces this. Not `zValidator`: its default hook answers with its own error shape, not `{ error, code, field? }`.

## Error Handling

- Throw `AppError` from `@/core/errors` for known failures; which class when is in `error-handling.md`
- Use `isUniqueViolation` for constraint conflicts
- `apiHono.onError` in `src/hono/api.ts` is the one renderer: an `AppError` becomes `{ error, code, field? }` with its status, and anything else is logged and becomes a generic 500. Throw from a handler rather than returning error JSON

## Response Patterns

```ts
return c.json({ data: client })              // one entity; add 201 on create
return c.json({ data: rows, pagination })    // a list — pagination is { total, limit, offset, hasMore }
return c.body(null, 204)                     // a delete
throw new AppError('Client not found', 'NOT_FOUND', 404)
```

The health endpoints are exempt: their bodies are shaped for probes.
