export type ErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED" | "INTERNAL";

export class AppError extends Error {
	constructor(
		message: string,
		public code: ErrorCode,
		public status: number = 500,
		public field?: string,
	) {
		super(message);
		this.name = "AppError";
	}
}

/**
 * @public
 *
 * Nothing in this template returns a `Result` — the endpoints throw `AppError`
 * and let the Hono error handler map it. It ships anyway because it is half of
 * the convention `.claude/rules/error-handling.md` states and the README
 * documents: throw for the unexpected, return a `Result` when the caller has to
 * branch on failure without a try/catch. A cloner writing that second kind of
 * function should find the type already here, spelled the way the rules spell
 * it, rather than invent a fourth shape for it.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function isUniqueViolation(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const cause = error.cause;
	if (cause instanceof Error) {
		const pgCode = (cause as Error & { code?: string }).code;
		if (pgCode === "23505") return true;
	}
	return false;
}
