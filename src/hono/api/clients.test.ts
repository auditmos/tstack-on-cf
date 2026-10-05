import { apiHono } from "@/hono/api";

/**
 * Every case here fails validation, so no request reaches the database. What is
 * asserted is the body a client gets back: the failing issue's own message and
 * the field it belongs to — never Zod's JSON dump of every issue.
 */
function post(body: unknown) {
	return apiHono.request("/api/clients", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("clients API validation errors", () => {
	// Browsers accept a dotless domain for type="email"; the schema does not. This
	// is the case a real user can reach from the form.
	it("names the field and gives its message when the body is invalid", async () => {
		const res = await post({ name: "Ada", surname: "Lovelace", email: "ada@example" });

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "Invalid email format",
			code: "VALIDATION",
			field: "email",
		});
	});

	it("reports the first failing field when several fail", async () => {
		const res = await post({ name: "", surname: "Lovelace", email: "nope" });

		expect(await res.json()).toMatchObject({ error: "Name is required", field: "name" });
	});

	it("names the path parameter when an id is malformed", async () => {
		const res = await apiHono.request("/api/clients/not-a-uuid");

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "Invalid ID format",
			code: "VALIDATION",
			field: "id",
		});
	});

	it("names the query parameter when pagination is out of range", async () => {
		const res = await apiHono.request("/api/clients?limit=500");

		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ code: "VALIDATION", field: "limit" });
	});
});
