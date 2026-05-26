import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "@/core/errors";
import clientsEndpoint from "@/hono/api/clients";
import healthEndpoint from "@/hono/api/health";
import { createHono } from "./factory";

export const apiHono = createHono().basePath("/api");

apiHono.route("/health", healthEndpoint);
apiHono.route("/clients", clientsEndpoint);

apiHono.onError((err, c) => {
	if (err instanceof AppError) {
		return c.json(
			{
				error: err.message,
				code: err.code,
				...(err.field ? { field: err.field } : {}),
			},
			err.status as ContentfulStatusCode,
		);
	}
	// biome-ignore lint/suspicious/noConsole: structured log for unhandled errors surfaces in Workers tail
	console.error(
		JSON.stringify({
			message: "unhandled error",
			error: err instanceof Error ? err.message : String(err),
			path: c.req.path,
		}),
	);
	return c.json({ error: "Internal server error" }, 500);
});
