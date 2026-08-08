import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ENV_TEMPLATES, fanoutEnv } from "./init-project";

const ROOT = resolve(__dirname, "..");

describe("env template fan-out", () => {
	// Renaming a template without renaming it here leaves the bootstrap step
	// reporting "no-template" for every file a cloner needs, and it reports that
	// as a normal outcome rather than an error.
	it.each(ENV_TEMPLATES)("ships the $template template it promises to copy", ({ template }) => {
		expect(existsSync(resolve(ROOT, template))).toBe(true);
	});

	it("names a template for every per-environment file the README tells you to fill", () => {
		const targets = ENV_TEMPLATES.flatMap((t) => t.targets);
		expect(targets).toEqual([".env", ".dev.vars", ".staging.vars", ".production.vars"]);
	});

	describe("copying", () => {
		let root: string;

		beforeEach(() => {
			root = mkdtempSync(join(tmpdir(), "init-project-"));
			writeFileSync(join(root, ".dev.vars.example"), 'DATABASE_HOST=""\n');
		});

		afterEach(() => {
			rmSync(root, { recursive: true, force: true });
		});

		it("copies the template to a target that is not there yet", () => {
			expect(fanoutEnv(".dev.vars.example", ".dev.vars", root)).toBe("copied");
			expect(readFileSync(join(root, ".dev.vars"), "utf8")).toBe('DATABASE_HOST=""\n');
		});

		// The second run happens after someone has filled in real credentials.
		it("leaves a filled-in target alone on a re-run", () => {
			writeFileSync(join(root, ".dev.vars"), 'DATABASE_HOST="real"\n');

			expect(fanoutEnv(".dev.vars.example", ".dev.vars", root)).toBe("skipped");
			expect(readFileSync(join(root, ".dev.vars"), "utf8")).toBe('DATABASE_HOST="real"\n');
		});

		it("reports a missing template rather than writing an empty file", () => {
			expect(fanoutEnv(".gone.example", ".gone", root)).toBe("no-template");
			expect(existsSync(join(root, ".gone"))).toBe(false);
		});
	});
});
