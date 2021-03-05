import { Page, Response } from 'playwright';

// TODO passing `page` used to break uvu because it gets mutated, but it
// seems like that's no longer an issue? in which case we don't need
// to wrap all these methods

export type TestContext = {
	base: string;
	page: Page;
	fetch: (url: RequestInfo, opts: RequestInit) => Promise<Response>;
	capture_requests: (fn: () => void) => Promise<string[]>;

	// these are assumed to have been put in the global scope by the layout
	app: {
		start: () => Promise<void>;
		goto: (url: string) => Promise<void>;
		prefetch: (url: string) => Promise<void>;
		prefetchRoutes: () => Promise<void>;
	};

	reset: () => Promise<void>;
};

export type TestFunction = {
	(name: string, start: string, callback: (context: TestContext) => void): void;
	only: (name: string, start: string, callback: (context: TestContext) => void) => void;
	skip: (name: string, start: string, callback: (context: TestContext) => void) => void;
};

export type TestMaker = (test: TestFunction, is_dev: boolean) => void;
