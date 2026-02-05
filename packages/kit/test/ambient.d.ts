import { AfterNavigate, BeforeNavigate } from '@sveltejs/kit';

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
	const beforeNavigate: (fn: (navigation: BeforeNavigate) => void | boolean) => void;
	const afterNavigate: (fn: (navigation: AfterNavigate) => void) => void;
	const preloadCode: (pathname: string) => Promise<void>;
}

export {};
