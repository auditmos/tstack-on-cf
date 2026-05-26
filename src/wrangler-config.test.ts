import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadJsonc(path: string): Record<string, unknown> {
	const raw = readFileSync(path, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*/g, "");
	return JSON.parse(raw);
}

describe("wrangler.jsonc", () => {
	const config = loadJsonc(resolve(__dirname, "..", "wrangler.jsonc")) as {
		name?: string;
		vars?: Record<string, string>;
		compatibility_date?: string;
		observability?: {
			enabled?: boolean;
			logs?: { head_sampling_rate?: number };
			traces?: { enabled?: boolean; head_sampling_rate?: number };
		};
		env?: {
			staging?: { name?: string; vars?: Record<string, string> };
			production?: { name?: string; vars?: Record<string, string> };
		};
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
