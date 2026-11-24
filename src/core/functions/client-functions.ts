import { createServerFn } from "@tanstack/react-start";
import { AppError } from "@/core/errors";
import { getClients, PaginationRequestSchema } from "@/db/client";

export const listClients = createServerFn({ method: "GET" }).handler(async () => {
	try {
		return await getClients(PaginationRequestSchema.parse({}));
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: keep database errors in Workers logs
		console.error(JSON.stringify({ message: "Failed to fetch clients", error: String(error) }));
		throw new AppError("Failed to fetch clients", "INTERNAL");
	}
});
