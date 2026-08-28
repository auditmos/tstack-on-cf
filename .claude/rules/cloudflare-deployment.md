# Cloudflare Deployment Rules

## Custom Domains vs Routes

- Prefer `custom_domain: true` over `routes` with `zone_name` — custom domains auto-create DNS records and SSL certs; routes require manual DNS setup
- Routes with `zone_name` need a pre-existing proxied DNS record or requests fail with `ERR_NAME_NOT_RESOLVED`

```jsonc
// Good: auto-creates DNS + SSL
"routes": [{ "pattern": "app.example.com", "custom_domain": true }]

// Fragile: requires manual DNS record
"routes": [{ "pattern": "app.example.com/*", "zone_name": "example.com" }]
```

## HTTP→HTTPS Enforcement

- NEVER use Cloudflare "Redirect from HTTP to HTTPS" redirect rule template — it intercepts requests before Workers and causes 301 self-redirect loops on Worker custom domains
- USE "Always Use HTTPS" toggle in SSL/TLS → Edge Certificates instead — operates at TLS layer, doesn't conflict with Workers

## SSL/TLS Mode

- Zone SSL/TLS encryption mode MUST be **Full** or **Full (strict)**, never Flexible
- Flexible + any HTTPS redirect = infinite redirect loop

## Vite Plugin Environments (`@cloudflare/vite-plugin`)

- The Vite plugin reads all env blocks from `wrangler.jsonc` and resolves bindings automatically
- **`CLOUDFLARE_ENV`, not `--mode`, selects the env block.** Vite's `--mode` is a Vite concept the plugin does not read; a build that sets only the mode silently resolves to the top-level block — same bundle, but the dev Worker's name, the dev `vars`, and none of the env's routes. `wrangler deploy` then publishes it over the dev Worker and reports success
- `CLOUDFLARE_ENV=<env>` bakes environment config (routes, bindings, worker name) into `dist/server/wrangler.json`
- `wrangler deploy --env=''` deploys that pre-configured build — the env is already embedded by the plugin

Verify before trusting a deploy — the failure mode is a green deploy of the wrong Worker, so check the name rather than the exit code:

```bash
CLOUDFLARE_ENV=staging vite build
node -e "console.log(require('./dist/server/wrangler.json').name)"   # <app>-staging
```

## Deploy Script Pattern

```jsonc
// CLOUDFLARE_ENV picks the wrangler env; --mode stays for Vite's own .env files
"build:staging": "CLOUDFLARE_ENV=staging vite build --mode staging",
"deploy:staging": "pnpm run build:staging && wrangler deploy --env=''"
```

## Debugging "Too Many Redirects"

1. `curl -sI https://domain/path` — check if response is 301 to same URL
2. If `server: cloudflare` with no app headers → request never reached Worker
3. Check: Redirect Rules > Page Rules > SSL mode > Worker binding
4. Disable redirect rules first — most common culprit with Workers
