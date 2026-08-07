import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** One dependency as `taze --json` resolved it. `diff` is null when it is current. */
interface TazeDependency {
	name: string;
	source: string;
	currentVersion: string;
	targetVersion: string;
	diff: string | null;
	currentVersionTime?: string;
	targetVersionTime?: string;
}

interface TazeReport {
	packages: { resolved?: TazeDependency[] }[];
}

interface PackageJson {
	packageManager?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

interface MajorUpgradeReport {
	/** The issue body. */
	markdown: string;
	majorCount: number;
	/** Declared dependencies absent from the scan entirely. */
	unchecked: string[];
}

const MARKER = "<!-- managed by .github/workflows/major-upgrades.yml -->";

/** Every dependency name the repository declares, including the package manager. */
function declaredNames(pkg: PackageJson): string[] {
	const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
	const manager = pkg.packageManager?.split("@")[0];
	if (manager) names.push(manager);
	return names;
}

const day = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "—");

export function buildReport(input: {
	taze: TazeReport;
	packageJson: PackageJson;
	runUrl?: string;
}): MajorUpgradeReport {
	const scanned = input.taze.packages.flatMap((pkg) => pkg.resolved ?? []);
	const majors = scanned
		.filter((dep) => dep.diff === "major")
		.sort((a, b) => a.name.localeCompare(b.name));

	// taze omits a dependency it could not resolve rather than reporting the
	// failure, so an empty report is indistinguishable from a failed one unless
	// we check what came back against what we declared.
	const seen = new Set(scanned.map((dep) => dep.name));
	const unchecked = declaredNames(input.packageJson)
		.filter((name) => !seen.has(name))
		.sort();

	const lines = [
		MARKER,
		"",
		majors.length === 0
			? "No major upgrades are available."
			: `${majors.length} major upgrade${majors.length === 1 ? " is" : "s are"} available.`,
		"",
	];

	if (majors.length > 0) {
		lines.push(
			"| Package | Where | Current | Latest | Current released | Latest released |",
			"| --- | --- | --- | --- | --- | --- |",
			...majors.map(
				(dep) =>
					`| \`${dep.name}\` | ${dep.source} | \`${dep.currentVersion}\` | \`${dep.targetVersion}\` | ${day(dep.currentVersionTime)} | ${day(dep.targetVersionTime)} |`,
			),
			"",
		);
	}

	if (unchecked.length > 0) {
		lines.push(
			`### ⚠️ ${unchecked.length} dependenc${unchecked.length === 1 ? "y was" : "ies were"} not checked`,
			"",
			"The scan returned nothing for these, so this report says nothing about them —",
			"treat the list above as incomplete until the next run covers them.",
			"",
			...unchecked.map((name) => `- \`${name}\``),
			"",
		);
	}

	lines.push(
		"---",
		"",
		"This issue is rewritten in place on the 1st of each month. It reports only —",
		"it opens no pull requests and changes no versions. Take the majors worth taking",
		"one at a time, with the `deps` scripts in `package.json`, and let CI judge each.",
	);

	if (input.runUrl) lines.push("", `Produced by [this run](${input.runUrl}).`);

	return { markdown: `${lines.join("\n")}\n`, majorCount: majors.length, unchecked };
}

function main(): void {
	const report = buildReport({
		taze: JSON.parse(readFileSync("majors.json", "utf8")) as TazeReport,
		packageJson: JSON.parse(readFileSync("package.json", "utf8")) as PackageJson,
		runUrl: process.env.GITHUB_RUN_ID
			? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
			: undefined,
	});

	writeFileSync("report.md", report.markdown);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `count=${report.majorCount}\n`);
	}

	console.log(`${report.majorCount} major upgrade(s) available`);
	if (report.unchecked.length > 0) {
		console.warn(`WARNING: not checked: ${report.unchecked.join(", ")}`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
