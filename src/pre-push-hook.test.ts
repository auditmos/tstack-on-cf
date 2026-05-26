import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pre-push hook", () => {
	const pkg = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf8")) as {
		"simple-git-hooks"?: { "pre-push"?: string };
	};

	it("runs cf-typegen before push (catches binding drift)", () => {
		expect(pkg["simple-git-hooks"]?.["pre-push"]).toContain("cf-typegen");
	});

	it("still runs types + knip", () => {
		const hook = pkg["simple-git-hooks"]?.["pre-push"] ?? "";
		expect(hook).toContain("types");
		expect(hook).toContain("knip");
	});
});
