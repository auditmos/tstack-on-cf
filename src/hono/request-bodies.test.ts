import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HONO = __dirname;
const READER = "validation.ts";

// `req.json()` throws a bare `SyntaxError` on a body that is not JSON, which the
// global handler reports as a 500. `parseJsonBody` in `validation.ts` turns that
// into a 400 VALIDATION error, so it is the one place a body may be read.
describe("JSON request bodies in src/hono/", () => {
	const offenders = readdirSync(HONO, { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && file !== READER)
		.flatMap((file) =>
			readFileSync(join(HONO, file), "utf8")
				.split("\n")
				.flatMap((line, index) =>
					/\breq(?:\.raw)?\.json\s*\(/.test(line) ? [`${file}:${index + 1}`] : [],
				),
		);

	it("are read through parseJsonBody, never req.json()", () => {
		expect(offenders).toEqual([]);
	});
});
