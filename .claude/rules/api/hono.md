---
paths:
  - "src/hono/**/*.ts"
---

# Hono Framework Rules

## App Setup

- Type bindings via `Hono<{ Bindings: Env }>`
- Access env via `c.env`, not `process.env`
- Export `app.fetch` for Workers

```ts
import { Hono } from 'hono'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

export default {
  fetch: app.fetch,
}
```

## Middleware Chain

Apply in order: requestId → errorHandler → cors → auth → rateLimiter → validator

```ts
app.use('*', requestId())
app.use('*', errorHandler())
app.use('*', cors())
app.use('/api/*', authMiddleware())
app.use('/api/*', rateLimiter())
```

## Route Structure

- Handlers: thin wrappers, call query functions from `@/db/{domain}`
- Keep handlers focused on HTTP concerns (validation, status codes, response shape)

## Request Validation

Preferred: use `zValidator` from `@hono/zod-validator` with named schemas from `@/db/{domain}`.
If `@hono/zod-validator` is not yet installed, use `safeParse` from `@/db/{domain}` schemas — never inline `z.object()`.

```ts
// Best — zValidator (when available)
import { zValidator } from '@hono/zod-validator'
import { ClientCreateSchema, ClientIdParamSchema } from '@/db/client'

app.post('/clients',
  zValidator('json', ClientCreateSchema),
  async (c) => {
    const data = c.req.valid('json') // typed!
  }
)

// Acceptable — safeParse with named schema
import { clientCreateSchema } from '@/db/client'

const result = clientCreateSchema.safeParse(await c.req.json())
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
