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
import { parseJsonBody, parseRequest } from "@/hono/validation";

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
	return c.json({ data: client });
});

clientsEndpoint.post("/", async (c) => {
	const data = await parseJsonBody(ClientCreateRequestSchema, c.req);
	try {
		const client = await createClient(data);
		return c.json({ data: client }, 201);
	} catch (err) {
		if (isUniqueViolation(err)) {
			throw new AppError("Email already exists", "CONFLICT", 409, "email");
		}
		throw err;
	}
});

clientsEndpoint.put("/:id", async (c) => {
	const { id } = parseRequest(IdParamSchema, { id: c.req.param("id") });
	const data = await parseJsonBody(ClientUpdateRequestSchema, c.req);
	const client = await updateClient(id, data);
	if (!client) {
		throw new AppError("Client not found", "NOT_FOUND", 404);
	}
	return c.json({ data: client });
});

clientsEndpoint.delete("/:id", async (c) => {
	const { id } = parseRequest(IdParamSchema, { id: c.req.param("id") });
	const deleted = await deleteClient(id);
	if (!deleted) {
		throw new AppError("Client not found", "NOT_FOUND", 404);
	}
	return c.body(null, 204);
});

export default clientsEndpoint;
