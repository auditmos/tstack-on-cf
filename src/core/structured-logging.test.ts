import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..");
const SERVER_GLOBS = ["core/**/*.ts", "hono/**/*.ts", "db/**/*.ts", "server.ts"];
const CONSOLE_CALL = /console\.(log|error|warn)\([^)]*\)/g;

async function listServerFiles(): Promise<string[]> {
	const files: string[] = [];
	for (const pattern of SERVER_GLOBS) {
		for await (const file of glob(pattern, { cwd: SRC_ROOT })) {
			if (!file.endsWith(".test.ts")) files.push(file);
		}
	}
	return files;
}

function findOffenders(file: string): string[] {
	const src = readFileSync(resolve(SRC_ROOT, file), "utf8");
	const calls = src.match(CONSOLE_CALL) ?? [];
	return calls.filter((c) => !c.includes("JSON.stringify")).map((c) => `${file}: ${c}`);
}

describe("server-side console calls are structured JSON", () => {
	it("every console.log/error/warn call wraps payload in JSON.stringify", async () => {
		const files = await listServerFiles();
		const offenders = files.flatMap(findOffenders);
		expect(offenders).toEqual([]);
	});
});
