import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadJsonc(path: string): Record<string, unknown> {
	const raw = readFileSync(path, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*/g, "");
	return JSON.parse(raw);
}

describe("wrangler.jsonc", () => {
	const config = loadJsonc(resolve(__dirname, "..", "wrangler.jsonc")) as {
		vars?: Record<string, string>;
		compatibility_date?: string;
	};

	it("does not declare database credentials in vars (use secrets)", () => {
		expect(config.vars?.DATABASE_HOST).toBeUndefined();
		expect(config.vars?.DATABASE_USERNAME).toBeUndefined();
		expect(config.vars?.DATABASE_PASSWORD).toBeUndefined();
	});

	it("compatibility_date is within 90 days", () => {
		expect(config.compatibility_date).toBeDefined();
		const date = new Date(config.compatibility_date as string);
		const ageDays = (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
		expect(ageDays).toBeLessThan(90);
	});
});
