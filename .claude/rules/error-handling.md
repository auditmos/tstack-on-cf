# Error Handling

## Layered Approach

| Layer | Pattern | Location |
|-------|---------|----------|
| DB | Drizzle wraps pg errors in `DrizzleQueryError` | `src/db/` |
| API | Return `Result<T>` or throw `AppError` | `src/hono/api/` |
| Frontend | Catch `AppError` in mutations/server fns | `src/routes/`, `src/components/` |

## Error Infrastructure

`AppError` and `Result<T>` live in `src/core/errors.ts`. Use `AppError` for known, recoverable errors. Let unexpected errors propagate to global handler.

## Drizzle Error Unwrapping

`error.cause` holds original Postgres error, NOT `error.message`.
`error.message` = `"Failed query: <SQL>\nparams: <values>"` — never contains constraint info.
Check `error.cause.code` for pg codes (e.g. `23505` = unique violation).

```ts
import { isUniqueViolation } from '@/core/errors'

try {
  return await createClient(data)
} catch (error) {
  if (isUniqueViolation(error)) {
    return c.json({ error: 'Email already exists' }, 409)
  }
  throw error
}
```

## Result Pattern (API)

Services/handlers can return `Result<T>` — never throw `HTTPException`.
`AppError` shape: `code`, `message`, `status`, optional `field`.
Unexpected errors propagate to global `onError`.

## Response Consistency

```ts
// Success
return c.json({ data: entity })
return c.json({ data: entities, meta: { total, page } })

// Error
return c.json({ error: 'Not found' }, 404)
return c.json({ error: 'Validation failed', details: errors }, 400)
```
