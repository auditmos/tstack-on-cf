import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CI_WORKFLOW = resolve(__dirname, "..", ".github", "workflows", "ci.yml");

/** The workflow's single-line `run:` commands, in the order the job runs them. */
function runCommands(file: string): string[] {
	return readFileSync(file, "utf8")
		.split("\n")
		.map((line) => line.match(/^\s*run:\s+(.+?)\s*$/)?.[1])
		.filter((command): command is string => command !== undefined);
}

describe("CI workflow", () => {
	it("exists", () => {
		expect(existsSync(CI_WORKFLOW)).toBe(true);
	});

	it("triggers on pull requests and on pushes to the default branch", () => {
		const body = readFileSync(CI_WORKFLOW, "utf8");
		expect(body).toMatch(/^\s*pull_request:/m);
		expect(body).toMatch(/^\s*push:/m);
		expect(body).toMatch(/branches:\s*\[\s*main\s*\]/);
	});

	// The gate is only as good as what it runs. Each of these is a distinct
	// failure class a change can introduce.
	it.each(["lint:ci", "types", "test", "knip", "build"])("runs pnpm %s", (script) => {
		const runSteps = readFileSync(CI_WORKFLOW, "utf8")
			.split("\n")
			.filter((line) => /^\s*run:\s/.test(line));
		expect(runSteps).toContainEqual(expect.stringMatching(`pnpm run ${script}\\s*$`));
	});

	it("pins an exact Node version rather than a moving alias", () => {
		const body = readFileSync(CI_WORKFLOW, "utf8");
		const declared = body.match(/^\s*node-version:\s*(\S+)/m)?.[1];
		expect(declared).toBeDefined();
		expect(declared).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("is dispatchable, so a run can be requested for a branch", () => {
		expect(readFileSync(CI_WORKFLOW, "utf8")).toMatch(/^\s*workflow_dispatch:/m);
	});

	// pnpm only warns about an unmet peer, and it skips the peer check entirely
	// when it installs from an existing lockfile, so #40 installed cleanly and
	// only broke at build. Checking right after install names the peer instead.
	it("checks peer dependencies after install and before the build", () => {
		const commands = runCommands(CI_WORKFLOW);
		const install = commands.indexOf("pnpm install --frozen-lockfile");
		const peers = commands.indexOf("pnpm peers check");
		expect(install).toBeGreaterThanOrEqual(0);
		expect(peers).toBeGreaterThan(install);
		expect(peers).toBeLessThan(commands.indexOf("pnpm run build"));
	});

	// The pre-push hook regenerates worker-configuration.d.ts but cannot stop
	// a push that leaves it stale, and every later step checks against the
	// committed file. Regenerating and diffing is the only way CI can tell.
	it("fails when the committed worker types differ from a fresh typegen, before linting", () => {
		const commands = runCommands(CI_WORKFLOW);
		const drift = commands.findIndex(
			(command) =>
				command.includes("pnpm run cf-typegen") &&
				command.includes("git diff --exit-code worker-configuration.d.ts"),
		);
		expect(drift).toBeGreaterThan(commands.indexOf("pnpm install --frozen-lockfile"));
		expect(drift).toBeLessThan(commands.indexOf("pnpm run lint:ci"));
	});
});

// peter-evans/create-pull-request pushes with GITHUB_TOKEN. GitHub creates the
// `pull_request` run for such a PR but parks it in `action_required` pending a
// human approval. workflow_dispatch is an explicit exception to that gate, so
// each bot workflow asks CI to run on its own branch and the checks execute
// without anyone clicking approve.
describe("bot pull requests get the same checks", () => {
	const BOT_WORKFLOWS = [
		["deps-update.yml", "chore/deps-update"],
		["compat-date.yml", "chore/compat-date-bump"],
	] as const;

	it.each(BOT_WORKFLOWS)("%s dispatches CI on %s", (file, branch) => {
		const body = readFileSync(resolve(__dirname, "..", ".github", "workflows", file), "utf8");
		expect(body).toMatch(new RegExp(`gh workflow run ci\\.yml --ref ${branch}`));
	});

	it.each(BOT_WORKFLOWS)("%s can write to the actions API", (file) => {
		const body = readFileSync(resolve(__dirname, "..", ".github", "workflows", file), "utf8");
		expect(body).toMatch(/^\s*actions:\s*write/m);
	});
});
