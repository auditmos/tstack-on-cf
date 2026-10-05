import { vi } from "vitest";

// The database is the boundary: its queries are stubbed, the request schemas stay real.
vi.mock("@/db/client", async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	createClient: vi.fn(),
	deleteClient: vi.fn(),
	getClient: vi.fn(),
	getClients: vi.fn(),
	updateClient: vi.fn(),
}));

import {
	type Client,
	createClient,
	deleteClient,
	getClient,
	getClients,
	updateClient,
} from "@/db/client";
import { apiHono } from "@/hono/api";

const ADA: Client = {
	id: "0b9f3c1e-0000-4000-8000-000000000000",
	name: "Ada",
	surname: "Lovelace",
	email: "ada@example.com",
};

function send(method: string, path: string, body?: string) {
	return apiHono.request(path, {
		method,
		headers: { "Content-Type": "application/json" },
		body,
	});
}

function post(body: unknown) {
	return send("POST", "/api/clients", JSON.stringify(body));
}

describe("clients API success responses", () => {
	it("lists clients with their pagination", async () => {
		const pagination = { total: 1, limit: 10, offset: 0, hasMore: false };
		vi.mocked(getClients).mockResolvedValue({ data: [ADA], pagination });

		const res = await apiHono.request("/api/clients");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ data: [ADA], pagination });
	});

	it("wraps a fetched client in data", async () => {
		vi.mocked(getClient).mockResolvedValue(ADA);

		const res = await apiHono.request(`/api/clients/${ADA.id}`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ data: ADA });
	});

	it("wraps a created client in data, with 201", async () => {
		vi.mocked(createClient).mockResolvedValue(ADA);

		const res = await post({ name: "Ada", surname: "Lovelace", email: "ada@example.com" });

		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({ data: ADA });
	});

	it("wraps an updated client in data", async () => {
		vi.mocked(updateClient).mockResolvedValue(ADA);

		const res = await send("PUT", `/api/clients/${ADA.id}`, JSON.stringify({ name: "Ada" }));

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ data: ADA });
	});

	it("answers a delete with 204 and no body", async () => {
		vi.mocked(deleteClient).mockResolvedValue(true);

		const res = await send("DELETE", `/api/clients/${ADA.id}`);

		expect(res.status).toBe(204);
		expect(await res.text()).toBe("");
	});
});

/**
 * What is asserted is the body a client gets back: the failing issue's own
 * message and the field it belongs to — never Zod's JSON dump of every issue.
 */
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

	it.each([
		["POST", "/api/clients"],
		["PUT", `/api/clients/${ADA.id}`],
	])("rejects a %s body that is not JSON with 400", async (method, path) => {
		const res = await send(method, path, "{not json");

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "Request body must be valid JSON",
			code: "VALIDATION",
		});
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
