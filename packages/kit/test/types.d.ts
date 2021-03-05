import { ElementHandle, Keyboard, Page, Response } from 'playwright';

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
	evaluate: <T>(fn: () => T) => Promise<T>;
	click: (
		selector: string,
		options: {
			button?: 'left' | 'right' | 'middle';
			clickCount?: number;
			delay?: number;
			force?: boolean;
			modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>;
			noWaitAfter?: boolean;
			position?: {
				x: number;
				y: number;
			};
			timeout?: number;
		}
	) => Promise<void>;

	// these are assumed to have been put in the global scope by the layout
	goto: (url: string) => Promise<void>;
	prefetch: (url: string) => Promise<void>;
	prefetch_routes: () => Promise<void>;

	// this function contains an assertions which feels weird
	wait_for_text: (selector: string, text: string) => void;

	wait_for_selector: (
		selector: string,
		options?: {
			state?: 'attached' | 'detached' | 'visible' | 'hidden';
			timeout?: number;
		}
	) => Promise<ElementHandle>;

	wait_for_function: <T>(
		fn: (arg?: any) => T,
		arg?: any,
		options?: {
			polling?: number | 'raf';
			timeout?: number;
		}
	) => Promise<T>;

	capture_requests: (fn: () => void) => Promise<string[]>;
	set_extra_http_headers: (headers: Record<string, string>) => void;
	pathname: () => Promise<string>;
	keyboard: Keyboard;
	sleep: (ms: number) => Promise<void>;
	reset: () => Promise<void>;
	$: (selector: string) => Promise<ElementHandle>;
};

export type TestFunction = {
	(name: string, callback: (context: TestContext) => void): void;
	only: (name: string, callback: (context: TestContext) => void) => void;
	skip: (name: string, callback: (context: TestContext) => void) => void;
};

export type TestMaker = (test: TestFunction, is_dev: boolean) => void;

declare module '**/*/__tests__.js' {
	export default function (test: TestFunction, is_dev: boolean): void;
}
