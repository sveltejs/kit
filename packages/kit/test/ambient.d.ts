declare global {
	interface Window {
		navigated: Promise<void>;
		started: boolean;
	}

	const goto: (
		href: string,
		opts?: {
			replaceState?: boolean;
			noScroll?: boolean;
		}
	) => Promise<void>;

	const invalidate: (url: string) => Promise<void>;
	const preloadData: (url: string) => Promise<void>;
	const beforeNavigate: (fn: (url: URL) => void | boolean) => void;
	const afterNavigate: (fn: () => void) => void;
	const preloadCode: (...urls: string[]) => Promise<void>;
}

export {};
