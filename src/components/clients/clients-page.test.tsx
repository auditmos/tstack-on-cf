import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ClientsPage } from "./clients-page";

// The page's back link is the only thing it needs from the router, and no route
// is under test here.
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => children,
}));

/** What the API answers to the create request; the list is always empty. */
function stubApi(answerCreate: () => Response) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (_url: string, init?: RequestInit) =>
			init?.method === "POST"
				? answerCreate()
				: Response.json({
						data: [],
						pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
					}),
		),
	);
}

function renderPage() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<ClientsPage />
		</QueryClientProvider>,
	);
}

/** Opens the dialog and submits it the way a user does. */
async function submitNewClient() {
	fireEvent.click(await screen.findByRole("button", { name: /add client/i }));
	fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
	fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Lovelace" } });
	fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example" } });
	fireEvent.click(screen.getByRole("button", { name: "Create" }));
}

/** The text of whatever an input's aria-describedby points at. */
function descriptionOf(input: HTMLElement): string | null {
	const id = input.getAttribute("aria-describedby");
	return id ? (document.getElementById(id)?.textContent ?? null) : null;
}

describe("clients page form errors", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows an error the API attributes to a field under that field", async () => {
		stubApi(() =>
			Response.json(
				{ error: "Invalid email format", code: "VALIDATION", field: "email" },
				{ status: 400 },
			),
		);
		renderPage();

		await submitNewClient();

		const email = screen.getByLabelText("Email");
		await waitFor(() => expect(email.getAttribute("aria-invalid")).toBe("true"));
		expect(descriptionOf(email)).toBe("Invalid email format");
		expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBeNull();
	});

	it("clears a failed save's error when the dialog is reopened", async () => {
		stubApi(() =>
			Response.json(
				{ error: "Invalid email format", code: "VALIDATION", field: "email" },
				{ status: 400 },
			),
		);
		renderPage();
		await submitNewClient();
		expect(await screen.findByText("Invalid email format")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		fireEvent.click(await screen.findByRole("button", { name: /add client/i }));

		expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBeNull();
		expect(screen.queryByText("Invalid email format")).toBeNull();
	});

	it("shows an error with no field once, for the whole form", async () => {
		stubApi(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
		renderPage();

		await submitNewClient();

		expect(await screen.findByText("Failed to create client")).toBeTruthy();
		for (const label of ["Name", "Surname", "Email"]) {
			expect(screen.getByLabelText(label).getAttribute("aria-invalid")).toBeNull();
		}
	});
});
