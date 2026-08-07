import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");

const section = readme.split(/\n(?=#{1,6}\s)/).find((s) => /^#{1,6}\s+Security posture\b/.test(s));

describe("README security posture section", () => {
	it("documents a 'Security posture' section", () => {
		expect(section).toBeDefined();
	});

	// The demo API is public unauthenticated create-read-update-delete. That is
	// acceptable for a template only while it is stated loudly enough that nobody
	// deploys it without noticing.
	it("states the demo API is intentionally unauthenticated and must not ship as-is", () => {
		expect(section).toMatch(/unauthenticated/i);
		expect(section).toMatch(/must not ship as-is/i);
	});

	// A pointer at the seam is only useful while it resolves. A file that no
	// longer holds the attachment point is a worse lie than no pointer at all.
	it("names the file where authentication attaches, and that file holds the seam", () => {
		const named = section?.match(/`(src\/[^`]+\.ts)`/)?.[1] ?? "";
		expect(named).not.toBe("");
		expect(existsSync(resolve(ROOT, named))).toBe(true);

		const source = readFileSync(resolve(ROOT, named), "utf8");
		expect(source).toContain("createHono");
		expect(source).toContain("ApiMiddleware");
	});

	it("tells a cloner what to do before deploying", () => {
		expect(section).toMatch(/before (you )?deploy/i);
		const steps = (section ?? "").split("\n").filter((l) => /^\s*(-|\d+\.)\s/.test(l));
		expect(steps.length).toBeGreaterThanOrEqual(2);
	});
});
