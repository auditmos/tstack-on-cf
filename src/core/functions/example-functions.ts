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
		// biome-ignore lint/suspicious/noConsole: demo logs for server function execution flow
		console.log("Executing example function");
		// biome-ignore lint/suspicious/noConsole: demo logs for server function execution flow
		console.log(`The data passed: ${JSON.stringify(ctx.data)}`);
		// biome-ignore lint/suspicious/noConsole: demo logs for server function execution flow
		console.log(`The context from middleware: ${JSON.stringify(ctx.context)}`);
		// console.log(`The Cloudflare Worker Environment: ${JSON.stringify(env)}`);
		return "Function executed successfully";
	});
