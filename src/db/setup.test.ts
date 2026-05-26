import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
