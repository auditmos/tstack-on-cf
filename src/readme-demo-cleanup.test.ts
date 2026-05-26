import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEMO_FILES = [
	"src/core/middleware/example-middleware.ts",
	"src/core/functions/example-functions.ts",
	"src/components/demo/middleware-demo.tsx",
	"src/components/demo/index.ts",
] as const;

describe("README demo-file cleanup section", () => {
	const readme = readFileSync(resolve(__dirname, "..", "README.md"), "utf8");
	const section = readme
		.split(/\n(?=#{1,6}\s)/)
		.find((s) => /^#{1,6}\s+Remove these on project start\b/.test(s));

	it("documents a 'Remove these on project start' section", () => {
		expect(section).toBeDefined();
	});

	it.each(DEMO_FILES)("lists %s in the cleanup section", (file) => {
		expect(section).toContain(file);
	});
});
