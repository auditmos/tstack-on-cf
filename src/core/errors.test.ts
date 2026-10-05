import { ApiError, AppError, isUniqueViolation, toApiError } from "./errors";

describe("AppError", () => {
	it("carries code, status, and optional field", () => {
		const err = new AppError("nope", "VALIDATION", 400, "email");
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("AppError");
		expect(err.message).toBe("nope");
		expect(err.code).toBe("VALIDATION");
		expect(err.status).toBe(400);
		expect(err.field).toBe("email");
	});

	it("defaults status to 500", () => {
		const err = new AppError("boom", "INTERNAL");
		expect(err.status).toBe(500);
		expect(err.field).toBeUndefined();
	});
});

describe("isUniqueViolation", () => {
	it("detects pg code 23505 on error.cause", () => {
		const cause = Object.assign(new Error("duplicate key"), { code: "23505" });
		const err = new Error("Failed query");
		(err as Error & { cause: unknown }).cause = cause;
		expect(isUniqueViolation(err)).toBe(true);
	});

	it("returns false for other pg codes", () => {
		const cause = Object.assign(new Error("fk violation"), { code: "23503" });
		const err = new Error("Failed query");
		(err as Error & { cause: unknown }).cause = cause;
		expect(isUniqueViolation(err)).toBe(false);
	});

	it("returns false when cause is missing", () => {
		expect(isUniqueViolation(new Error("plain"))).toBe(false);
	});

	it("returns false for non-Error inputs", () => {
		expect(isUniqueViolation(null)).toBe(false);
		expect(isUniqueViolation("oops")).toBe(false);
		expect(isUniqueViolation({ code: "23505" })).toBe(false);
	});
});

describe("toApiError", () => {
	it("keeps the message, status, code, and field the API's error handler sent", async () => {
		const res = Response.json(
			{ error: "Email already exists", code: "CONFLICT", field: "email" },
			{ status: 409 },
		);

		const err = await toApiError(res, "Failed to create client");

		expect(err).toBeInstanceOf(ApiError);
		expect(err.name).toBe("ApiError");
		expect(err.message).toBe("Email already exists");
		expect(err.status).toBe(409);
		expect(err.code).toBe("CONFLICT");
		expect(err.field).toBe("email");
	});

	// A gateway or the platform can answer before the Worker does, with an HTML
	// page. Parsing that as JSON used to surface "Unexpected token '<'" in place
	// of the real status.
	it("falls back to the caller's message when the body is not JSON", async () => {
		const res = new Response("<html>502 Bad Gateway</html>", { status: 502 });

		const err = await toApiError(res, "Failed to delete client");

		expect(err.message).toBe("Failed to delete client");
		expect(err.status).toBe(502);
		expect(err.code).toBeUndefined();
		expect(err.field).toBeUndefined();
	});

	it("falls back to the caller's message when the body is empty", async () => {
		const err = await toApiError(new Response(null, { status: 500 }), "Failed to fetch clients");

		expect(err.message).toBe("Failed to fetch clients");
		expect(err.status).toBe(500);
	});

	it("drops a code the API never sends, and fields of the wrong type", async () => {
		const res = Response.json({ error: "Teapot", code: "TEAPOT", field: 42 }, { status: 418 });

		const err = await toApiError(res, "Failed");

		expect(err.message).toBe("Teapot");
		expect(err.code).toBeUndefined();
		expect(err.field).toBeUndefined();
	});
});
