import { checkDatabase, type LivenessResponse, type ReadinessResponse } from "@/db/health";
import { createHono } from "@/hono/factory";

const healthEndpoint = createHono();

healthEndpoint.get("/live", (c) => {
	const response: LivenessResponse = {
		status: "ok",
		time: new Date().toISOString(),
	};
	return c.json(response);
});

healthEndpoint.get("/ready", async (c) => {
	const database = await checkDatabase();
	const response: ReadinessResponse = {
		status: database === "connected" ? "ok" : "degraded",
		env: c.env.CLOUDFLARE_ENV,
		service: "tstack-on-cf",
		time: new Date().toISOString(),
		database,
	};

	return c.json(response, database === "connected" ? 200 : 503);
});

export default healthEndpoint;
