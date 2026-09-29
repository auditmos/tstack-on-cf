import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ENV_TEMPLATES, fanoutEnv, ORIGINAL_WORKER_NAME, renameProject } from "./init-project";

const ROOT = resolve(__dirname, "..");

// Runs against the fixed original name, not whatever wrangler.jsonc says now,
// so it holds in the template and in every project initialised from it: in the
// template it proves the rename reaches every mention, and in a derived project
// the script is the only file left naming the template.
describe("project rename", () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "init-project-rename-"));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("leaves no tracked file naming the template except the script that knows it", () => {
		const mentions = execFileSync("git", ["grep", "-l", "-F", ORIGINAL_WORKER_NAME], { cwd: ROOT })
			.toString()
			.trim()
			.split("\n");
		for (const file of mentions) {
			mkdirSync(dirname(join(root, file)), { recursive: true });
			cpSync(join(ROOT, file), join(root, file));
		}

		renameProject("my-app", root);

		const leftovers = mentions.filter((file) =>
			readFileSync(join(root, file), "utf8").includes(ORIGINAL_WORKER_NAME),
		);
		expect(leftovers).toEqual(["scripts/init-project.ts"]);
	});
});

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
