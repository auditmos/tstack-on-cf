import { Hono, type MiddlewareHandler } from "hono";

/** Middleware that can be attached to an endpoint built by {@link createHono}. */
export type ApiMiddleware = MiddlewareHandler<{ Bindings: Env }>;

/**
 * Builds a Hono endpoint typed against the Worker's `Env` bindings.
 *
 * ## Authentication seam
 *
 * Every middleware passed here runs on `*` before any handler the endpoint
 * registers, so this is the attachment point for authentication, and the one
 * place to attach it from — an endpoint is only as protected as the factory
 * that built it.
 *
 * ```ts
 * const requireApiKey: ApiMiddleware = async (c, next) => {
 *   if (c.req.header("authorization") !== `Bearer ${c.env.API_TOKEN}`) {
 *     return c.json({ error: "Unauthorized" }, 401);
 *   }
 *   await next();
 * };
 *
 * const clientsEndpoint = createHono(requireApiKey);
 * ```
 *
 * This template ships **no** middleware attached: the demo API is deliberately
 * public unauthenticated CRUD, and a token check here would be mistaken for
 * something production-grade. See the README's "Security posture" section for
 * what to do before deploying.
 */
export const createHono = (...middleware: ApiMiddleware[]) => {
	const endpoint = new Hono<{ Bindings: Env }>();
	for (const handler of middleware) {
		endpoint.use("*", handler);
	}
	return endpoint;
};
