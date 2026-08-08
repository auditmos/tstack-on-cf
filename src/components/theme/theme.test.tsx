import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, ThemeToggle } from "@/components/theme";

/**
 * The theme module's boundary is these two exports: a provider that owns the
 * choice and a control that changes it. What a user does with them is open the
 * menu and pick a theme — so that is what this drives, rather than reaching for
 * the context or the storage key directly.
 */
function renderToggle() {
	return render(
		<ThemeProvider defaultTheme="light">
			<ThemeToggle />
		</ThemeProvider>,
	);
}

/** Opens the menu the way a keyboard user does. */
function openMenu() {
	fireEvent.keyDown(screen.getByRole("button", { name: /toggle theme/i }), { key: "Enter" });
}

describe("theme controls", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("light", "dark");
	});

	it("offers a choice for every theme", () => {
		renderToggle();
		openMenu();

		expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
			expect.stringContaining("Light"),
			expect.stringContaining("Dark"),
			expect.stringContaining("System"),
		]);
	});

	it("darkens the document when the user picks dark", () => {
		renderToggle();
		openMenu();

		fireEvent.click(screen.getByRole("menuitem", { name: /dark/i }));

		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.classList.contains("light")).toBe(false);
	});

	// Losing the choice on reload is the bug this component exists to avoid.
	it("remembers the choice for the next visit", () => {
		const { unmount } = renderToggle();
		openMenu();
		fireEvent.click(screen.getByRole("menuitem", { name: /dark/i }));
		unmount();

		renderToggle();

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});
});
