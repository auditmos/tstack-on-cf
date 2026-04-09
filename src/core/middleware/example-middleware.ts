import { createMiddleware } from "@tanstack/react-start";

export const exampleMiddlewareWithContext = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	// biome-ignore lint/suspicious/noConsole: demo logs for middleware execution flow
	console.log("Executing exampleMiddlewareWithContext");
	return await next({
		context: {
			data: "Some Data From Middleware",
		},
	});
});
