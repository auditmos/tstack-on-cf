# Deep Modules

A deep module (Ousterhout) has a small interface hiding a large implementation.
Deep modules are more testable, more AI-navigable, and let you test at the boundary.

## Principles

- Interface = exports, function signatures, props. Keep narrow.
- Implementation = internal logic. Absorb complexity here.
- Shallow modules (many tiny files doing little) increase system complexity.
- Before creating a new file: does this deepen an existing module or widen its interface?
- Before exporting a function: does the caller need this or is it internal?

## Application

| Layer | Module boundary | Interface | Hides |
|-------|----------------|-----------|-------|
| DB domain | `src/db/{domain}/index.ts` | Exported queries + types | Table defs, query builders, pagination |
| API endpoint | `src/hono/api/{name}.ts` | HTTP routes | Validation, error mapping, business rules |
| Component | `src/components/{feature}/` | Props + named export | State, mutations, UI logic |
| Server fn | `src/core/functions/` | createServerFn signature | Auth, data fetching, transforms |

## Testing Corollary

Test at the module boundary, not internals:
- DB: test exported query functions
- API: test via HTTP requests
- Components: test via user interactions (Testing Library)
- If you must test an internal → the module should split
