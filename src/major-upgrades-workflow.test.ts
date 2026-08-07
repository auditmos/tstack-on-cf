import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const WORKFLOW = resolve(__dirname, "..", ".github", "workflows", "major-upgrades.yml");
const body = existsSync(WORKFLOW) ? readFileSync(WORKFLOW, "utf8") : "";
/** The same text with shell line-continuations collapsed, so one command reads as one line. */
const commands = body.replace(/\\\n\s*/g, " ");

describe("major-upgrades workflow", () => {
	it("exists", () => {
		expect(existsSync(WORKFLOW)).toBe(true);
	});

	// Monthly, not weekly: majors have to stay distinguishable from the noise of
	// the weekly minor-bump job, and not quarterly, so one is never invisible for
	// longer than a month.
	it("runs monthly", () => {
		const cron = body.match(/cron:\s*"([^"]+)"/)?.[1] ?? "";
		const [, , dayOfMonth, month, dayOfWeek] = cron.split(/\s+/);
		expect(dayOfMonth).toMatch(/^\d+$/);
		expect(month).toBe("*");
		expect(dayOfWeek).toBe("*");
	});

	it("is manually triggerable, so it can be verified without waiting a month", () => {
		expect(body).toMatch(/^\s*workflow_dispatch:/m);
	});

	it("can write issues", () => {
		expect(body).toMatch(/^\s*issues:\s*write/m);
	});

	// Reporting only. Acting on what it finds is separate work, and a job that
	// quietly bumped a major would be the opposite of a tracking issue.
	it("opens no pull requests", () => {
		expect(body).not.toMatch(/create-pull-request/);
		expect(body).not.toMatch(/gh pr create/);
	});

	it("writes no dependency versions", () => {
		expect(body).not.toMatch(/deps:update|deps:major:update/);
		expect(body).not.toMatch(/taze[^\n]*(\s-w\b|\s--write\b)/);
	});

	// vite and biome are pinned exactly, and taze skips locked ranges unless
	// asked — without this the report silently omits the most stale dependency
	// in the repository.
	it("includes exact-pinned dependencies in the scan", () => {
		expect(body).toMatch(/taze[^\n]*(\s-l\b|\s--include-locked\b)/);
	});
});

describe("major-upgrades tracking issue", () => {
	it("looks for an existing issue before creating one", () => {
		expect(body).toMatch(/gh issue list/);
	});

	it("updates the existing issue in place", () => {
		expect(body).toMatch(/gh issue edit/);
	});

	// Both halves are needed: finding an issue but still calling create would
	// duplicate, and creating unconditionally would duplicate every month.
	it("creates an issue only when none was found", () => {
		const create = body.indexOf("gh issue create");
		const edit = body.indexOf("gh issue edit");
		expect(create).toBeGreaterThan(-1);
		expect(edit).toBeGreaterThan(-1);
		expect(body).toMatch(/if\s+\[\s+-n\s+"?\$\{?existing/);
	});

	it("identifies the issue by a fixed label rather than a title guess", () => {
		expect(commands).toMatch(/gh issue list[^\n]*--label/);
		expect(commands).toMatch(/gh label create/);
	});
});
