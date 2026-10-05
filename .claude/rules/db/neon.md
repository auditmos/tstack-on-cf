---
paths:
  - "src/db/**/*.ts"
---

# Neon Database Rules

## Connection Setup

- Singleton pattern: `initDatabase()` once in Worker entry, `getDb()` everywhere else
- Connection string built internally from host/username/password
- `@neondatabase/serverless` over HTTP, passed explicitly to the `drizzle-orm/neon-http` adapter (why not Hyperdrive: `docs/decisions/database-driver.md`)

```ts
// src/db/setup.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

let db: ReturnType<typeof drizzle>

export function initDatabase(connection: {
  host: string
  username: string
  password: string
}) {
  if (db) return db
  const connectionString = `postgres://${connection.username}:${connection.password}@${connection.host}`
  db = drizzle(neon(connectionString))
  return db
}

export function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}
```

## Initialization

- Call `initDatabase()` in `src/server.ts` fetch handler
- DB env vars come from `.dev.vars` locally; remote values are set per wrangler env (`docs/release-runbook.md`)

## Environment Variables

```bash
DATABASE_HOST="ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
DATABASE_USERNAME="neondb_owner"
DATABASE_PASSWORD="npg_xxx"
```

- HOST includes DB name, SSL params, and pooler config

## Query Layer

- All queries call `getDb()` — never accept DB as parameter
- Use `.returning()` for mutations
- Use `Promise.all()` for independent parallel queries

## Serverless Patterns

- Neon pooler endpoint in HOST — no manual pool config
- Singleton `db` cached per Worker isolate lifetime
- Stateless per-request query execution at edge
- Avoid long-running transactions in serverless
- Use `.onConflictDoNothing()` for idempotent inserts (seeds)
