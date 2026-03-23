import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { clients } from "../src/db/client/table";

const host = process.env.DATABASE_HOST;
const username = process.env.DATABASE_USERNAME;
const password = process.env.DATABASE_PASSWORD;

if (!host || !username || !password) {
	console.error("Missing required DATABASE_* environment variables");
	process.exit(1);
}

const sampleClients = [
	{ name: "John", surname: "Smith", email: "john.smith@example.com" },
	{ name: "Jane", surname: "Doe", email: "jane.doe@example.com" },
	{ name: "Alice", surname: "Johnson", email: "alice.johnson@example.com" },
	{ name: "Bob", surname: "Williams", email: "bob.williams@example.com" },
	{ name: "Charlie", surname: "Brown", email: "charlie.brown@example.com" },
	{ name: "Diana", surname: "Prince", email: "diana.prince@example.com" },
	{ name: "Edward", surname: "Norton", email: "edward.norton@example.com" },
	{ name: "Fiona", surname: "Apple", email: "fiona.apple@example.com" },
	{ name: "George", surname: "Miller", email: "george.miller@example.com" },
	{ name: "Hannah", surname: "Montana", email: "hannah.montana@example.com" },
];

async function seed() {
	const connectionString = `postgres://${username}:${password}@${host}`;
	const db = drizzle(neon(connectionString));

	console.log("Seeding database...");
	await db.insert(clients).values(sampleClients).onConflictDoNothing();
	console.log(`Seeded ${sampleClients.length} clients`);
	process.exit(0);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
