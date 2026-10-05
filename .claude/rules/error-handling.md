# Error Handling

## Layered Approach

| Layer | Pattern | Location |
|-------|---------|----------|
| DB | Drizzle wraps pg errors in `DrizzleQueryError` | `src/db/` |
| API | Return `Result<T>` or throw `AppError` | `src/hono/api/` |
| Frontend | Fetch helpers throw `ApiError` via `toApiError`; branch on its `status`, `code`, `field` | `src/routes/`, `src/components/` |

## Error Classes

Every error class lives in `src/core/errors.ts`. A bare `Error` gives callers, tests and logs no type to branch on, so `src/error-classes.test.ts` fails the build on `throw new Error(` anywhere in `src/` outside tests.

| Class | Throw it for | What happens |
|-------|--------------|--------------|
| `AppError` | A known failure the API maps to a response | `apiHono.onError` sends `{ error, code, field? }` with its status — the message reaches the client |
| `ApiError` | A failed fetch on the client, built with `toApiError(res, fallback)` | Keeps the API's status, code and field; falls back to `fallback` when the body is not JSON |
| `InvariantError` | A state that means the code is wrong (wiring mistake, broken contract) | Not an `AppError`, so it becomes a logged generic 500 and its message never reaches the client |

Add a new class only when none of these fits. Return `Result<T>` when the caller has to branch on failure without a try/catch. Let unexpected errors propagate to the global handler.

## Drizzle Error Unwrapping

`error.cause` holds original Postgres error, NOT `error.message`.
`error.message` = `"Failed query: <SQL>\nparams: <values>"` — never contains constraint info.
Check `error.cause.code` for pg codes (e.g. `23505` = unique violation).

```ts
import { AppError, isUniqueViolation } from '@/core/errors'

try {
  return c.json(await createClient(data), 201)
} catch (error) {
  if (isUniqueViolation(error)) {
    throw new AppError('Email already exists', 'CONFLICT', 409, 'email')
  }
  throw error
}
```

## Result Pattern (API)

Services/handlers can return `Result<T>` — never throw `HTTPException`.
`AppError` shape: `code`, `message`, `status`, optional `field`.
Unexpected errors propagate to global `onError`.

## Error Responses

Throw, and let `apiHono.onError` render `{ error, code, field? }`. Never put Zod's `error.message` in a response — it is a JSON dump of every issue. `parseRequest` and `parseJsonBody` (`src/hono/validation.ts`) throw a `VALIDATION` error with the first issue's message and field instead.

```ts
throw new AppError('Client not found', 'NOT_FOUND', 404)
const data = await parseJsonBody(ClientCreateRequestSchema, c.req)
```

Success shapes are in `api/hono.md`.
