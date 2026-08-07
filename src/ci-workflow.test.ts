import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CI_WORKFLOW = resolve(__dirname, "..", ".github", "workflows", "ci.yml");

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
});

// peter-evans/create-pull-request pushes with GITHUB_TOKEN, and GitHub does not
// start `pull_request` runs for events that token created. workflow_dispatch is
// an explicit exception, so each bot workflow asks CI to run on its own branch.
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
