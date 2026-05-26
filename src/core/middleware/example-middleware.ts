import { createMiddleware } from "@tanstack/react-start";

export const exampleMiddlewareWithContext = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	// biome-ignore lint/suspicious/noConsole: structured demo log surfaces in Workers tail
	console.log(JSON.stringify({ message: "example-middleware: executing" }));
	return await next({
		context: {
			data: "Some Data From Middleware",
		},
	});
});
