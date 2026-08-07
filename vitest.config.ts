import { resolve } from "node:path";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const alias = { "@": resolve(import.meta.dirname, "src") };

/** Anything ending `.worker.test.ts` runs in workerd; everything else in Node. */
const WORKER_TESTS = "src/**/*.worker.test.ts";

const APP_ENTRY = "@tanstack/react-start/server-entry";
const APP_ENTRY_STUB = "\0app-entry-stub";

/**
 * Stands in for TanStack Start's server entry inside workerd.
 *
 * The real entry resolves `#tanstack-router-entry` and friends, which only
 * exist once the Start plugin has run a full build — importing it here fails
 * before a single test runs. Stubbing it is not a loss: what these tests are
 * for is the dispatch in `src/server.ts`, and a stub that answers with a
 * recognisable marker proves a request reached the application handler far
 * more precisely than rendered HTML would. Server-side rendering is covered by
 * the component test project, not this one.
 */
const stubAppEntry = () => ({
	name: "stub-tanstack-start-entry",
	enforce: "pre" as const,
	resolveId: (id: string) => (id === APP_ENTRY ? APP_ENTRY_STUB : null),
	load: (id: string) =>
		id === APP_ENTRY_STUB
			? `export default { fetch: () => new Response("app", { headers: { "x-handled-by": "app" } }) }`
			: null,
});

export default defineConfig({
	test: {
		projects: [
			// Configuration and documentation invariants. No runtime needed, so
			// paying for one would only slow them down.
			{
				resolve: { alias },
				test: {
					name: "node",
					globals: true,
					include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
					exclude: ["src/routes/**", WORKER_TESTS],
				},
			},
			// The real thing: workerd, the bindings from wrangler.jsonc, and the
			// entry point that actually gets deployed.
			{
				plugins: [
					stubAppEntry(),
					cloudflareTest({
						wrangler: { configPath: "./wrangler.jsonc" },
						miniflare: {
							// The Worker's secrets are real credentials, so tests get
							// syntactically valid stand-ins instead: enough for the Neon
							// client to construct, never enough to reach a database.
							bindings: {
								DATABASE_HOST: "db.test.invalid/testdb?sslmode=require",
								DATABASE_USERNAME: "test",
								DATABASE_PASSWORD: "test",
							},
						},
					}),
				],
				resolve: { alias },
				test: {
					name: "workers",
					globals: true,
					include: [WORKER_TESTS],
					exclude: ["src/routes/**"],
				},
			},
		],
	},
});
