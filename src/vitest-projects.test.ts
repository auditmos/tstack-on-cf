import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import config from "../vitest.config";

type InlineProject = {
	plugins?: { name?: string }[];
	test?: { name?: string; include?: string[]; exclude?: string[]; environment?: string };
};

const ROOT = resolve(__dirname, "..");

// `projects` is typed as a union that includes bare glob strings, which erases
// the narrowing `filter` would otherwise give us.
const declared: unknown[] = config.test?.projects ?? [];
const projects = declared.filter((p): p is InlineProject => typeof p === "object" && p !== null);

describe("vitest projects", () => {
	it("splits the suite across more than one project", () => {
		expect(projects.length).toBeGreaterThan(1);
	});

	// The Workers project is the whole point: without the pool, tests run in Node
	// and the runtime the Worker actually ships to is never exercised.
	it("runs one project inside the Workers runtime", () => {
		const workers = projects.find((p) => p.test?.name === "workers");
		expect(workers).toBeDefined();
		expect(
			workers?.plugins?.some((plugin) => plugin?.name === "@cloudflare/vitest-pool-workers"),
		).toBe(true);
	});

	// Component tests need a DOM, and the runtime that ships the Worker does not
	// have one. Without this project the installed testing libraries are decoration.
	it("runs one project under a DOM", () => {
		const components = projects.find((p) => p.test?.name === "components");
		expect(components?.test?.environment).toBe("jsdom");
		expect(components?.test?.include).toContain("src/**/*.test.tsx");
	});

	it.each(
		projects.map((p) => p.test?.name ?? ""),
	)("excludes route files from the %s project", (name) => {
		const project = projects.find((p) => p.test?.name === name);
		expect(project?.test?.exclude).toContain("src/routes/**");
	});

	// Worker tests would otherwise be collected twice — once in workerd and once
	// in Node, where `cloudflare:test` does not resolve. Component tests likewise:
	// in Node there is no document to render into.
	it("claims each test file for exactly one project", () => {
		const node = projects.find((p) => p.test?.name === "node");
		expect(node?.test?.exclude).toContain("src/**/*.worker.test.ts");
		expect(node?.test?.include).not.toContain("src/**/*.test.tsx");
	});
});

// A second command is a command someone forgets to run. Whatever projects exist,
// the one documented entry point has to run all of them.
describe("test command", () => {
	const scripts = (
		JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
			scripts: Record<string, string>;
		}
	).scripts;

	it("runs the whole suite from `pnpm test`", () => {
		expect(scripts.test).toBe("vitest run");
	});

	it("adds no per-project test command", () => {
		const perProject = Object.entries(scripts).filter(
			([name, body]) => name.startsWith("test") && /--project/.test(body),
		);
		expect(perProject).toEqual([]);
	});
});
