import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

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
	if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
	return db;
}
