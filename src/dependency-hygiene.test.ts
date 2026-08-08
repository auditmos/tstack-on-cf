import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const knip = readFileSync(resolve(ROOT, "knip.jsonc"), "utf8");

/**
 * Entries of a JSONC array literal, each carrying the comment lines written
 * above it.
 *
 * The config is JSONC — the `.jsonc` extension is what lets a justification
 * live beside the thing it justifies, rather than in a document nobody opens
 * when they add the next entry.
 */
function justifiedEntries(key: string): { entry: string; justification: string }[] {
	const start = knip.indexOf(`"${key}"`);
	if (start === -1) return [];
	const open = knip.indexOf("[", start);
	const body = knip.slice(open + 1, knip.indexOf("]", open));

	const entries: { entry: string; justification: string }[] = [];
	let comment: string[] = [];
	for (const line of body.split("\n")) {
		const text = line.trim();
		if (text.startsWith("//")) {
			comment.push(text.replace(/^\/\/\s*/, ""));
			continue;
		}
		for (const match of text.matchAll(/"([^"]+)"/g)) {
			entries.push({ entry: match[1] ?? "", justification: comment.join(" ") });
			comment = [];
		}
	}
	return entries;
}

function manifestPackages(): string[] {
	const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
}

// An unused-code check that excludes the parts of the codebase most likely to
// accumulate unused code reports a pass it has not earned. The vendored
// primitives are the one honest exclusion: Shadcn writes them, nobody here
// authors them, and a cloner adds more with a single command.
describe("knip file exclusions", () => {
	const ignored = justifiedEntries("ignore");

	it("excludes only the generated UI primitives", () => {
		expect(ignored.map((e) => e.entry)).toEqual(["src/components/ui/**"]);
	});

	it("keeps the database module under analysis", () => {
		expect(ignored.map((e) => e.entry)).not.toContain("src/db/**");
	});

	it("keeps the error-handling module under analysis", () => {
		expect(ignored.map((e) => e.entry)).not.toContain("src/core/errors.ts");
	});

	it.each(ignored)("justifies $entry in writing", ({ justification }) => {
		expect(justification.length).toBeGreaterThan(30);
	});
});

// The manifest is the list of things a cloner installs and therefore pays for.
// Every entry has to be reachable from code, and knip is what proves it — so
// hiding a manifest package from knip is the one move that makes the proof
// worthless. Whatever survives here is a specifier knip misreads as a package,
// never a package the manifest declares.
describe("knip dependency exclusions", () => {
	const ignored = justifiedEntries("ignoreDependencies");

	it.each(ignored)("hides no manifest package: $entry", ({ entry }) => {
		expect(manifestPackages()).not.toContain(entry);
	});

	it.each(ignored)("justifies $entry in writing", ({ justification }) => {
		expect(justification.length).toBeGreaterThan(30);
	});
});
