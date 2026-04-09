# TanStack Start on Cloudflare

A production-ready **template** for building full-stack React apps on Cloudflare Workers. Ships with TanStack Start (SSR + file-based routing), a Hono API layer, Neon Postgres via Drizzle ORM, Zod validation, Shadcn/UI, and a strict Biome + Vitest toolchain.

Use it as the starting point for your next project — clone it, rename it, wire up your database, and start shipping.

[![TanStack Start on Cloudflare](https://img.youtube.com/vi/TWWS_lo4kOA/0.jpg)](https://www.youtube.com/watch?v=TWWS_lo4kOA)

## Why this template

- **Edge-first** — single `src/server.ts` entrypoint that routes `/api/*` to Hono and everything else to TanStack Start, all running on Cloudflare Workers.
- **Type-safe end-to-end** — strict TypeScript, Zod at every boundary, Drizzle-inferred DB types, typed Cloudflare `Env` via `wrangler types`.
- **Deep modules** — domain-oriented layout (`src/db/{domain}/`, `src/hono/api/{name}.ts`) with narrow public APIs. See `.claude/rules/deep-modules.md`.
- **Batteries included** — error infrastructure, Neon + Drizzle migrations, Shadcn/UI, TanStack Query SSR hydration, Vitest, Biome, knip, semantic-release, taze.
- **Agent-friendly** — project rules in `.claude/rules/` activate automatically based on the files you touch.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env template and fill in your Neon credentials
cp .example.vars .dev.vars

# Generate Cloudflare Env types
pnpm cf-typegen

# Run migrations against your dev database
pnpm db:migrate:dev

# Start the dev server
pnpm dev
```

The app runs on http://localhost:3000. API endpoints are served under `/api/*`.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Dev server on port 3000 (Vite + Cloudflare plugin) |
| `pnpm build` | Production build |
| `pnpm serve` | Preview the production build locally |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |
| `pnpm cf-typegen` | Generate `Env` types from `wrangler.jsonc` |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest |
| `pnpm types` | `tsc --noEmit` type-check |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm knip` | Detect unused files, deps, and exports |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate:{dev,staging,production}` | Apply migrations to each env |
| `pnpm db:studio` | Open Drizzle Studio against dev |
| `pnpm db:seed:dev` | Run `scripts/seed.ts` |
| `pnpm deps` / `pnpm deps:update` | Check / apply dependency updates via taze |
| `pnpm release` | semantic-release |

All `db:*` scripts load secrets via `@dotenvx/dotenvx` from `.dev.vars`, `.staging.vars`, or `.production.vars`.

## Project Structure

```
src/
├── server.ts                  # CF Workers entry — routes /api/* → Hono, rest → TanStack Start
├── router.tsx                 # TanStack Router instance
├── routes/                    # File-based routes (auto-generates routeTree.gen.ts)
│   ├── __root.tsx
│   ├── index.tsx
│   └── clients.tsx
├── components/
│   ├── ui/                    # Shadcn primitives (do not edit manually)
│   ├── landing/               # Landing page sections
│   ├── navigation/            # App navigation
│   ├── theme/                 # Theme provider / toggle
│   └── clients/               # Feature components
├── core/
│   ├── errors.ts              # AppError, Result<T>, isUniqueViolation
│   ├── functions/             # TanStack server functions
│   └── middleware/            # Server-function middleware
├── db/
│   ├── setup.ts               # initDatabase / getDb singleton
│   ├── index.ts               # Public DB module API
│   ├── schema.ts              # Re-exports all tables
│   ├── migrations/            # Drizzle-generated SQL
│   ├── client/                # Domain: clients (table, queries, zod schema)
│   └── health/                # Domain: health check query
├── hono/
│   ├── factory.ts             # Typed Hono factory with CF Bindings
│   ├── api.ts                 # Router mounting /api/health, /api/clients
│   └── api/
│       ├── health.ts
│       └── clients.ts         # REST CRUD for clients
├── integrations/tanstack-query/
├── lib/
├── utils/
└── styles.css                 # Tailwind v4 entry
```

Path alias `@/*` resolves to `src/*`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (Router + Query SSR) |
| UI | React 19, Shadcn/UI (new-york, Zinc), Tailwind CSS v4, Lucide |
| API | Hono on Cloudflare Workers |
| Runtime | Cloudflare Workers (`nodejs_compat`) |
| Database | Neon Postgres + Drizzle ORM (`neon-http`) |
| Validation | Zod 4 |
| Forms | TanStack Form |
| Language | TypeScript (strict) |
| Linter | Biome 2 |
| Testing | Vitest + Testing Library + jsdom |
| Dead-code detection | knip |
| Release | semantic-release |
| Package manager | pnpm 10 |

## Cloudflare Integration

### `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tanstack-start-app",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./src/server.ts",
  "vars": {
    "CLOUDFLARE_ENV": "dev",
    "DATABASE_HOST": "",
    "DATABASE_USERNAME": "",
    "DATABASE_PASSWORD": ""
  }
}
```

- Use `wrangler.jsonc` (not `.toml`) for configuration.
- Prefer `custom_domain: true` over routes with `zone_name` — see `.claude/rules/cloudflare-deployment.md`.
- Run `pnpm cf-typegen` whenever you add bindings to regenerate `worker-configuration.d.ts`.

### Custom Server Entry (`src/server.ts`)

One fetch handler owns the entire worker: it boots the DB once per isolate, then dispatches to Hono or TanStack Start.

```ts
import handler from "@tanstack/react-start/server-entry";
import { initDatabase } from "@/db";
import { apiHono } from "@/hono/api";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    initDatabase({
      host: env.DATABASE_HOST,
      username: env.DATABASE_USERNAME,
      password: env.DATABASE_PASSWORD,
    });

    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return apiHono.fetch(request, env, ctx);
    }

    return handler.fetch(request, { context: { fromFetch: true } });
  },
};
```

You can extend this handler with Queue consumers, scheduled events, or Durable Object bindings as your project grows.

### Secrets & Environments

Secrets live in per-environment `.vars` files, never committed:

```bash
# .dev.vars
CLOUDFLARE_ENV=dev
DATABASE_HOST="ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
DATABASE_USERNAME="neondb_owner"
DATABASE_PASSWORD="npg_xxx"
```

For staging/production, create `.staging.vars` / `.production.vars` and set the same keys as Cloudflare secrets via `wrangler secret put`.

## Database (Neon + Drizzle)

The DB module follows the **deep-modules** pattern: every domain has its own folder with a narrow public API.

```
src/db/client/
├── table.ts      # pgTable definition
├── schema.ts     # Zod schemas for input/output
├── queries.ts    # getClients, getClient, createClient, updateClient, deleteClient
└── index.ts      # Public re-exports
```

- `initDatabase()` is called once per Worker isolate from `src/server.ts`.
- Every query calls `getDb()` — never pass the DB as a parameter.
- Inputs are validated with Zod at the API boundary; mutations use `.returning()` to avoid extra round trips.

### Migration Workflow

```bash
# 1. Edit your table definition in src/db/{domain}/table.ts
# 2. Generate a migration
pnpm db:generate

# 3. Apply it to your chosen environment
pnpm db:migrate:dev
pnpm db:migrate:staging
pnpm db:migrate:production

# Inspect data
pnpm db:studio
```

`drizzle.config.ts` points at `src/db/schema.ts` (which re-exports all tables) and writes migrations to `src/db/migrations/`.

## REST API with Hono

All `/api/*` routes are handled by Hono. Endpoints live in `src/hono/api/` and are mounted in `src/hono/api.ts`.

### Example: `GET /api/clients`

```ts
// src/hono/api/clients.ts
import { isUniqueViolation } from "@/core/errors";
import {
  ClientCreateRequestSchema,
  createClient,
  getClients,
  PaginationRequestSchema,
} from "@/db/client";
import { createHono } from "@/hono/factory";

const clientsEndpoint = createHono();

clientsEndpoint.get("/", async (c) => {
  const parsed = PaginationRequestSchema.safeParse({
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
  return c.json(await getClients(parsed.data));
});

clientsEndpoint.post("/", async (c) => {
  const parsed = ClientCreateRequestSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

  try {
    return c.json(await createClient(parsed.data), 201);
  } catch (err) {
    if (isUniqueViolation(err)) return c.json({ error: "Email already exists" }, 409);
    throw err;
  }
});

export default clientsEndpoint;
```

### Mounting a New Endpoint

```ts
// src/hono/api.ts
import { createHono } from "./factory";
import clientsEndpoint from "@/hono/api/clients";
import healthEndpoint from "@/hono/api/health";

export const apiHono = createHono().basePath("/api");

apiHono.route("/health", healthEndpoint);
apiHono.route("/clients", clientsEndpoint);
```

The `createHono()` factory types `Bindings: Env` so `c.env` is fully typed against your Cloudflare configuration.

### Hono vs TanStack Server Functions

| Use Hono REST APIs | Use TanStack Server Functions |
|--------------------|-------------------------------|
| Public APIs for external clients | Server logic called from React |
| Webhooks | Form submissions |
| Third-party integrations | Data fetching for UI |
| Anything with a URL contract | Type-safe client↔server calls |

## Error Handling

Error infrastructure lives in `src/core/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public status: number = 500,
    public field?: string,
  ) { super(message); this.name = "AppError"; }
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function isUniqueViolation(error: unknown): boolean { /* ... */ }
```

- Use `AppError` for known, recoverable failures.
- Use `Result<T>` when a caller needs to branch on success/failure without throwing.
- Check `error.cause.code` (not `error.message`) when inspecting Drizzle errors — the raw Postgres code lives on `cause`. `isUniqueViolation()` is the idiomatic way to detect `23505` conflicts.
- Unexpected errors propagate to the Hono global `onError` handler.

See `.claude/rules/error-handling.md` for the full convention.

## Server Functions & TanStack Query

Server functions run exclusively on the server with full type safety across the boundary:

```ts
// src/core/middleware/example-middleware.ts
export const exampleMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => next({ context: { data: "Context from middleware" } }),
);

