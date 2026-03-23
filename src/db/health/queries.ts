import { sql } from "drizzle-orm";
import { getDb } from "@/db/setup";
import type { DatabaseStatus } from "./schema";

export async function checkDatabase(): Promise<DatabaseStatus> {
	try {
		const db = getDb();
		await db.execute(sql`SELECT 1`);
		return "connected";
	} catch {
		return "disconnected";
	}
}
