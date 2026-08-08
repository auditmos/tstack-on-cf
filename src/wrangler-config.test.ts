import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const WRANGLER = resolve(ROOT, "wrangler.jsonc");

/** The file as written, comments and all — what a cloner actually reads. */
const source = readFileSync(WRANGLER, "utf8");

function loadJsonc(path: string): Record<string, unknown> {
	const raw = readFileSync(path, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*/g, "");
	return JSON.parse(raw);
}

/** Deployed environments, as opposed to the top-level block that dev uses. */
const DEPLOYED_ENVS = ["staging", "production"] as const;

type EnvBlock = {
	name?: string;
	vars?: Record<string, string>;
	workers_dev?: boolean;
	preview_urls?: boolean;
	upload_source_maps?: boolean;
	routes?: unknown[];
};

describe("wrangler.jsonc", () => {
	const config = loadJsonc(WRANGLER) as EnvBlock & {
		compatibility_date?: string;
		placement?: unknown;
		observability?: {
			enabled?: boolean;
			logs?: { head_sampling_rate?: number };
			traces?: { enabled?: boolean; head_sampling_rate?: number };
		};
		env?: Record<string, EnvBlock | undefined>;
	};

	it("does not declare database credentials in vars (use secrets)", () => {
		expect(config.vars?.DATABASE_HOST).toBeUndefined();
		expect(config.vars?.DATABASE_USERNAME).toBeUndefined();
		expect(config.vars?.DATABASE_PASSWORD).toBeUndefined();
	});

	it("compatibility_date is within 90 days", () => {
		expect(config.compatibility_date).toBeDefined();
		const date = new Date(config.compatibility_date as string);
		const ageDays = (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
		expect(ageDays).toBeLessThan(90);
	});

	it("enables observability with sampling configured", () => {
		expect(config.observability?.enabled).toBe(true);
		expect(config.observability?.logs?.head_sampling_rate).toBeGreaterThan(0);
		expect(config.observability?.traces?.enabled).toBe(true);
	});

	it("declares env.staging and env.production with distinct worker names", () => {
		expect(config.env?.staging?.name).toBeDefined();
		expect(config.env?.production?.name).toBeDefined();
		expect(config.env?.staging?.name).not.toBe(config.name);
		expect(config.env?.production?.name).not.toBe(config.name);
		expect(config.env?.staging?.name).not.toBe(config.env?.production?.name);
	});

	it("scopes CLOUDFLARE_ENV per env block", () => {
		expect(config.env?.staging?.vars?.CLOUDFLARE_ENV).toBe("staging");
		expect(config.env?.production?.vars?.CLOUDFLARE_ENV).toBe("production");
	});

	// Observability without source maps buys logs full of minified frames: the
	// traces are collected and paid for, and point at output nobody can read.
	it("uploads source maps", () => {
		expect(config.upload_source_maps).toBe(true);
	});

	it.each(DEPLOYED_ENVS)("does not turn source maps off for %s", (env) => {
		expect(config.env?.[env]?.upload_source_maps).not.toBe(false);
	});

	// Reachability that is inherited from a platform default is reachability a
	// cloner learns about after deploying, which is the wrong time to learn it.
	it.each(DEPLOYED_ENVS)("states the public-URL posture of %s", (env) => {
		expect(typeof config.env?.[env]?.workers_dev).toBe("boolean");
	});

	it.each(DEPLOYED_ENVS)("states the preview-URL posture of %s", (env) => {
		expect(typeof config.env?.[env]?.preview_urls).toBe("boolean");
	});

	// The demo API is public unauthenticated CRUD, so production reachable at a
	// guessable workers.dev URL is the one default worth overriding outright.
	it("keeps production off the workers.dev subdomain", () => {
		expect(config.env?.production?.workers_dev).toBe(false);
		expect(config.env?.production?.preview_urls).toBe(false);
	});
});

describe("wrangler.jsonc routing placeholders", () => {
	const commented = source
		.split("\n")
		.filter((line) => line.trimStart().startsWith("//"))
		.join("\n");

	it("offers a custom-domain placeholder to fill in", () => {
		expect(commented).toMatch(/custom_domain/);
	});

	// `.claude/rules/cloudflare-deployment.md`: custom domains provision DNS and
	// certificates, route patterns with zone_name need a record to exist first.
	// Checked per placeholder, since explaining that preference means naming
	// the thing being avoided.
	it("follows the repository's own preference for custom domains over routes", () => {
		const placeholders = commented.split("\n").filter((line) => line.includes('"routes"'));

		expect(placeholders.length).toBe(DEPLOYED_ENVS.length);
		for (const placeholder of placeholders) {
			expect(placeholder).toMatch(/"custom_domain":\s*true/);
			expect(placeholder).not.toMatch(/zone_name/);
		}
	});

	it("ships no active routes to a domain nobody cloning this owns", () => {
		const config = loadJsonc(WRANGLER) as { routes?: unknown; env?: Record<string, EnvBlock> };
		expect(config.routes).toBeUndefined();
		for (const env of DEPLOYED_ENVS) expect(config.env?.[env]?.routes).toBeUndefined();
	});
});

describe("wrangler.jsonc Smart Placement", () => {
	const config = loadJsonc(WRANGLER) as { placement?: unknown };

	it("ships off", () => {
		expect(config.placement).toBeUndefined();
	});

	it("ships present, so enabling it is uncommenting rather than researching", () => {
		expect(source).toMatch(/"placement":\s*{\s*"mode":\s*"smart"\s*}/);
	});

	// Guidance that lives in two places disagrees in one of them eventually.
	it("points at the decision record instead of restating it", () => {
		const referenced = source.match(/docs\/decisions\/[\w-]+\.md/)?.[0];
		expect(referenced).toBe("docs/decisions/smart-placement.md");
		expect(existsSync(resolve(ROOT, referenced ?? ""))).toBe(true);
	});
});

describe("package.json deploy scripts", () => {
	const pkg = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf8")) as {
		scripts: Record<string, string>;
	};

	it("deploy:staging builds with --mode staging and deploys", () => {
		expect(pkg.scripts["build:staging"]).toMatch(/vite build --mode staging/);
		expect(pkg.scripts["deploy:staging"]).toMatch(/build:staging/);
		expect(pkg.scripts["deploy:staging"]).toMatch(/wrangler deploy/);
	});

	it("deploy:production builds with --mode production and deploys", () => {
		expect(pkg.scripts["build:production"]).toMatch(/vite build --mode production/);
		expect(pkg.scripts["deploy:production"]).toMatch(/build:production/);
		expect(pkg.scripts["deploy:production"]).toMatch(/wrangler deploy/);
	});
});
