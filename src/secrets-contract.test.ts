import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const WORKFLOW_DIR = resolve(ROOT, ".github", "workflows");

/**
 * The template for `.dev.vars`, named the way Cloudflare's own tooling expects:
 * `<real file>.example`, the same shape as `.env.example`. Deploy-to-Cloudflare
 * reads this name to prompt for a Worker's secrets, so the convention buys
 * something concrete beyond consistency.
 */
const EXAMPLE_VARS = ".dev.vars.example";

type SecretsBlock = { required?: string[] };
type EnvBlock = { secrets?: SecretsBlock; vars?: Record<string, string> };
type WranglerConfig = EnvBlock & { env?: Record<string, EnvBlock> };

function loadWranglerConfig(): WranglerConfig {
	const raw = readFileSync(resolve(ROOT, "wrangler.jsonc"), "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*/g, "");
	return JSON.parse(raw) as WranglerConfig;
}

/** Keys of a dotenv-style file, ignoring comments and blank lines. */
function loadEnvKeys(file: string): string[] {
	return readFileSync(resolve(ROOT, file), "utf8")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"))
		.map((line) => line.split("=")[0]?.trim() ?? "")
		.filter((key) => key.length > 0);
}

describe("secrets contract", () => {
	const config = loadWranglerConfig();
	const exampleKeys = loadEnvKeys(EXAMPLE_VARS);

	it("declares required secret names in wrangler.jsonc", () => {
		expect(config.secrets?.required).toBeDefined();
		expect(config.secrets?.required?.length).toBeGreaterThan(0);
	});

	it("declares every required secret in the example vars template", () => {
		for (const secret of config.secrets?.required ?? []) {
			expect(exampleKeys).toContain(secret);
		}
	});

	// `secrets` is not inherited from the top level, so a missing env block means
	// that environment silently falls back to no declared secrets.
	it.each(["staging", "production"])("repeats the same required secrets in env.%s", (env) => {
		expect(config.env?.[env]?.secrets?.required).toEqual(config.secrets?.required);
	});

	it("backs every key in the example vars template with a declared secret or var", () => {
		const declared = new Set([
			...(config.secrets?.required ?? []),
			...Object.keys(config.vars ?? {}),
		]);
		for (const key of exampleKeys) {
			expect([...declared]).toContain(key);
		}
	});
});

// Declared secrets make `wrangler types` independent of any gitignored file, so
// the workarounds that existed only because typegen read .dev.vars must be gone.
describe("workflows carry no typegen workarounds", () => {
	const workflows = readdirSync(WORKFLOW_DIR)
		.filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
		.map((f) => [f, readFileSync(resolve(WORKFLOW_DIR, f), "utf8")] as const);

	it("finds workflows to check", () => {
		expect(workflows.length).toBeGreaterThan(0);
	});

	it.each(workflows)("%s does not disable git hooks", (_name, body) => {
		expect(body).not.toMatch(/SKIP_SIMPLE_GIT_HOOKS/);
	});

	it("compat-date workflow regenerates types instead of skipping typegen", () => {
		// Must be an executed `run:` step. The old workaround mentioned cf-typegen
		// in both a comment and the PR body, either of which a loose match accepts.
		const runSteps = readFileSync(resolve(WORKFLOW_DIR, "compat-date.yml"), "utf8")
			.split("\n")
			.filter((line) => /^\s*run:\s/.test(line));
		expect(runSteps.some((line) => /pnpm (run )?cf-typegen/.test(line))).toBe(true);
	});
});
