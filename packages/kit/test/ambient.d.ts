declare global {
	interface Window {
		navigated: Promise<void>;
		started: Promise<void>;
	}

	const goto: (
		href: string,
		opts?: {
			replaceState?: boolean;
			noScroll?: boolean;
		}
	) => Promise<void>;

	const invalidate: (url: string) => Promise<void>;
	const prefetch: (url: string) => Promise<void>;
	const beforeNavigate: (fn: (url: URL) => void | boolean) => void;
	const afterNavigate: (fn: () => void) => void;
	const prefetchRoutes: (urls?: string[]) => Promise<void>;
}

export {};
