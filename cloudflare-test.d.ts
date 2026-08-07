/// <reference types="@cloudflare/vitest-pool-workers/types" />

// Types the `env` that `cloudflare:test` hands to a `*.worker.test.ts` file as
// the Worker's own bindings, so a test reaching for a binding the Worker does
// not declare is a type error rather than a runtime undefined.
declare module "cloudflare:test" {
	interface ProvidedEnv extends Env {}
}
