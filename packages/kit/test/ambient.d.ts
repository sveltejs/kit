declare global {
	interface Window {
		navigated: Promise<void>;
		started: Promise<void>;

		// used in tests
		oops: string;
		pageContext: any;
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
	const onBeforeNavigate: (fn: (url: URL) => Promise<boolean>) => void;
	const onNavigate: (fn: () => void) => void;
	const prefetchRoutes: (urls?: string[]) => Promise<void>;
}

export {};
