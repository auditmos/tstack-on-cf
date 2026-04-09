import { AppError, isUniqueViolation } from "./errors";

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
