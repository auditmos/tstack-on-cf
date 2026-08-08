# Decision: Smart Placement ships off

**Status:** accepted · **Applies to:** `wrangler.jsonc`

## Decision

Smart Placement is present in `wrangler.jsonc` as a commented block and is not
enabled. Turning it on is a deliberate act by the person cloning this template,
taken after measuring, not a default they inherit.

## Why

Smart Placement moves a Worker's execution away from the data centre nearest the
user and towards its back-end, when Cloudflare's measurements say the round
trips to that back-end dominate the request. It is the right setting for an
application that is chatty with a database pinned to one region — which is
exactly what the reference setup here is: Neon Postgres in a single region.

That is an argument for enabling it *in this repository's own deployment*, not
for shipping it enabled in a template. A cloner's database may be somewhere
else, replicated, or reached through a cache; their Worker may spend its time
rendering rather than waiting on queries. In those cases Smart Placement is
neutral at best, and it moves execution away from the user for no gain — a
regression that is invisible until someone measures.

The failure mode of an inherited default is that nobody remembers choosing it.
Commented-out configuration with the reasoning attached asks for a decision;
an enabled default pretends one was already made on the cloner's behalf, with
information the template does not have.

## Enable when

All three, together, describe your Worker:

- A single request makes **multiple sequential round trips** to the same
  back-end — several queries, or a query whose result drives the next one.
- That back-end lives in **one place**: a region-pinned database, a legacy
  service, a single-homed API. Anycasted or multi-region back-ends have nothing
  to move towards.
- The Worker is **not** doing heavy user-proximate work whose latency would grow
  by the same amount placement saves.

If you have one round trip per request, this setting has nothing to optimise.

## How to enable

Uncomment the block in `wrangler.jsonc`:

```jsonc
"placement": { "mode": "smart" }
```

If you already know where your back-end is, an explicit hint beats inference —
`"placement": { "region": "aws:us-east-1" }` for a cloud region, or
`"placement": { "host": "db.example.com:5432" }` for infrastructure elsewhere.

Enable it in **one environment first** — staging — not everywhere at once.

## How to measure the result

Cloudflare holds back roughly 1% of requests from Smart Placement as a control
group, and the **Request duration** chart in the Worker's metrics plots placed
requests against that control. The chart only appears once Smart Placement is
enabled, so there is no before-and-after to collect by hand: enable it, let a
representative period of real traffic through, then read the two distributions
off the same chart.

Judge it on the tail, not the median — p95 and p99 are where round-trip cost
shows up. If the placed distribution is not clearly better, turn it back off.
Neutral is not a reason to keep configuration.
