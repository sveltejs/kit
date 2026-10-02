import { AfterNavigate, BeforeNavigate, GotoOptions } from '$app/navigation';

declare global {
	interface Window {
		navigated: Promise<void>;
		started: boolean;
	}

	const goto: (href: string, opts?: GotoOptions) => Promise<void>;

	const invalidate: (url: string) => Promise<void>;
	const preloadData: (url: string) => Promise<void>;
	const beforeNavigate: (fn: (navigation: BeforeNavigate) => void | boolean) => void;
	const afterNavigate: (fn: (navigation: AfterNavigate) => void) => void;
	const preloadCode: (id: string) => Promise<void>;
	const match: (url: string) => Promise<{ id: string; params: Record<string, string> } | null>;
}

export {};
