# docs

The single source of truth for business requirements and design documents.

`AGENTS.md` points agents here, so this directory has to contain something —
a pointer to an empty directory is the same dead end as a pointer to a missing
one. What it contains today are the decisions this template already made, so
that neither a human nor an agent re-litigates them from scratch.

## Decisions

| Decision | Summary |
| -------- | ------- |
| [Database driver](./decisions/database-driver.md) | The fetch-based Neon driver, not Hyperdrive — prerequisite count dominates for a template |
| [Smart Placement](./decisions/smart-placement.md) | Ships commented out; enable it deliberately and measure |
| [Agent support](./decisions/agent-support.md) | One first-class tool plus `AGENTS.md`; no mirrored agent definitions |

## What belongs here

- Requirements and design documents for the domain you build on this template.
- Decision records: what was decided, why, and the conditions under which
  someone should decide differently. Add them to `decisions/` and list them
  above.

Review notes and status updates go **into** the document they concern. Separate
review, audit, or analysis files are not created here — a document that has been
superseded says so in itself.

Anything referenced from `README.md` or `AGENTS.md` must exist:
`src/documented-pointers.test.ts` fails the build otherwise.
