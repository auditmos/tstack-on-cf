import { startupAssets } from "./check-bundle-budget";

it("counts each startup asset once across the shell, layouts and the matched route", () => {
	const manifest = {
		"src/styles.css": { file: "assets/root.css" },
		shell: { file: "assets/shell.js", imports: ["shared"] },
		shared: { file: "assets/shared.js", css: ["assets/shared.css"] },
		clients: {
			file: "assets/clients.js",
			imports: ["shared"],
			dynamicImports: ["dialog"],
		},
		dialog: { file: "assets/dialog.js" },
	};
	const routes = {
		__root__: { children: ["/", "/_layout"], preloads: ["/assets/shell.js"] },
		"/": { preloads: ["/assets/landing.js"] },
		"/_layout": {
			children: ["/_layout/clients"],
			preloads: ["/assets/shared.js"],
			css: ["/assets/layout.css"],
		},
		"/_layout/clients": { preloads: ["/assets/clients.js", "/assets/shared.js"] },
	};

	expect(startupAssets(manifest, routes, "/_layout/clients")).toEqual(
		new Set([
			"assets/root.css",
			"assets/shell.js",
			"assets/shared.js",
			"assets/shared.css",
			"assets/layout.css",
			"assets/clients.js",
		]),
	);
});
