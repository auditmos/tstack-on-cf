import { vi } from "vitest";
import { AppError } from "@/core/errors";
import { apiHono } from "./api";

describe("apiHono global error handler", () => {
	beforeAll(() => {
		apiHono.get("/test/app-error", () => {
			throw new AppError("bad input", "VALIDATION", 400, "email");
		});
		apiHono.get("/test/boom", () => {
			throw new Error("internal db secret leaked here");
		});
	});

	it("converts AppError to JSON with status, code, and field", async () => {
		const res = await apiHono.request("/api/test/app-error");

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "bad input",
			code: "VALIDATION",
			field: "email",
		});
	});

	it("returns generic 500 JSON on unexpected error without leaking stack or message", async () => {
		const res = await apiHono.request("/api/test/boom");

		expect(res.status).toBe(500);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("Internal server error");
		expect(body).not.toHaveProperty("stack");
		expect(JSON.stringify(body)).not.toContain("internal db secret leaked here");
	});

	it("emits a structured JSON log line on unexpected error", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			await apiHono.request("/api/test/boom");

			expect(errorSpy).toHaveBeenCalledTimes(1);
			const logged = errorSpy.mock.calls[0]?.[0];
			expect(typeof logged).toBe("string");
			const parsed = JSON.parse(logged as string) as Record<string, unknown>;
			expect(parsed.message).toBe("unhandled error");
			expect(parsed.error).toBe("internal db secret leaked here");
			expect(parsed.path).toBe("/api/test/boom");
		} finally {
			errorSpy.mockRestore();
		}
	});
});
