import { vi } from "vitest";
import { apiHono } from "@/hono/api";

describe("GET /api/health/ready", () => {
	it("returns env directly from CLOUDFLARE_ENV (no 'unknown' fallback)", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await apiHono.request(
				"/api/health/ready",
				{},
				{
					CLOUDFLARE_ENV: "test-env",
					DATABASE_HOST: "",
					DATABASE_USERNAME: "",
					DATABASE_PASSWORD: "",
				},
			);
			const body = (await res.json()) as { env: string };
			expect(body.env).toBe("test-env");
		} finally {
			errorSpy.mockRestore();
		}
	});
});
