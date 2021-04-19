import { Page, Response } from 'playwright-chromium';

// TODO passing `page` used to break uvu because it gets mutated, but it
// seems like that's no longer an issue? in which case we don't need
// to wrap all these methods

export type TestContext = {
	base: string;
	page: Page;
	clicknav: (selector: string) => Promise<void>;
	back: () => Promise<void>;
	fetch: (url: RequestInfo, opts?: RequestInit) => Promise<Response>;
	capture_requests: (fn: () => void) => Promise<string[]>;
	errors: () => string;
	js: boolean;

	// these are assumed to have been put in the global scope by the layout
	app: {
		goto: (url: string) => Promise<void>;
		prefetch: (url: string) => Promise<void>;
		prefetchRoutes: (urls?: string[]) => Promise<void>;
	};

	reset: () => Promise<void>;
};

type TestOptions = {
	js?: boolean;
	nojs?: boolean;
	dev?: boolean;
	build?: boolean;
};

interface TestFunctionBase {
	(
		name: string,
		start: string,
		callback: (context: TestContext) => void,
		options?: TestOptions
	): void;
}

export interface TestFunction extends TestFunctionBase {
	only: TestFunctionBase;
	skip: TestFunctionBase;
}

export type TestMaker = (test: TestFunction, is_dev: boolean) => void;
