import { sql } from "drizzle-orm";
import { getDb } from "@/db/setup";
import type { DatabaseStatus } from "./schema";

export async function checkDatabase(): Promise<DatabaseStatus> {
	try {
		const db = getDb();
		await db.execute(sql`SELECT 1`);
		return "connected";
	} catch (err) {
		// biome-ignore lint/suspicious/noConsole: structured log for failed health checks surfaces in Workers tail
		console.error(
			JSON.stringify({
				message: "db health check failed",
				error: err instanceof Error ? err.message : String(err),
			}),
		);
		return "disconnected";
	}
}
