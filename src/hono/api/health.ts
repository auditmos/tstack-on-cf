import { checkDatabase } from "@/db/health";
import { createHono } from "@/hono/factory";

const healthEndpoint = createHono();

healthEndpoint.get("/live", (c) =>
	c.json({
		status: "ok" as const,
		time: new Date().toISOString(),
	}),
);

healthEndpoint.get("/ready", async (c) => {
	const database = await checkDatabase();
	const status = database === "connected" ? "ok" : "degraded";
	const response = {
		status: status as "ok" | "degraded",
		env: c.env.CLOUDFLARE_ENV ?? "unknown",
		service: "tstack-on-cf",
		time: new Date().toISOString(),
		database,
	};

	return c.json(response, database === "connected" ? 200 : 503);
});

export default healthEndpoint;
