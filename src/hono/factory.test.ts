import { createHono } from "./factory";

describe("createHono middleware seam", () => {
	it("runs attached middleware before the route handler on a real request", async () => {
		const order: string[] = [];
		const endpoint = createHono(async (_c, next) => {
			order.push("middleware");
			await next();
		});
		endpoint.get("/ping", (c) => {
			order.push("handler");
			return c.json({ ok: true });
		});

		const res = await endpoint.request("/ping");

		expect(res.status).toBe(200);
		expect(order).toEqual(["middleware", "handler"]);
	});

	// The seam is only an authentication seam if it can refuse. Middleware that
	// returns without calling next() has to stop the handler from ever running.
	it("lets attached middleware reject a request before the handler runs", async () => {
		let handled = false;
		const endpoint = createHono(async (c) => c.json({ error: "Unauthorized" }, 401));
		endpoint.get("/ping", (c) => {
			handled = true;
			return c.json({ ok: true });
		});

		const res = await endpoint.request("/ping");

		expect(res.status).toBe(401);
		expect(handled).toBe(false);
	});
});
