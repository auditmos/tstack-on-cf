import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SRC = resolve(__dirname);

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		if (!/\.tsx?$/.test(entry.name)) return [];
		if (/\.test\.tsx?$/.test(entry.name) || entry.name.endsWith(".gen.ts")) return [];
		return [path];
	});
}

// A bare `Error` gives no caller, test, or log line a type to branch on. Each
// failure has a named class in `src/core/errors.ts`: `AppError` for failures
// the API maps to a response, `ApiError` for a failed fetch on the client,
// `InvariantError` for states that mean the code is wrong. The rule lived in
// prose alone for months and seven sites drifted from it, so it is enforced
// here instead. Tests are exempt — they throw to simulate failures.
describe("thrown errors in src/", () => {
	const offenders = sourceFiles(SRC).flatMap((file) =>
		readFileSync(file, "utf8")
			.split("\n")
			.flatMap((line, index) =>
				/throw\s+new\s+Error\s*\(/.test(line) ? [`${relative(SRC, file)}:${index + 1}`] : [],
			),
	);

	it("are instances of a named error class, never a bare Error", () => {
		expect(offenders).toEqual([]);
	});
});
