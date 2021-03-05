import { Page, Response } from 'playwright';

// TODO passing `page` used to break uvu because it gets mutated, but it
// seems like that's no longer an issue? in which case we don't need
// to wrap all these methods

export type TestContext = {
	base: string;
	page: Page;
	visit: (path: string) => Promise<Response>;
	contains: (str: string) => Promise<boolean>;
	html: (selector: string) => Promise<string>;
	text: (selector: string) => Promise<string>;
	fetch: (url: RequestInfo, opts: RequestInit) => Promise<Response>;

	// these are assumed to have been put in the global scope by the layout
	app: {
		goto: (url: string) => Promise<void>;
		prefetch: (url: string) => Promise<void>;
		prefetchRoutes: () => Promise<void>;
	};

	// this function contains an assertions which feels weird
	wait_for_text: (selector: string, text: string) => void;

	capture_requests: (fn: () => void) => Promise<string[]>;
	reset: () => Promise<void>;
};

export type TestFunction = {
	(name: string, start: string, callback: (context: TestContext) => void): void;
	only: (name: string, start: string, callback: (context: TestContext) => void) => void;
	skip: (name: string, start: string, callback: (context: TestContext) => void) => void;
};

export type TestMaker = (test: TestFunction, is_dev: boolean) => void;
