# tstack-on-cf

TanStack Start frontend + Hono API backend on Cloudflare Workers.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (Router + Query + SSR) |
| API | Hono on Cloudflare Workers |
| Runtime | Cloudflare Workers |
| Styling | Tailwind CSS v4, Shadcn (new-york, Zinc, CSS vars) |
| Language | TypeScript (strict) |
| Linter | Biome |
| Package manager | pnpm |

## Project Structure

- `src/routes/` — file-based routes (auto-generates `routeTree.gen.ts`)
- `src/components/` — reusable React components
- `src/components/ui/` — Shadcn primitives (do not edit manually)
- `src/core/functions/` — TanStack server functions
- `src/core/middleware/` — server function middleware
- `src/hono/` — Hono API routes and factory
- `src/server.ts` — custom CF Workers entry (routes `/api/*` → Hono, rest → TanStack)
- `src/integrations/tanstack-query/` — query client setup and providers
- Path alias: `@/*` → `src/*`

## Commands

```bash
pnpm dev                  # dev server (port 3000)
pnpm build                # production build
pnpm serve                # preview production build
pnpm deploy               # build + wrangler deploy
pnpm test                 # run all tests
pnpm test:watch           # watch mode
pnpm test:coverage        # with coverage
pnpm types                # type-check (tsc --noEmit)
pnpm lint                 # biome check
pnpm lint:fix             # biome auto-fix
pnpm knip                 # unused files/deps/exports
pnpm deps                 # check for updates
pnpm deps:update          # apply minor updates
pnpx shadcn@latest add <component>  # add Shadcn component
```

## Architecture

Prefer **deep modules** (Ousterhout): small interface hiding large implementation. Test at module boundaries, not internals. See `.claude/rules/deep-modules.md`.

Technology-specific rules live in `.claude/rules/` with scoped `paths:` frontmatter — they activate automatically when touching relevant files.

## Verification

Max 500 lines per source file — split if exceeding.

<important if="you have finished implementing or modifying code">
Run manually before declaring done:
1. `pnpm types` — type-check
2. `pnpm test` — run all tests
3. `pnpm lint` — lint check
</important>

<important if="you are writing or modifying tests">
- Tests live next to source as `*.test.ts` / `*.test.tsx`
- Vitest with globals enabled — no need to import `describe`/`it`/`expect`
- Path alias `@` resolves to `src/`
- Route files (`src/routes/**`) are excluded from test discovery
</important>

<important if="you are creating or reviewing design documents">
- `/docs` is the single source of truth for business requirements
- Apply review notes/status updates directly in the corresponding design doc
- Never create separate md files for reviews/audits/analyses unless explicitly asked
</important>
