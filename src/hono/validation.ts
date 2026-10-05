import type { z } from "zod";
import { AppError } from "@/core/errors";

/**
 * Parses request input against a schema, or throws a VALIDATION `AppError` a
 * client can act on: the first failing issue's own message, and the field it
 * belongs to. Zod's `error.message` is a JSON dump of every issue, which is not
 * something to show a user.
 */
export function parseRequest<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
	const parsed = schema.safeParse(input);
	if (parsed.success) return parsed.data;
	const [issue] = parsed.error.issues;
	const field = issue?.path.length ? issue.path.map(String).join(".") : undefined;
	throw new AppError(issue?.message ?? "Invalid request", "VALIDATION", 400, field);
}
