const ERROR_CODES = ["VALIDATION", "NOT_FOUND", "CONFLICT", "UNAUTHORIZED", "INTERNAL"] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

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
 * A state that only occurs when the code itself is wrong — a wiring mistake or
 * a broken contract, never something a caller could fix. Deliberately not an
 * `AppError`: the API's error handler sends an `AppError`'s message to the
 * client, while this falls through to the generic 500 and is logged.
 */
export class InvariantError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvariantError";
	}
}

/**
 * A failed call to this app's API, rebuilt on the client from the JSON body
 * `apiHono.onError` sends, so the UI can branch on status, code, and field
 * rather than on a message string. Build it with `toApiError`.
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public code?: ErrorCode,
		public field?: string,
	) {
		super(message);
		this.name = "ApiError";
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isErrorCode(value: unknown): value is ErrorCode {
	return ERROR_CODES.some((code) => code === value);
}

/**
 * Turns a non-OK response into an `ApiError`. The body is read defensively: a
 * gateway answering before the Worker may send HTML or nothing at all, and then
 * `fallback` becomes the message while the real status is kept.
 */
export async function toApiError(res: Response, fallback: string): Promise<ApiError> {
	const body: unknown = await res.json().catch(() => null);
	const fields = isRecord(body) ? body : {};
	const message = typeof fields.error === "string" && fields.error ? fields.error : fallback;
	const code = isErrorCode(fields.code) ? fields.code : undefined;
	const field = typeof fields.field === "string" ? fields.field : undefined;
	return new ApiError(message, res.status, code, field);
}
