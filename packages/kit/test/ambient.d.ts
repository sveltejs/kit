declare global {
	interface Window {
		navigated: Promise<void>;
		started: boolean;

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

	const invalidate: (resource: string, custom?: boolean) => Promise<void>;
	const prefetch: (url: string) => Promise<void>;
	const prefetchRoutes: (urls?: string[]) => Promise<void>;
}

export {};
