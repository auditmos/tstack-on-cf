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
