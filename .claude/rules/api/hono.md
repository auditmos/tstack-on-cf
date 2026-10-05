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

Preferred: use `zValidator` from `@hono/zod-validator` with named schemas from `@/db/{domain}`.
If `@hono/zod-validator` is not yet installed, use `safeParse` from `@/db/{domain}` schemas — never inline `z.object()`.

```ts
// Best — zValidator (when available)
import { zValidator } from '@hono/zod-validator'
import { ClientCreateRequestSchema, IdParamSchema } from '@/db/client'

app.post('/clients',
  zValidator('json', ClientCreateRequestSchema),
  async (c) => {
    const data = c.req.valid('json') // typed!
  }
)

// Acceptable — safeParse with named schema
import { ClientCreateRequestSchema } from '@/db/client'

const result = ClientCreateRequestSchema.safeParse(await c.req.json())
if (!result.success) return c.json({ error: 'Validation failed' }, 400)
```

## Error Handling

- Use `AppError` from `@/core/errors` for known errors
- Use `isUniqueViolation` for constraint conflicts
- Centralize via error middleware
- Return consistent error shapes

```ts
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: 'Internal error' }, 500)
})
```

## Response Patterns

```ts
// Success
return c.json({ data: entity })
return c.json({ data: entities, meta: { total, page } })

// Error
return c.json({ error: 'Not found' }, 404)
return c.json({ error: 'Validation failed', details: errors }, 400)
```
