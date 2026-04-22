import { defineConfig } from "drizzle-kit";

const host = process.env.DATABASE_HOST;
const username = process.env.DATABASE_USERNAME;
const password = process.env.DATABASE_PASSWORD;

if (!host || !username || !password) {
	throw new Error("Missing DATABASE_HOST, DATABASE_USERNAME, or DATABASE_PASSWORD");
}

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations/production",
	dialect: "postgresql",
	dbCredentials: {
		url: `postgresql://${username}:${password}@${host}`,
	},
});
