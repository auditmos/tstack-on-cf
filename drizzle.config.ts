import { defineConfig } from "drizzle-kit";

const host = process.env.DATABASE_HOST!;
const username = process.env.DATABASE_USERNAME!;
const password = process.env.DATABASE_PASSWORD!;

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: `postgresql://${username}:${password}@${host}`,
	},
});
