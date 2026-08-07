import { buildReport } from "./major-upgrades-report";

const packageJson = {
	packageManager: "pnpm@10.34.5",
	dependencies: { hono: "^4.12.34" },
	devDependencies: { vite: "7.1.2", typescript: "^5.9.3" },
};

const dep = (name: string, diff: string | null, source = "devDependencies") => ({
	name,
	source,
	currentVersion: "^1.0.0",
	targetVersion: "^2.0.0",
	diff,
	currentVersionTime: "2024-01-02T00:00:00.000Z",
	targetVersionTime: "2026-03-04T00:00:00.000Z",
});

const taze = (...resolved: ReturnType<typeof dep>[]) => ({ packages: [{ resolved }] });

describe("buildReport", () => {
	it("reports only major upgrades", () => {
		const report = buildReport({
			taze: taze(
				dep("vite", "major"),
				dep("typescript", "minor"),
				dep("hono", "patch", "dependencies"),
				dep("pnpm", "major", "packageManager"),
			),
			packageJson,
		});

		expect(report.majorCount).toBe(2);
		expect(report.markdown).toContain("vite");
		expect(report.markdown).toContain("pnpm");
		expect(report.markdown).not.toMatch(/\| `typescript` \|/);
	});

	it("says so plainly when nothing is pending", () => {
		const report = buildReport({
			taze: taze(dep("vite", "patch"), dep("typescript", null), dep("hono", null, "dependencies")),
			packageJson,
		});

		expect(report.majorCount).toBe(0);
		expect(report.markdown).toMatch(/No major upgrades/i);
	});

	// The failure that makes the whole cadence untrustworthy: taze drops packages
	// it could not resolve, so a report can say "nothing pending" while quietly
	// having skipped the one dependency that was three majors behind.
	it("names declared dependencies the scan never reported on", () => {
		const report = buildReport({
			taze: taze(dep("vite", "major")),
			packageJson,
		});

		expect(report.unchecked).toEqual(["hono", "pnpm", "typescript"]);
		expect(report.markdown).toMatch(/not checked/i);
		expect(report.markdown).toContain("typescript");
	});

	it("reports nothing unchecked when every declared dependency was scanned", () => {
		const report = buildReport({
			taze: taze(
				dep("vite", "major"),
				dep("typescript", "patch"),
				dep("hono", null, "dependencies"),
				dep("pnpm", "minor", "packageManager"),
			),
			packageJson,
		});

		expect(report.unchecked).toEqual([]);
		expect(report.markdown).not.toMatch(/not checked/i);
	});

	it("carries a marker identifying what owns the issue body", () => {
		const report = buildReport({ taze: taze(dep("vite", "major")), packageJson });

		expect(report.markdown).toContain(".github/workflows/major-upgrades.yml");
	});
});
