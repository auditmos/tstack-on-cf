---
paths:
  - "src/db/**/*.ts"
---

# Zod Rules

## Schema Definition

- Define schemas in `{domain}/schema.ts`
- Derive types with `z.infer<typeof Schema>`
- Use descriptive schema names ending in `Schema`

```ts
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

export type User = z.infer<typeof userSchema>
```

## Validation Patterns

- Use `safeParse()` for error handling, not `parse()`
- Return structured results, don't throw

```ts
const result = userSchema.safeParse(input)
if (!result.success) {
  return { ok: false, errors: result.error.flatten() }
}
return { ok: true, data: result.data }
```

## Schema Composition

- Use `.extend()` to add fields
- Use `.pick()` / `.omit()` for partial schemas
- Use `.merge()` to combine schemas
- Use `.partial()` for optional fields

```ts
const createUserSchema = userSchema.omit({ id: true })
const updateUserSchema = userSchema.partial().required({ id: true })
```

## When Zod vs When Interface

| Boundary | Use | Why |
|----------|-----|-----|
| External API responses | Zod schema + `z.infer` | Runtime data is untrusted — `safeParse` catches shape mismatches |
| Internal module types (no I/O) | `interface` / `type` | No runtime data to validate, TS compiler is enough |
| Request input (forms, params) | Zod schema + `z.infer` | User input is untrusted |

- Derive types from schemas (`z.infer`), never duplicate as separate interfaces

## Serialization Boundary (TanStack Start)

Zod types that cross server→client boundary via `createServerFn` get JSON-serialized.

- **Never** use `z.unknown()` in schemas consumed by server functions
- Use `z.json()` for arbitrary JSON blobs (produces `JsonValue` — fully serializable)
- Use `z.string().datetime()` or `z.coerce.date()` for dates (JSON serializes `Date` as ISO string)

## Integration with Drizzle

- Create separate Zod schemas for validation (don't derive from Drizzle)
- Use Zod for input validation, Drizzle types for DB operations
- Keep schemas in sync manually or via codegen
