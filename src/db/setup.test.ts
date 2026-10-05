import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppError, InvariantError } from "@/core/errors";
import { getDb } from "./setup";

describe("src/db/setup.ts db singleton", () => {
	it("has an intent comment marking it isolate-scoped", () => {
		const src = readFileSync(resolve(__dirname, "setup.ts"), "utf8");
		const lines = src.split("\n");
		const dbIdx = lines.findIndex((l) => /^\s*let\s+db\b/.test(l));
		expect(dbIdx).toBeGreaterThan(-1);
		const preceding = lines.slice(Math.max(0, dbIdx - 3), dbIdx).join("\n");
		expect(preceding).toMatch(/isolate/i);
	});
});

describe("getDb", () => {
	// Calling it first is a wiring mistake in the Worker entry, not a request
	// failure — so it must not be an AppError, whose message the API sends to
	// the client.
	it("throws an InvariantError when called before initDatabase", () => {
		let thrown: unknown;
		try {
			getDb();
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(InvariantError);
		expect(thrown).not.toBeInstanceOf(AppError);
		expect((thrown as Error).name).toBe("InvariantError");
		expect((thrown as Error).message).toMatch(/initDatabase/);
	});
});
