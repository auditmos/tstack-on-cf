/**
 * Browser APIs jsdom does not implement, stubbed for the component project.
 *
 * Two things reach for them here: Radix primitives position themselves with
 * observers a real browser provides, and the theme provider asks the browser
 * what colour scheme the user prefers. Neither is what a component test
 * asserts on — these stubs only stop the components throwing before they
 * render. The preference answers "light", so a test that cares about the
 * system theme is stating it rather than inheriting it.
 */

class NoopResizeObserver implements ResizeObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

globalThis.ResizeObserver ??= NoopResizeObserver;

function stubMediaQueryList(query: string): MediaQueryList {
	const list: MediaQueryList = {
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	};
	return list;
}

window.matchMedia ??= stubMediaQueryList;
