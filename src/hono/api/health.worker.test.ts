import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { vi } from "vitest";
import { apiHono } from "@/hono/api";

/**
 * The sibling `health.test.ts` hands the handler an env object it invented, so
 * it proves the handler reads `c.env` and nothing more. Here the bindings come
 * from wrangler.jsonc by way of workerd, so a binding that stopped being wired
 * fails in this file rather than on the first request after a deploy.
 */
describe("environment bindings in the Workers runtime", () => {
	it("binds the vars declared in wrangler.jsonc", () => {
		expect(env.CLOUDFLARE_ENV).toBe("dev");
	});

	it.each([
		"DATABASE_HOST",
		"DATABASE_USERNAME",
		"DATABASE_PASSWORD",
	] as const)("binds the %s secret", (name) => {
		expect(typeof env[name]).toBe("string");
		expect(env[name]).not.toBe("");
	});

	it("carries the binding through a real HTTP request into the handler", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const ctx = createExecutionContext();
			const res = await apiHono.fetch(
				new Request("https://example.com/api/health/ready"),
				env,
				ctx,
			);
			await waitOnExecutionContext(ctx);

			const body = (await res.json()) as { env: string; database: string };
			expect(body.env).toBe(env.CLOUDFLARE_ENV);
			// No database is reachable from a test, and that is the point: the
			// route degrades instead of throwing, and still reports its env.
			expect(body.database).toBe("disconnected");
			expect(res.status).toBe(503);
		} finally {
			errorSpy.mockRestore();
		}
	});
});