// src/core/functions/example-functions.ts
const ExampleInputSchema = z.object({ exampleKey: z.string().min(1) });

export const exampleFunction = createServerFn()
  .middleware([exampleMiddleware])
  .inputValidator((data: z.infer<typeof ExampleInputSchema>) =>
    ExampleInputSchema.parse(data),
  )
  .handler(async (ctx) => {
    // ctx.data — validated input
    // ctx.context — middleware context
    return "Server response";
  });
```

Call them from components via TanStack Query:

```tsx
import { useMutation } from "@tanstack/react-query";
import { exampleFunction } from "@/core/functions/example-functions";

function MyComponent() {
  const mutation = useMutation({ mutationFn: exampleFunction });
  return (
    <button
      onClick={() => mutation.mutate({ exampleKey: "Hello Server!" })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "Loading..." : "Call Server Function"}
    </button>
  );
}
```

SSR hydration is wired up in `src/integrations/tanstack-query/` — loaders can prefetch into the query cache and it streams down with the HTML.

## Routing & UI

- **File-based routing** — add files to `src/routes/`, the tree auto-generates to `routeTree.gen.ts` on dev/build. Never edit the generated file.
- **Root layout** — `src/routes/__root.tsx`.
- **Shadcn/UI** — add components with `pnpx shadcn@latest add <component>`. Configured via `components.json` (new-york style, Zinc base, CSS variables).
- **Tailwind v4** — configured through the `@tailwindcss/vite` plugin, no separate config file. Styles entrypoint: `src/styles.css`.

## Testing

```bash
pnpm test           # run once
pnpm test:watch     # watch mode
pnpm test:coverage  # v8 coverage
```

- Tests live next to source as `*.test.ts` / `*.test.tsx`.
- Vitest globals are enabled — no need to import `describe` / `it` / `expect`.
- Route files (`src/routes/**`) are excluded from test discovery.
- Test at module boundaries (exported queries, HTTP requests, user interactions), not internals. See `.claude/rules/deep-modules.md`.

## Agent Rules & Design Docs

This template is set up for agent-assisted development:

- `.claude/CLAUDE.md` — project-wide instructions.
- `.claude/rules/` — topic rules (`general.md`, `deep-modules.md`, `error-handling.md`, `atomic-imports.md`, `cloudflare-deployment.md`, plus stack-specific rules under `db/` and `frontend/`) that activate automatically based on the files being edited.
- `AGENTS.md` — agent workflow guide.
- `/docs` — single source of truth for business requirements / design docs.

## Using this Template

1. Click **Use this template** on GitHub (or `gh repo create --template`).
2. Rename the worker in `wrangler.jsonc` (`name`) and `package.json` (`name`).
3. Provision a Neon database and fill in `.dev.vars`.
4. Run `pnpm cf-typegen && pnpm db:migrate:dev && pnpm dev`.
5. Delete `src/db/client/` and `src/hono/api/clients.ts` when you no longer need the example CRUD, and start modelling your own domain.

## Learn More

- **[TanStack Start](https://tanstack.com/start)** — full-stack React framework
- **[TanStack Router](https://tanstack.com/router)** — type-safe routing
- **[TanStack Query](https://tanstack.com/query)** — server state management
- **[Hono](https://hono.dev/)** — fast web framework for APIs
- **[Drizzle ORM](https://orm.drizzle.team/)** — type-safe SQL
- **[Neon](https://neon.tech/)** — serverless Postgres
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — edge computing platform
- **[Shadcn/UI](https://ui.shadcn.com/)** — component library
- **[Tailwind CSS](https://tailwindcss.com/)** — utility-first CSS
- **[Biome](https://biomejs.dev/)** — fast formatter and linter

## License

Open source under the [MIT License](LICENSE).
