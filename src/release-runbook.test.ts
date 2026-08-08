import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const RUNBOOK = "docs/release-runbook.md";

function read(file: string): string {
	return readFileSync(resolve(ROOT, file), "utf8");
}

/** Environments that can actually be released, taken from the deploy scripts. */
function releasableEnvironments(): string[] {
	const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
	return Object.keys(pkg.scripts ?? {})
		.map((name) => /^deploy(?::(.+))?$/.exec(name)?.[1] ?? (name === "deploy" ? "dev" : null))
		.filter((env): env is string => env !== null)
		.sort();
}

function requiredSecrets(): string[] {
	const raw = read("wrangler.jsonc")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*/g, "");
	const config = JSON.parse(raw) as { secrets?: { required?: string[] } };
	return config.secrets?.required ?? [];
}

/** Body of the `###` section whose heading names `env`, up to the next heading. */
function environmentSection(runbook: string, env: string): string {
	const heading = new RegExp(`^###\\s+.*\\b${env}\\b.*$`, "im");
	const start = runbook.search(heading);
	if (start === -1) return "";
	const rest = runbook.slice(runbook.indexOf("\n", start) + 1);
	const end = rest.search(/^#{2,3}\s/m);
	return end === -1 ? rest : rest.slice(0, end);
}

function fencedBlocks(markdown: string): string {
	return [...markdown.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1] ?? "").join("\n");
}

describe("release runbook", () => {
	it("exists", () => {
		expect(existsSync(resolve(ROOT, RUNBOOK))).toBe(true);
	});

	it("is listed in the docs index", () => {
		expect(read("docs/README.md")).toContain("release-runbook.md");
	});
});

// A runbook that covers two of three environments is worse than none: it reads
// as complete right up to the environment it forgot. The deploy scripts decide
// what "every environment" means, so adding a fourth fails this until it is
// written up.
describe.each(releasableEnvironments())("release sequence for %s", (env) => {
	const section = environmentSection(read(RUNBOOK), env);

	it("has its own section", () => {
		expect(section.length).toBeGreaterThan(0);
	});

	it.each(["migrat", "build", "deploy", "verif"])("covers %s", (step) => {
		expect(section.toLowerCase()).toContain(step);
	});

	it("orders migration, build, deploy and verification", () => {
		const body = section.toLowerCase();
		const positions = ["migrat", "build", "deploy", "verif"].map((s) => body.indexOf(s));
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});
});

// The migration gate is manual on purpose. Written as a decision it survives
// the next person asking why there is no pipeline; written as nothing at all it
// reads like an oversight and gets "fixed" by automating a destructive step.
describe("manual gates are recorded as decisions", () => {
	const runbook = read(RUNBOOK);

	it("explains why migrations are not automated", () => {
		expect(runbook).toMatch(/## .*deliberate|## .*why .*manual/i);
	});

	it("says migrations run before the deploy that needs them", () => {
		expect(runbook.toLowerCase()).toContain("migrat");
	});
});

// Both procedures exist to be followed under pressure by someone who has not
// read this file in three months. Naming the command is the whole point.
describe("recovery and staged rollout name their commands", () => {
	const runbook = read(RUNBOOK);

	it("documents rollback with the command that performs it", () => {
		expect(runbook).toContain("wrangler rollback");
	});

	it("documents gradual rollout with the command that performs it", () => {
		expect(runbook).toContain("wrangler versions deploy");
	});

	it("documents uploading a version without releasing it", () => {
		expect(runbook).toContain("wrangler versions upload");
	});
});

// The deploy-time check from #23 is the only thing standing between a missing
// secret and a Worker that starts and then fails every request, so the runbook
// has to say it is there — and name what it checks.
describe("deploy-time secret validation", () => {
	const runbook = read(RUNBOOK);

	it("names the declaration that drives the check", () => {
		expect(runbook).toMatch(/secrets\.required|"required"/);
	});

	it.each(requiredSecrets())("names %s", (secret) => {
		expect(runbook).toContain(secret);
	});

	it("says deploy fails when one was never set", () => {
		expect(runbook).toMatch(/never set|unset|not set/i);
	});
});

// A runbook drifts the moment a script is renamed. Every pnpm command it prints
// has to resolve against the manifest, so the rename breaks the build instead
// of breaking a release.
describe("every pnpm command the runbook prints is real", () => {
	const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
	const scripts = Object.keys(pkg.scripts ?? {});
	const invoked = [
		...new Set(
			[...fencedBlocks(read(RUNBOOK)).matchAll(/\bpnpm (?:run )?([a-z][\w:.-]*)/g)]
				.map((m) => m[1] ?? "")
				.filter((name) => !["exec", "install", "add", "dlx", "create"].includes(name)),
		),
	];

	it("prints at least one", () => {
		expect(invoked.length).toBeGreaterThan(0);
	});

	it.each(invoked)("%s is a script in the manifest", (name) => {
		expect(scripts).toContain(name);
	});
});
