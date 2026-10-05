import { vi } from "vitest";
import type { Client } from "./schema";

const returning = vi.fn<() => Promise<Client[]>>();

vi.mock("@/db/setup", () => ({
	getDb: () => ({
		insert: () => ({ values: () => ({ returning }) }),
	}),
}));

import { InvariantError } from "@/core/errors";
import { createClient } from "./queries";

const input = { name: "Ada", surname: "Lovelace", email: "ada@example.com" };

describe("createClient", () => {
	it("returns the inserted row", async () => {
		const row = { id: "0b9f3c1e-0000-4000-8000-000000000000", ...input } as Client;
		returning.mockImplementation(async () => [row]);

		await expect(createClient(input)).resolves.toBe(row);
	});

	// An insert with .returning() that yields no row means the database or the
	// driver broke its contract — there is nothing the caller could fix.
	it("throws an InvariantError when the insert returns no row", async () => {
		returning.mockImplementation(async () => []);

		await expect(createClient(input)).rejects.toBeInstanceOf(InvariantError);
	});
});
