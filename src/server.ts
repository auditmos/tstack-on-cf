// DO NOT DELETE THIS FILE!!!
// Custom CF Workers entry: routes /api/* to Hono, rest to TanStack Start
import handler from "@tanstack/react-start/server-entry";
import { initDatabase } from "@/db";
import { apiHono } from "@/hono/api";

export function isApiRequest(pathname: string): boolean {
	return pathname === "/api" || pathname.startsWith("/api/");
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		initDatabase({
			host: env.DATABASE_HOST,
			username: env.DATABASE_USERNAME,
			password: env.DATABASE_PASSWORD,
		});

		const url = new URL(request.url);

		if (isApiRequest(url.pathname)) {
			return apiHono.fetch(request, env, ctx);
		}

		return handler.fetch(request, {
			context: { fromFetch: true },
		});
	},
};
