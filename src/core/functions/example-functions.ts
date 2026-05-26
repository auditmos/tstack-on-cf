import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exampleMiddlewareWithContext } from "@/core/middleware/example-middleware";

// import { env } from "cloudflare:workers";

const baseFunction = createServerFn().middleware([exampleMiddlewareWithContext]);

const ExampleInputSchema = z.object({
	exampleKey: z.string().min(1),
});

type ExampleInput = z.infer<typeof ExampleInputSchema>;

export const examplefunction = baseFunction
	.inputValidator((data: ExampleInput) => ExampleInputSchema.parse(data))
	.handler(async (ctx) => {
		// biome-ignore lint/suspicious/noConsole: structured demo log surfaces in Workers tail
		console.log(JSON.stringify({ message: "example-fn: executing" }));
		// biome-ignore lint/suspicious/noConsole: structured demo log surfaces in Workers tail
		console.log(JSON.stringify({ message: "example-fn: input", data: ctx.data }));
		// biome-ignore lint/suspicious/noConsole: structured demo log surfaces in Workers tail
		console.log(
			JSON.stringify({ message: "example-fn: middleware-context", context: ctx.context }),
		);
		return "Function executed successfully";
	});
