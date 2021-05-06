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
	const prefetch: (url: string) => Promise<void>;
	const prefetchRoutes: (urls?: string[]) => Promise<void>;
}

export {};
