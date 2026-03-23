import { isUniqueViolation } from "@/core/errors";
import {
	ClientCreateRequestSchema,
	ClientUpdateRequestSchema,
	createClient,
	deleteClient,
	getClient,
	getClients,
	IdParamSchema,
	PaginationRequestSchema,
	updateClient,
} from "@/db/client";
import { createHono } from "@/hono/factory";

const clientsEndpoint = createHono();

clientsEndpoint.get("/", async (c) => {
	const parsed = PaginationRequestSchema.safeParse({
		limit: c.req.query("limit"),
		offset: c.req.query("offset"),
	});
	if (!parsed.success) {
		return c.json({ error: parsed.error.message }, 400);
	}
	const result = await getClients(parsed.data);
	return c.json(result);
});

clientsEndpoint.get("/:id", async (c) => {
	const parsed = IdParamSchema.safeParse({ id: c.req.param("id") });
	if (!parsed.success) {
		return c.json({ error: parsed.error.message }, 400);
	}
	const client = await getClient(parsed.data.id);
	if (!client) {
		return c.json({ error: "Client not found" }, 404);
	}
	return c.json(client);
});

clientsEndpoint.post("/", async (c) => {
	const body = await c.req.json();
	const parsed = ClientCreateRequestSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.message }, 400);
	}
	try {
		const client = await createClient(parsed.data);
		return c.json(client, 201);
	} catch (err) {
		if (isUniqueViolation(err)) {
			return c.json({ error: "Email already exists" }, 409);
		}
		const message = err instanceof Error ? err.message : "Failed to create client";
		return c.json({ error: message }, 500);
	}
});

clientsEndpoint.put("/:id", async (c) => {
	const idParsed = IdParamSchema.safeParse({ id: c.req.param("id") });
	if (!idParsed.success) {
		return c.json({ error: idParsed.error.message }, 400);
	}
	const body = await c.req.json();
	const parsed = ClientUpdateRequestSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.message }, 400);
	}
	const client = await updateClient(idParsed.data.id, parsed.data);
	if (!client) {
		return c.json({ error: "Client not found" }, 404);
	}
	return c.json(client);
});

clientsEndpoint.delete("/:id", async (c) => {
	const parsed = IdParamSchema.safeParse({ id: c.req.param("id") });
	if (!parsed.success) {
		return c.json({ error: parsed.error.message }, 400);
	}
	const deleted = await deleteClient(parsed.data.id);
	if (!deleted) {
		return c.json({ error: "Client not found" }, 404);
	}
	return c.json({ success: true });
});

export default clientsEndpoint;
