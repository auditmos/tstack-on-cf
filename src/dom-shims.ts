/**
 * Browser APIs jsdom does not implement, stubbed for the component project.
 *
 * Three things reach for them here: Radix primitives position themselves with
 * observers a real browser provides, the theme provider asks the browser what
 * colour scheme the user prefers, and it then remembers the answer in
 * `localStorage`. None of that is what a component test asserts on — these
 * stubs only stop the components throwing before they render. The preference
 * answers "light", so a test that cares about the system theme is stating it
 * rather than inheriting it.
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

/**
 * Web Storage, in memory.
 *
 * `globalThis.localStorage` exists under this runtime but is a bare object
 * carrying none of the Storage methods, so the first `getItem` throws rather
 * than returning null — a component that persists a preference cannot even
 * render, and a test cannot clear between cases. In-memory is what a test
 * wants regardless: it starts empty, and `clear()` actually clears something.
 */
function createMemoryStorage(): Storage {
	const entries = new Map<string, string>();
	return {
		get length() {
			return entries.size;
		},
		clear: () => entries.clear(),
		getItem: (key: string) => entries.get(key) ?? null,
		key: (index: number) => [...entries.keys()][index] ?? null,
		removeItem: (key: string) => {
			entries.delete(key);
		},
		setItem: (key: string, value: string) => {
			entries.set(key, String(value));
		},
	};
}

// Guarded on the method rather than on the object: the object is present, it
// is only the API that is missing, so `??=` would leave the broken one in place.
if (typeof globalThis.localStorage?.getItem !== "function") {
	Object.defineProperty(globalThis, "localStorage", {
		value: createMemoryStorage(),
		configurable: true,
		writable: true,
	});
}
