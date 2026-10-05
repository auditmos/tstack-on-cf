import { AppError, isUniqueViolation } from "@/core/errors";
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
import { parseRequest } from "@/hono/validation";

const clientsEndpoint = createHono();

clientsEndpoint.get("/", async (c) => {
	const pagination = parseRequest(PaginationRequestSchema, {
		limit: c.req.query("limit"),
		offset: c.req.query("offset"),
	});
	const result = await getClients(pagination);
	return c.json(result);
});

clientsEndpoint.get("/:id", async (c) => {
	const { id } = parseRequest(IdParamSchema, { id: c.req.param("id") });
	const client = await getClient(id);
	if (!client) {
		throw new AppError("Client not found", "NOT_FOUND", 404);
	}
	return c.json(client);
});

clientsEndpoint.post("/", async (c) => {
	const data = parseRequest(ClientCreateRequestSchema, await c.req.json());
	try {
		const client = await createClient(data);
		return c.json(client, 201);
	} catch (err) {
		if (isUniqueViolation(err)) {
			throw new AppError("Email already exists", "CONFLICT", 409, "email");
		}
		throw err;
	}
});

clientsEndpoint.put("/:id", async (c) => {
	const { id } = parseRequest(IdParamSchema, { id: c.req.param("id") });
	const data = parseRequest(ClientUpdateRequestSchema, await c.req.json());
	const client = await updateClient(id, data);
	if (!client) {
		throw new AppError("Client not found", "NOT_FOUND", 404);
	}
	return c.json(client);
});

clientsEndpoint.delete("/:id", async (c) => {
	const { id } = parseRequest(IdParamSchema, { id: c.req.param("id") });
	const deleted = await deleteClient(id);
	if (!deleted) {
		throw new AppError("Client not found", "NOT_FOUND", 404);
	}
	return c.json({ success: true });
});

export default clientsEndpoint;
