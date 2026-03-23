---
paths:
  - "src/**/*.{ts,tsx}"
---

# TanStack Rules (Start, Router, Query, Form)

## TanStack Start - Server Functions

Use `createServerFn` for server-side logic:

```ts
import { createServerFn } from '@tanstack/react-start'

export const getUser = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    return getUserById(data.id)
  })
```

## TanStack Router - File-Based Routing

- Routes in `src/routes/` directory
- `__root.tsx` for root layout
- `_layout/` prefix for layout routes
- `$param` for dynamic segments
- Route tree auto-generates to `routeTree.gen.ts` — never edit manually
- Auto-regenerated during `pnpm dev` and `pnpm build`

## Router - Route Definition

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$userId')({
  loader: async ({ params }) => {
    return getUser({ data: { id: params.userId } })
  },
  component: UserPage,
})

function UserPage() {
  const user = Route.useLoaderData()
  return <div>{user.name}</div>
}
```

## Router — Search Params Callbacks (Critical)

`validateSearch` schemas with `.default()` produce required fields in output type, but Router provides optional fields in the `prev` callback. Always provide fallback defaults:

```ts
// Bad — prev.limit is number | undefined, not number
navigate({ search: (prev) => ({ ...prev, ...updates }) })

// Good — explicit defaults
navigate({
  search: (prev) => ({
    limit: prev.limit ?? 20,
    offset: prev.offset ?? 0,
    status: prev.status,
    ...updates,
  }),
})
```

## TanStack Query - Query Options

Use `queryOptions` for reusable, type-safe queries:

```ts
import { queryOptions } from '@tanstack/react-query'

export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
  })

// In component
const { data } = useSuspenseQuery(userQueryOptions(userId))
```

## Query - Key Factories

```ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (filters: Filters) => [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
}
```

## Forms & Mutations

See `form-patterns.md` for `useForm` + `useMutation` template, mutate vs mutateAsync, and schema alignment.

## SSR Patterns

- Use loaders for initial data (SSR)
- Hydrate query cache from loader data
- Prefer server functions over client fetch for SSR'd data
