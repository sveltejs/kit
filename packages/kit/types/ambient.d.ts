/**
 * It's possible to tell SvelteKit how to type objects inside your app by declaring the `App` namespace. By default, a new project will have a file called `src/app.d.ts` containing the following:
 *
 * ```ts
 * /// <reference types="@sveltejs/kit" />
 *
 * declare namespace App {
 * 	interface Locals {}
 *
 * 	interface Platform {}
 *
 * 	interface Session {}
 *
 * 	interface Stuff {}
 * }
 * ```
 *
 * By populating these interfaces, you will gain type safety when using `event.locals`, `event.platform`, `session` and `stuff`:
 */
declare namespace App {
	/**
	 * The interface that defines `event.locals`, which can be accessed in [hooks](/docs/hooks) (`handle`, `handleError` and `getSession`) and [endpoints](/docs/routing#endpoints).
	 */
	export interface Locals {}

	/**
	 * If your adapter provides [platform-specific context](/docs/adapters#supported-environments-platform-specific-context) via `event.platform`, you can specify it here.
	 */
	export interface Platform {}

	/**
	 * The interface that defines `session`, both as an argument to [`load`](/docs/loading) functions and the value of the [session store](/docs/modules#$app-stores).
	 */
	export interface Session {}

	/**
	 * The interface that defines `stuff`, as input or output to [`load`](/docs/loading) or as the value of the `stuff` property of the [page store](/docs/modules#$app-stores).
	 */
	export interface Stuff {}
}

/**
 * ```ts
 * import { amp, browser, dev, mode, prerendering } from '$app/env';
 * ```
 */
declare module '$app/env' {
	/**
	 * Whether or not the app is running in [AMP mode](/docs/seo#manual-setup-amp).
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

/**
 * ```ts
 * import {
 * 	afterNavigate,
 * 	beforeNavigate,
 * 	disableScrollHandling,
 * 	goto,
 * 	invalidate,
 * 	prefetch,
 * 	prefetchRoutes
 * } from '$app/navigation';
 * ```
 */
declare module '$app/navigation' {
	/**
	 * If called when the page is being updated following a navigation (in `onMount` or an action, for example), this disables SvelteKit's built-in scroll handling.
	 * This is generally discouraged, since it breaks user expectations.
	 */
	export function disableScrollHandling(): void;
	/**
	 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified `href`.
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
	): Promise<void>;
	/**
	 * Causes any `load` functions belonging to the currently active page to re-run if they `fetch` the resource in question. Returns a `Promise` that resolves when the page is subsequently updated.
	 * @param href The invalidated resource
	 */
	export function invalidate(href: string): Promise<void>;
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
	export function prefetch(href: string): Promise<void>;
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
	export function prefetchRoutes(routes?: string[]): Promise<void>;

	/**
	 * A navigation interceptor that triggers before we navigate to a new URL (internal or external) whether by clicking a link, calling `goto`, or using the browser back/forward controls.
	 * This is helpful if we want to conditionally prevent a navigation from completing or lookup the upcoming url.
	 */
	export function beforeNavigate(
		fn: (navigation: { from: URL; to: URL | null; cancel: () => void }) => void
	): void;

	/**
	 * A lifecycle function that runs when the page mounts, and also whenever SvelteKit navigates to a new URL but stays on this component.
	 */
	export function afterNavigate(fn: (navigation: { from: URL | null; to: URL }) => void): void;
}

/**
 * ```ts
 * import { base, assets } from '$app/paths';
 * ```
 */
declare module '$app/paths' {
	/**
	 * A string that matches [`config.kit.paths.base`](/docs/configuration#paths). It must begin, but not end, with a `/`.
	 */
	export const base: `/${string}`;
	/**
	 * An absolute path that matches [`config.kit.paths.assets`](/docs/configuration#paths).
	 *
	 * > If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during [`svelte-kit dev`](/docs/cli#svelte-kit-dev) or [`svelte-kit preview`](/docs/cli#svelte-kit-preview), since the assets don't yet live at their eventual URL.
	 */
	export const assets: `https://${string}` | `http://${string}`;
}

/**
 * ```ts
 * import { getStores, navigating, page, session, updated } from '$app/stores';
 * ```
 *
 * Stores are _contextual_ — they are added to the [context](https://svelte.dev/tutorial/context-api) of your root component. This means that `session` and `page` are unique to each request on the server, rather than shared between multiple requests handled by the same server simultaneously, which is what makes it safe to include user-specific data in `session`.
 *
 * Because of that, you must subscribe to the stores during component initialization (which happens automatically if you reference the store value, e.g. as `$page`, in a component) before you can use them.
 */
declare module '$app/stores' {
	import { Readable, Writable } from 'svelte/store';
	import { Navigation, Page } from '@sveltejs/kit';

