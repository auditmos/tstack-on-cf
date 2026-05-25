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
	};

	it("does not declare database credentials in vars (use secrets)", () => {
		expect(config.vars?.DATABASE_HOST).toBeUndefined();
		expect(config.vars?.DATABASE_USERNAME).toBeUndefined();
		expect(config.vars?.DATABASE_PASSWORD).toBeUndefined();
	});
});
