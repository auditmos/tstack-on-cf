import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const WORKFLOW = resolve(ROOT, ".github", "workflows", "compat-date.yml");
const body = readFileSync(WORKFLOW, "utf8");

const CHECK_STEP = "Inspect & bump compatibility_date";
const DATE = /("compatibility_date"\s*:\s*)"([^"]+)"/;
const STALE = "2025-01-01";

/** The workflow's steps, each as its own block of text, in the order they run. */
const steps = body.split(/\n(?=\s*- name:)/).slice(1);
const checkStep = steps.find((step) => step.includes(`name: ${CHECK_STEP}`)) ?? "";

/** A step's `run: |` block, de-indented the way YAML would hand it to bash. */
function runBlock(step: string): string {
	const lines = step.split("\n");
	const start = lines.findIndex((line) => /^\s*run:\s*\|\s*$/.test(line));
	const runIndent = lines[start]?.match(/^\s*/)?.[0].length ?? 0;
	const block: string[] = [];
	for (const line of lines.slice(start + 1)) {
		const indent = line.match(/^\s*/)?.[0].length ?? 0;
		if (line.trim() !== "" && indent <= runIndent) break;
		block.push(line);
	}
	const contentIndent = block.find((line) => line.trim() !== "")?.match(/^\s*/)?.[0].length ?? 0;
	return block.map((line) => line.slice(contentIndent)).join("\n");
}

/**
 * The newest date each local runtime accepts, read from the workerd that
 * runtime's miniflare actually launches. Resolving `workerd` from the tool
 * itself is wrong: under pnpm it finds the hidden hoisted copy, which can be a
 * different version from the one that starts.
 */
function launchedRuntimeDates(): Record<string, string> {
	const from = (dir: string) => createRequire(join(realpathSync(dir), "package.json"));
	const dates: Record<string, string> = {};
	for (const tool of ["wrangler", "@cloudflare/vite-plugin", "@cloudflare/vitest-plugin"]) {
		const entry = realpathSync(from(join(ROOT, "node_modules", tool)).resolve("miniflare"));
		const marker = "/node_modules/miniflare/";
		const miniflare = entry.slice(0, entry.lastIndexOf(marker) + marker.length - 1);
		const workerd = from(miniflare)("workerd") as { compatibilityDate?: unknown };
		dates[tool] = String(workerd.compatibilityDate);
	}
	return dates;
}

const checkouts: string[] = [];

/** A bare checkout holding the files the check edits, at `date`. */
function checkoutAt(date: string): string {
	const dir = mkdtempSync(join(tmpdir(), "compat-date-"));
	checkouts.push(dir);
	for (const file of ["wrangler.jsonc", "README.md"]) {
		const text = readFileSync(join(ROOT, file), "utf8").replace(DATE, `$1"${date}"`);
		writeFileSync(join(dir, file), text);
	}
	copyFileSync(join(ROOT, "package.json"), join(dir, "package.json"));
	return dir;
}

/** Installs a stand-in workerd package that declares `date`, as pnpm lays it out. */
function installFakeWorkerd(dir: string, date: string): void {
	const pkg = join(dir, "node_modules", ".pnpm", "workerd@1.0.0", "node_modules", "workerd");
	mkdirSync(join(pkg, "lib"), { recursive: true });
	writeFileSync(
		join(pkg, "package.json"),
		JSON.stringify({ name: "workerd", main: "lib/main.js" }),
	);
	writeFileSync(join(pkg, "lib", "main.js"), `module.exports = { compatibilityDate: "${date}" };`);
}

/** Runs the check step in `dir` as Actions would, with bash -e. */
function runCheck(dir: string) {
	const output = join(dir, "github-output");
	writeFileSync(output, "");
	const result = spawnSync("bash", ["-e", "-c", runBlock(checkStep)], {
		cwd: dir,
		env: { ...process.env, GITHUB_OUTPUT: output },
		encoding: "utf8",
	});
	const dateIn = (file: string) => readFileSync(join(dir, file), "utf8").match(DATE)?.[2] ?? "";
	return {
		status: result.status,
		stderr: result.stderr,
		output: readFileSync(output, "utf8"),
		wrangler: dateIn("wrangler.jsonc"),
		readme: dateIn("README.md"),
	};
}

afterEach(() => {
	for (const dir of checkouts.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("compat-date workflow", () => {
	// The bot bumped to today, and today is past what the installed runtime
	// supports: workerd refused to start and the job's own test step failed,
	// every Tuesday from 2026-11-03.
	it("bumps a stale date no further than every local runtime supports", () => {
		const dir = checkoutAt(STALE);
		symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"));

		const run = runCheck(dir);

		expect(run.status, run.stderr).toBe(0);
		expect(run.output).toMatch(/^bump=true$/m);
		expect(run.wrangler > STALE).toBe(true);
		expect(run.readme).toBe(run.wrangler);
		for (const [tool, supported] of Object.entries(launchedRuntimeDates())) {
			expect(
				run.wrangler <= supported,
				`bumped to ${run.wrangler}; ${tool}'s workerd supports up to ${supported}`,
			).toBe(true);
		}
	});

	// Nothing newer is available until wrangler moves, and a red scheduled run
	// is the signal that says so; a pull request would change nothing.
	it("fails without editing anything when the installed workerd supports nothing newer", () => {
		const dir = checkoutAt(STALE);
		installFakeWorkerd(dir, STALE);

		const run = runCheck(dir);

		expect(run.status).not.toBe(0);
		expect(run.stderr).toMatch(`supports up to ${STALE}`);
		expect(run.stderr).toMatch(/Update wrangler/);
		expect(run.output).not.toMatch(/^bump=true$/m);
		expect(run.wrangler).toBe(STALE);
		expect(run.readme).toBe(STALE);
	});

	// No installed runtime must never read as "no limit".
	it("fails without editing anything when no workerd is installed", () => {
		const dir = checkoutAt(STALE);

		const run = runCheck(dir);

		expect(run.status).not.toBe(0);
		expect(run.stderr).toMatch(/No installed workerd/);
		expect(run.output).not.toMatch(/^bump=true$/m);
		expect(run.wrangler).toBe(STALE);
	});

	// The check reads the installed workerd, so in a fresh CI checkout it needs
	// node_modules before it runs, whether or not it ends up bumping.
	it("installs dependencies before the check, on every run", () => {
		const install = steps.findIndex((step) => /run:\s*pnpm install --frozen-lockfile/.test(step));
		const check = steps.indexOf(checkStep);
		expect(install).toBeGreaterThanOrEqual(0);
		expect(install).toBeLessThan(check);
		expect(steps[install]).not.toMatch(/^\s*if:/m);
	});
});