	/**
	 * A convenience function around `getContext`. Must be called during component initialization.
	 * Only use this if you need to defer store subscription until after the component has mounted, for some reason.
	 */
	export function getStores(): {
		navigating: typeof navigating;
		page: typeof page;
		session: typeof session;
		updated: typeof updated;
	};

	/**
	 * A readable store whose value contains page data.
	 */
	export const page: Readable<Page>;
	/**
	 * A readable store.
	 * When navigating starts, its value is `{ from: URL, to: URL }`,
	 * When navigating finishes, its value reverts to `null`.
	 */
	export const navigating: Readable<Navigation | null>;
	/**
	 * A writable store whose initial value is whatever was returned from [`getSession`](/docs/hooks#getsession).
	 * It can be written to, but this will not cause changes to persist on the server — this is something you must implement yourself.
	 */
	export const session: Writable<App.Session>;
	/**
	 *  A readable store whose initial value is `false`. If [`version.pollInterval`](/docs/configuration#version) is a non-zero value, SvelteKit will poll for new versions of the app and update the store value to `true` when it detects one. `updated.check()` will force an immediate check, regardless of polling.
	 */
	export const updated: Readable<boolean> & { check: () => boolean };
}

/**
 * This is a simple alias to `src/lib`, or whatever directory is specified as [`config.kit.files.lib`](/docs/configuration#files). It allows you to access common components and utility modules without `../../../../` nonsense.
 */
declare module '$lib' {}

/**
 * ```ts
 * import { build, files, timestamp } from '$service-worker';
 * ```
 *
 * This module is only available to [service workers](/docs/service-workers).
 */
declare module '$service-worker' {
	/**
	 * An array of URL strings representing the files generated by Vite, suitable for caching with `cache.addAll(build)`.
	 */
	export const build: string[];
	/**
	 * An array of URL strings representing the files in your static directory, or whatever directory is specified by `config.kit.files.assets`. You can customize which files are included from `static` directory using [`config.kit.serviceWorker.files`](/docs/configuration)
	 */
	export const files: string[];
	/**
	 * The result of calling `Date.now()` at build time. It's useful for generating unique cache names inside your service worker, so that a later deployment of your app can invalidate old caches.
	 */
	export const timestamp: number;
}

declare module '@sveltejs/kit/hooks' {
	import { Handle } from '@sveltejs/kit';

	/**
	 * A helper function for sequencing multiple `handle` calls in a middleware-like manner.
	 *
	 * ```js
	 * /// file: src/hooks.js
	 * import { sequence } from '@sveltejs/kit/hooks';
	 *
	 * /** @type {import('@sveltejs/kit').Handle} *\/
	 * async function first({ event, resolve }) {
	 * 	console.log('first pre-processing');
	 * 	const result = await resolve(event);
	 * 	console.log('first post-processing');
	 * 	return result;
	 * }
	 *
	 * /** @type {import('@sveltejs/kit').Handle} *\/
	 * async function second({ event, resolve }) {
	 * 	console.log('second pre-processing');
	 * 	const result = await resolve(event);
	 * 	console.log('second post-processing');
	 * 	return result;
	 * }
	 *
	 * export const handle = sequence(first, second);
	 * ```
	 *
	 * The example above would print:
	 *
	 * ```
	 * first pre-processing
	 * second pre-processing
	 * second post-processing
	 * first post-processing
	 * ```
	 *
	 * @param handlers The chain of `handle` functions
	 */
	export function sequence(...handlers: Handle[]): Handle;
}

/**
 * A polyfill for `fetch` and its related interfaces, used by adapters for environments that don't provide a native implementation.
 */
declare module '@sveltejs/kit/install-fetch' {
	/**
	 * Make `fetch`, `Headers`, `Request` and `Response` available as globals, via `node-fetch`
	 */
	export function installFetch(): void;
}

/**
 * Utilities used by adapters for Node-like environments.
 */
declare module '@sveltejs/kit/node' {
	export function getRequest(
		base: string,
		request: import('http').IncomingMessage
	): Promise<Request>;
	export function setResponse(res: import('http').ServerResponse, response: Response): void;
}
