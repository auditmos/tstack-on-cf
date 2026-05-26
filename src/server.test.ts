import { isApiRequest } from "@/server";

describe("isApiRequest", () => {
	it.each([
		["/api", true],
		["/api/", true],
		["/api/health/live", true],
		["/api/clients/123", true],
		["/", false],
		["/apidocs", false],
		["/apinotmine", false],
	])("%s -> %s", (path, expected) => {
		expect(isApiRequest(path)).toBe(expected);
	});
});
