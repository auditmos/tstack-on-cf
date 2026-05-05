// Project-specific extension of the wrangler-generated `BaseEnv`.
// `BaseEnv` (from worker-configuration.d.ts) holds the bindings declared in
// wrangler.jsonc. Add anything else the runtime expects (service bindings,
// queue messages, workflow params, etc.) by extending it here.
interface Env extends BaseEnv {}
