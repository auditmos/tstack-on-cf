import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

function read(file: string): string {
	return readFileSync(resolve(ROOT, file), "utf8");
}

// Two readers, two files: package managers and CI actions read the manifest,
// version switchers read `.node-version`. Pinning one leaves the other floating
// on whatever alias the machine resolves, which is how a cloner ends up
// debugging a runtime difference that is not their code.
describe("Node version pin", () => {
	const pkg = JSON.parse(read("package.json")) as { engines?: { node?: string } };

	it("declares an engine constraint in the manifest", () => {
		expect(pkg.engines?.node).toBeDefined();
	});

	it("ships a version file", () => {
		expect(existsSync(resolve(ROOT, ".node-version"))).toBe(true);
	});

	it("names the same version in both", () => {
		expect(pkg.engines?.node).toContain(read(".node-version").trim());
	});
});

// The file exists only because `allowBuilds` has to live in it. Uncommented, a
// pnpm workspace file is a strong signal that this is a monorepo — and someone
// who believes that structures their project around packages that do not exist.
describe("pnpm-workspace.yaml", () => {
	const workspace = read("pnpm-workspace.yaml");
	const comments = workspace
		.split("\n")
		.filter((line) => line.trimStart().startsWith("#"))
		.join("\n");

	it("declares no packages", () => {
		expect(workspace).not.toMatch(/^packages:/m);
	});

	it("explains in a comment that this is not a monorepo", () => {
		expect(comments).toMatch(/monorepo/i);
	});

	it("explains in a comment what the file is actually for", () => {
		expect(comments).toMatch(/allowBuilds/);
	});
});

// Biome's `useImportType` already fails a build over an import that should have
// been type-only. Leaving the compiler option off makes the compiler the lenient
// one of the pair, so the rule holds only as long as the linter runs.
describe("tsconfig.json", () => {
	const tsconfig = JSON.parse(
		read("tsconfig.json")
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/\/\/.*/g, ""),
	) as { compilerOptions?: { verbatimModuleSyntax?: boolean } };

	it("enforces type-only imports in the compiler too", () => {
		expect(tsconfig.compilerOptions?.verbatimModuleSyntax).toBe(true);
	});
});
