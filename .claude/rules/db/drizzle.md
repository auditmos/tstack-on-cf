---
paths:
  - "src/db/**/*.ts"
---

# Drizzle ORM Rules

## Schema Definition

- Use `pgTable()` with explicit column types
- Define tables in `{domain}/table.ts`
- Define relations in separate `drizzle/relations.ts`
- Never edit auto-generated files

```ts
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

## Type Inference

- Use `InferSelectModel<typeof table>` for select types
- Use `InferInsertModel<typeof table>` for insert types
- Export types alongside tables

```ts
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
```

## Query Patterns

- Use SQL-like API for complex queries with joins
- Use relational API (`db.query.*`) for nested data
- Always use `eq()`, `and()`, `or()` helpers
- Drizzle outputs exactly 1 SQL query—leverage for serverless

```ts
// SQL-like
const result = await db.select().from(users)
  .leftJoin(posts, eq(posts.authorId, users.id))
  .where(eq(users.id, userId))

// Relational
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: { posts: true }
})
```

## Migrations

- Never manually edit generated migration files
- Run `pnpm db:generate` then `pnpm db:migrate:dev` (or `:staging` / `:production`)
- Test migrations on dev/staging before production

## Domain Module Pattern

Place queries in `{domain}/queries.ts`, export from `{domain}/index.ts`:

```
src/db/{domain}/
├── table.ts      # pgTable definition
├── schema.ts     # Zod validation schemas
├── queries.ts    # All DB operations
└── index.ts      # Public API (re-exports)
```

## Query Layer

- All queries call `getDb()` — never accept DB as parameter
- Return typed results
- Use `.returning()` on mutations to avoid extra round trips
