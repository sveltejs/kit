declare namespace App {
	interface Locals {}
	interface Platform {}
	interface Session {}
	interface Stuff {}
}

declare module '$app/env' {
	/**
	 * Whether or not app is in AMP mode.
	 */
	export const amp: boolean;
	/**
	 * Whether the app is running in the browser or on the server.
	 */
	export const browser: boolean;
	/**
	 * `true` in development mode, `false` in production.
	 */
	export const dev: boolean;
	/**
	 * `true` when prerendering, `false` otherwise.
	 */
	export const prerendering: boolean;
	/**
	 * The Vite.js mode the app is running in. Configure in `config.kit.vite.mode`.
	 * Vite.js loads the dotenv file associated with the provided mode, `.env.[mode]` or `.env.[mode].local`.
	 * By default, `svelte-kit dev` runs with `mode=development` and `svelte-kit build` runs with `mode=production`.
	 */
	export const mode: string;
}

declare module '$app/navigation' {
	/**
	 * Disable SvelteKit's built-in scroll handling for the current navigation, in case you need to manually control the scroll position.
	 * This is generally discouraged, since it breaks user expectations.
	 */
	export function disableScrollHandling(): void;
	/**
	 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified href.
	 *
	 * @param href Where to navigate to
	 * @param opts.replaceState If `true`, will replace the current `history` entry rather than creating a new one with `pushState`
	 * @param opts.noscroll If `true`, the browser will maintain its scroll position rather than scrolling to the top of the page after navigation
	 * @param opts.keepfocus If `true`, the currently focused element will retain focus after navigation. Otherwise, focus will be reset to the body
	 * @param opts.state The state of the new/updated history entry
	 */
	export function goto(
		href: string,
		opts?: { replaceState?: boolean; noscroll?: boolean; keepfocus?: boolean; state?: any }
	): Promise<any>;
	/**
	 * Returns a Promise that resolves when SvelteKit re-runs any current `load` functions that depend on `href`
	 * @param href The invalidated resource
	 */
	export function invalidate(href: string): Promise<any>;
	/**
	 * Programmatically prefetches the given page, which means
	 *  1. ensuring that the code for the page is loaded, and
	 *  2. calling the page's load function with the appropriate options.
	 *
	 * This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with `sveltekit:prefetch`.
	 * If the next navigation is to `href`, the values returned from load will be used, making navigation instantaneous.
	 * Returns a Promise that resolves when the prefetch is complete.
	 *
	 * @param href Page to prefetch
	 */
	export function prefetch(href: string): Promise<any>;
	/**
	 * Programmatically prefetches the code for routes that haven't yet been fetched.
	 * Typically, you might call this to speed up subsequent navigation.
	 *
	 * If no argument is given, all routes will be fetched, otherwise you can specify routes by any matching pathname
	 * such as `/about` (to match `src/routes/about.svelte`) or `/blog/*` (to match `src/routes/blog/[slug].svelte`).
	 *
	 * Unlike prefetch, this won't call preload for individual pages.
	 * Returns a Promise that resolves when the routes have been prefetched.
	 */
	export function prefetchRoutes(routes?: string[]): Promise<any>;

	/**
	 * A navigation interceptor that triggers before we navigate to a new route.
	 * This is helpful if we want to conditionally prevent a navigation from completing or lookup the upcoming url.
	 */
	export function beforeNavigate(
		fn: ({ from, to, cancel }: { from: URL; to: URL | null; cancel: () => void }) => void
	): any;

	/**
	 * A lifecycle function that runs when the page mounts, and also whenever SvelteKit navigates to a new URL but stays on this component.
	 */
	export function afterNavigate(fn: ({ from, to }: { from: URL | null; to: URL }) => void): any;
}

declare module '$app/paths' {
	/**
	 * A root-relative (i.e. begins with a `/`) string that matches `config.kit.paths.base` in your project configuration.
	 */
	export const base: string;
	/**
	 * A root-relative or absolute path that matches `config.kit.paths.assets` (after it has been resolved against base).
	 */
	export const assets: string;
}

declare module '$app/stores' {
	import { Readable, Writable } from 'svelte/store';
	type Navigating = { from: URL; to: URL };

	/**
	 * A convenience function around `getContext` that returns `{ navigating, page, session }`.
	 * Most of the time, you won't need to use it.
	 */
	export function getStores(): {
		navigating: typeof navigating;
		page: typeof page;
		session: Writable<App.Session>;
		updated: typeof updated;
	};
	/**
	 * A readable store whose value contains page data.
	 */
	export const page: Readable<{
		url: URL;
		params: Record<string, string>;
		stuff: App.Stuff;
		status: number;
		error: Error | null;
	}>;
	/**
	 * A readable store.
	 * When navigating starts, its value is `{ from: URL, to: URL }`
	 * When navigating finishes, its value reverts to `null`.
	 */
	export const navigating: Readable<Navigating | null>;
	/**
	 * A writable store whose initial value is whatever was returned from `getSession`.
	 * It can be written to, but this will not cause changes to persist on the server — this is something you must implement yourself.
	 */
	export const session: Writable<App.Session>;
	/**
	 * A writable store indicating if the site was updated since the store was created.
	 * It can be written to when custom logic is required to detect updates.
	 */
	export const updated: Readable<boolean> & { check: () => boolean };
}

declare module '$service-worker' {
	/**
	 * An array of URL strings representing the files generated by Vite, suitable for caching with `cache.addAll(build)`.
	 * This is only available to service workers.
	 */
	export const build: string[];
	/**
	 * An array of URL strings representing the files in your static directory,
	 * or whatever directory is specified by `config.kit.files.assets`.
	 * This is only available to service workers.
	 */
	export const files: string[];
	/**
	 * The result of calling `Date.now()` at build time.
	 * It's useful for generating unique cache names inside your service worker,
	 * so that a later deployment of your app can invalidate old caches.
	 * This is only available to service workers.
	 */
	export const timestamp: number;
}

declare module '@sveltejs/kit/hooks' {
	import { Handle } from '@sveltejs/kit';

	/**
	 * Utility function that allows chaining `handle` functions in a
	 * middleware-like manner.
	 *
	 * @param handlers The chain of `handle` functions
	 */
	export function sequence(...handlers: Handle[]): Handle;
}

declare module '@sveltejs/kit/node' {
	import { IncomingMessage, ServerResponse } from 'http';

	export interface GetRawBody {
		(request: IncomingMessage): Promise<Uint8Array | null>;
	}
	export const getRawBody: GetRawBody;

	export interface GetRequest {
		(base: string, request: IncomingMessage): Promise<Request>;
	}
	export const getRequest: GetRequest;

	export interface SetResponse {
		(res: ServerResponse, response: Response): void;
	}
	export const setResponse: SetResponse;
}

declare module '@sveltejs/kit/install-fetch' {
	import fetch, { Headers, Request, Response } from 'node-fetch';

	export function __fetch_polyfill(): void;

	export { fetch, Headers, Request, Response };
}
