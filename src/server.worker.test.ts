import { SELF } from "cloudflare:test";

// Runs inside workerd, through the deployed entry point — so this fails when
// the dispatch in src/server.ts is wrong, not when a unit test's idea of it is.
describe("Worker entry dispatch", () => {
	it("hands /api/* to the Hono API", async () => {
		const res = await SELF.fetch("https://example.com/api/health/live");

		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ status: "ok" });
		expect(res.headers.get("x-handled-by")).toBeNull();
	});

	// `/apidocs` and `/apinotmine` are the interesting ones: a prefix check
	// written as `startsWith("/api")` sends them to the API, and nothing in the
	// application would ever be reachable again.
	it.each([
		"/",
		"/clients",
		"/apidocs",
		"/apinotmine",
	])("hands %s to the application handler", async (path) => {
		const res = await SELF.fetch(`https://example.com${path}`);

		expect(res.headers.get("x-handled-by")).toBe("app");
	});

	it("does not answer an unknown /api path from the application", async () => {
		const res = await SELF.fetch("https://example.com/api/nope");

		expect(res.status).toBe(404);
		expect(res.headers.get("x-handled-by")).toBeNull();
	});
});
