import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { InvariantError } from "@/core/errors";

// Cached per Worker isolate (not per request). initDatabase() is idempotent —
// see workers-best-practices rule "Do not store request-scoped state in global scope".
let db: ReturnType<typeof drizzle>;

interface DbConfig {
	host: string;
	username: string;
	password: string;
}

export function initDatabase(config: DbConfig) {
	if (db) return db;
	const connectionString = `postgres://${config.username}:${config.password}@${config.host}`;
	db = drizzle(neon(connectionString));
	return db;
}

export function getDb() {
	if (!db) throw new InvariantError("Database not initialized. Call initDatabase() first.");
	return db;
}
