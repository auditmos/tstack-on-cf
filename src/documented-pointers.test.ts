import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

/** Files whose claims a cloner — or an agent — is expected to act on. */
const DOCUMENTS = ["README.md", "AGENTS.md"] as const;

/**
 * Prose only.
 *
 * Fenced blocks are examples: the paths in them belong to the snippet, not to
 * this repository. Table rows document *status* — the migration table says in
 * so many words which directories do not exist yet — and each such table
 * already carries its own invariant in `readme-truth.test.ts`. What is left is
 * prose, where naming a path asserts that it is there.
 */
function prose(markdown: string): string {
	return markdown
		.replace(/```[\s\S]*?```/g, "")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("|"))
		.join("\n");
}

/**
 * Inline code spans that name a path in this repository.
 *
 * Excluded, in order: commands and prose fragments (whitespace), globs and
 * placeholders (`src/routes/**`, `drizzle-{env}.config.ts`) which describe a
 * shape rather than a file, URL routes (`/api/clients`) whose leading slash
 * makes them request paths rather than repository paths, npm package names
 * (`@dotenvx/dotenvx`), and identifier lists (`DATABASE_HOST/USERNAME/PASSWORD`)
 * which borrow the slash as a separator.
 */
function codeSpanPointers(text: string): string[] {
	return [...text.matchAll(/`([^`\n]+)`/g)]
		.map((match) => match[1] ?? "")
		.filter((token) => token.includes("/"))
		.filter((token) => !/\s/.test(token))
		.filter((token) => !/[*{}<>]/.test(token))
		.filter((token) => !token.startsWith("/"))
		.filter((token) => !token.startsWith("@"))
		.filter((token) => !/^[A-Z0-9_/]+$/.test(token));
}

/** Markdown links to somewhere in this repository — not the web, not an anchor. */
function linkPointers(text: string): string[] {
	return [...text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)]
		.map((match) => match[1] ?? "")
		.filter((target) => !/^[a-z]+:/i.test(target))
		.filter((target) => !target.startsWith("#"));
}

function pointersIn(document: string): string[] {
	const text = prose(readFileSync(resolve(ROOT, document), "utf8"));
	return [...new Set([...linkPointers(text), ...codeSpanPointers(text)])].sort();
}

// A pointer that resolves to nothing costs a human a raised eyebrow and an
// agent a fabricated answer — this template courts the second audience, so the
// dead pointer is a build failure rather than a documentation nit.
describe.each(DOCUMENTS)("%s documented pointers", (document) => {
	const pointers = pointersIn(document);

	it("names at least one path in this repository", () => {
		expect(pointers.length).toBeGreaterThan(0);
	});

	it.each(pointers)("resolves %s", (pointer) => {
		expect(existsSync(resolve(ROOT, pointer))).toBe(true);
	});
});
