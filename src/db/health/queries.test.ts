import { vi } from "vitest";

vi.mock("@/db/setup", () => ({
	getDb: () => ({
		execute: () => Promise.reject(new Error("connect ENETUNREACH")),
	}),
}));

import { checkDatabase } from "./queries";

describe("checkDatabase", () => {
	it("logs structured error JSON when the db call throws", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const result = await checkDatabase();

			expect(result).toBe("disconnected");
			expect(spy).toHaveBeenCalledTimes(1);

			const arg = spy.mock.calls[0]?.[0];
			expect(typeof arg).toBe("string");
			const parsed = JSON.parse(arg as string) as Record<string, unknown>;
			expect(parsed.message).toBe("db health check failed");
			expect(parsed.error).toBe("connect ENETUNREACH");
		} finally {
			spy.mockRestore();
		}
	});
});
