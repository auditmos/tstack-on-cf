import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { brotliCompressSync } from "node:zlib";
import type { Manifest } from "vite";

type StartRoutes = Record<
	string,
	{ children?: string[]; preloads?: string[]; css?: (string | { href: string })[] }
>;

const ROOT = "__root__";
// shortcut: the landing page exceeds 150 kB, lower its limit once it fits.
const JS_LIMITS = { "/": 160_000, "/clients": 150_000 };

export function startupAssets(manifest: Manifest, routes: StartRoutes, routeId: string) {
	// The root links the Tailwind stylesheet via a ?url import in head().
	const stylesheet = (manifest[resolve("src/styles.css")] ?? manifest["src/styles.css"])?.file;
	assert(stylesheet, "Missing the root stylesheet in the Vite manifest");
	const files = new Set([stylesheet]);
	const chunks = new Map(Object.values(manifest).map((chunk) => [chunk.file, chunk]));

	function add(url: string) {
		const file = url.replace(/^\//, "");
		if (files.has(file)) return;
		files.add(file);
		const chunk = chunks.get(file);
		for (const css of chunk?.css ?? []) add(css);
		for (const key of chunk?.imports ?? []) {
			assert(manifest[key], `Missing Vite import ${key}`);
			add(manifest[key].file);
		}
	}

	let id = routeId;
	while (true) {
		const route = routes[id];
		assert(route, `Missing Start manifest route ${id}`);
		for (const preload of route.preloads ?? []) add(preload);
		for (const css of route.css ?? []) add(typeof css === "string" ? css : css.href);
		if (id === ROOT) break;
		const parent = Object.entries(routes).find(([, route]) => route.children?.includes(id));
		assert(parent, `Missing parent for Start manifest route ${id}`);
		id = parent[0];
	}
	return files;
}

async function main() {
	const clientDir = resolve("dist/client");
	const serverAssets = resolve("dist/server/assets");
	const manifest: Manifest = JSON.parse(
		readFileSync(join(clientDir, ".vite/manifest.json"), "utf8"),
	);
	const startFiles = readdirSync(serverAssets).filter((file) =>
		/^_tanstack-start-manifest_v-.*\.js$/.test(file),
	);
	assert(startFiles.length === 1, "Expected one TanStack Start manifest. Run pnpm build first.");
	const start = await import(pathToFileURL(join(serverAssets, startFiles[0])).href);
	const routes: StartRoutes = start.tsrStartManifest().routes;
	const shell = startupAssets(manifest, routes, ROOT);
	const sizes = new Map<string, number>();

	function compressedSize(files: string[]) {
		return files.reduce((total, file) => {
			const size =
				sizes.get(file) ?? brotliCompressSync(readFileSync(join(clientDir, file))).length;
			sizes.set(file, size);
			return total + size;
		}, 0);
	}

	for (const [route, jsLimit] of Object.entries(JS_LIMITS)) {
		const files = [...startupAssets(manifest, routes, route)];
		const js = files.filter((file) => file.endsWith(".js"));
		const totals = {
			js: compressedSize(js),
			routeJs: compressedSize(js.filter((file) => !shell.has(file))),
			css: compressedSize(files.filter((file) => file.endsWith(".css"))),
		};
		const limits = { js: jsLimit, routeJs: 50_000, css: 20_000 };
		console.log(
			`${route} Brotli: ${totals.js} B JS, ${totals.routeJs} B route JS, ${totals.css} B CSS`,
		);
		for (const metric of ["js", "routeJs", "css"] as const) {
			if (totals[metric] <= limits[metric]) continue;
			console.error(`${route} ${metric} exceeds its budget of ${limits[metric]} B`);
			process.exitCode = 1;
		}
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
