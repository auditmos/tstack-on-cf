import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");

function stripJsonc(raw: string): string {
	return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
}

/** The first fenced jsonc block following the given heading text. */
function fencedJsoncAfter(heading: string): Record<string, unknown> {
	const section = readme.slice(readme.indexOf(heading));
	const block = section.match(/```jsonc\n([\s\S]*?)```/)?.[1];
	if (!block) throw new Error(`no jsonc block after heading: ${heading}`);
	return JSON.parse(stripJsonc(block)) as Record<string, unknown>;
}

describe("README wrangler.jsonc snippet", () => {
	const documented = fencedJsoncAfter("### `wrangler.jsonc`");
	const actual = JSON.parse(
		stripJsonc(readFileSync(resolve(ROOT, "wrangler.jsonc"), "utf8")),
	) as Record<string, unknown>;

	// The snippet is an excerpt, so it may omit keys — but every key it does
	// show has to match the real file. Omission is fine; drift is not.
	it.each(Object.keys(documented))("documents %s with the configured value", (key) => {
		expect(actual[key]).toBeDefined();
		expect(documented[key]).toEqual(actual[key]);
	});
});

describe("README licence claim", () => {
	// The README links `LICENSE` and names the terms. Both halves have to be real:
	// a link to nothing, or a file under other terms, is the same broken promise.
	const link = readme.match(/\[([^\]]*License[^\]]*)\]\(([^)]+)\)/i);

	it("links a licence file and names the terms", () => {
		expect(link).not.toBeNull();
	});

	it("links a file that exists", () => {
		const target = link?.[2] ?? "";
		expect(existsSync(resolve(ROOT, target))).toBe(true);
	});

	it("links a file granting the terms the README claims", () => {
		const claimed = link?.[1] ?? "";
		const body = readFileSync(resolve(ROOT, link?.[2] ?? ""), "utf8");
		const licence = claimed.replace(/\s*Licen[cs]e\s*/i, "").trim();
		expect(body).toContain(`${licence} License`);
	});
});

// The snippet invariant only holds if whatever edits wrangler.jsonc also edits
// the README. The compat-date bot rewrites compatibility_date, so without this
// it would open a pull request that fails the very test above.
describe("compat-date bot keeps the README snippet in step", () => {
	const workflow = readFileSync(resolve(ROOT, ".github", "workflows", "compat-date.yml"), "utf8");

	it("rewrites README.md alongside wrangler.jsonc", () => {
		expect(workflow).toMatch(/README\.md/);
	});
});

/** Environments that have a drizzle config, and where each writes migrations. */
function configuredEnvironments(): { env: string; out: string }[] {
	return readdirSync(ROOT)
		.filter((f) => /^drizzle-.+\.config\.ts$/.test(f))
		.map((f) => {
			const env = f.replace(/^drizzle-|\.config\.ts$/g, "");
			const out = readFileSync(resolve(ROOT, f), "utf8").match(/out:\s*"\.\/([^"]+)"/)?.[1];
			if (!out) throw new Error(`${f} declares no out directory`);
			return { env, out };
		})
		.sort((a, b) => a.env.localeCompare(b.env));
}

/** Rows of the README's migration-directory table, keyed by environment. */
function documentedMigrationDirs(): Map<string, { dir: string; status: string }> {
	const section = readme.slice(readme.indexOf("#### Migration directories"));
	const rows = new Map<string, { dir: string; status: string }>();
	for (const line of section.split("\n")) {
		if (!line.startsWith("|")) {
			if (rows.size > 0) break; // table ended
			continue;
		}
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((c) => c.trim());
		const [env, dir, status] = cells;
		if (!env || !dir || !status) continue;
		if (env === "Environment" || /^-+$/.test(env)) continue;
		rows.set(env.replace(/`/g, ""), { dir: dir.replace(/`/g, ""), status });
	}
	return rows;
}

/** A migration directory only really exists once it holds a migration. */
function hasMigrations(dir: string): boolean {
	const path = resolve(ROOT, dir);
	return existsSync(path) && readdirSync(path).some((f) => f.endsWith(".sql"));
}

describe("README migration directories", () => {
	const configured = configuredEnvironments();
	const documented = documentedMigrationDirs();

	it.each(configured)("documents the $env migration directory", ({ env, out }) => {
		expect(documented.get(env)?.dir).toBe(out);
	});

	it("documents no environment that has no drizzle config", () => {
		expect([...documented.keys()].sort()).toEqual(configured.map((c) => c.env));
	});

	// The point of the table: a directory that is not in the repository yet must
	// say so, and say what creates it, rather than being listed as if it shipped.
	it.each(configured)("states the real status of the $env directory", ({ env, out }) => {
		const status = documented.get(env)?.status ?? "";
		if (hasMigrations(out)) {
			expect(status).toMatch(/^In the repository$/);
		} else {
			expect(status).toMatch(new RegExp(`Created by \`pnpm db:generate:${env}\``));
		}
	});
});
