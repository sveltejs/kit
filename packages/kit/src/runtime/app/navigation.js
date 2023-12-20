import { client_method } from '../client/singletons.js';

/**
 * If called when the page is being updated following a navigation (in `onMount` or `afterNavigate` or an action, for example), this disables SvelteKit's built-in scroll handling.
 * This is generally discouraged, since it breaks user expectations.
 * @returns {void}
 */
export const disableScrollHandling = /* @__PURE__ */ client_method('disable_scroll_handling');

/**
 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified `url`.
 * For external URLs, use `window.location = url` instead of calling `goto(url)`.
 *
 * @type {(url: string | URL, opts?: { replaceState?: boolean; noScroll?: boolean; keepFocus?: boolean; invalidateAll?: boolean; state?: App.PageState }) => Promise<void>}
 * @param {string | URL} url Where to navigate to. Note that if you've set [`config.kit.paths.base`](https://kit.svelte.dev/docs/configuration#paths) and the URL is root-relative, you need to prepend the base path if you want to navigate within the app.
 * @param {Object} [opts] Options related to the navigation
 * @param {boolean} [opts.replaceState] If `true`, will replace the current `history` entry rather than creating a new one with `pushState`
 * @param {boolean} [opts.noScroll] If `true`, the browser will maintain its scroll position rather than scrolling to the top of the page after navigation
 * @param {boolean} [opts.keepFocus] If `true`, the currently focused element will retain focus after navigation. Otherwise, focus will be reset to the body
 * @param {boolean} [opts.invalidateAll] If `true`, all `load` functions of the page will be rerun. See https://kit.svelte.dev/docs/load#rerunning-load-functions for more info on invalidation.
 * @param {App.PageState} [opts.state] An optional object that will be available on the `$page.state` store
 * @returns {Promise<void>}
 */
export const goto = /* @__PURE__ */ client_method('goto');

/**
 * Causes any `load` functions belonging to the currently active page to re-run if they depend on the `url` in question, via `fetch` or `depends`. Returns a `Promise` that resolves when the page is subsequently updated.
 *
 * If the argument is given as a `string` or `URL`, it must resolve to the same URL that was passed to `fetch` or `depends` (including query parameters).
 * To create a custom identifier, use a string beginning with `[a-z]+:` (e.g. `custom:state`) — this is a valid URL.
 *
 * The `function` argument can be used define a custom predicate. It receives the full `URL` and causes `load` to rerun if `true` is returned.
 * This can be useful if you want to invalidate based on a pattern instead of a exact match.
 *
 * ```ts
 * // Example: Match '/path' regardless of the query parameters
 * import { invalidate } from '$app/navigation';
 *
 * invalidate((url) => url.pathname === '/path');
 * ```
 * @type {(url: string | URL | ((url: URL) => boolean)) => Promise<void>}
 * @param {string | URL | ((url: URL) => boolean)} url The invalidated URL
 * @returns {Promise<void>}
 */
export const invalidate = /* @__PURE__ */ client_method('invalidate');

/**
 * Causes all `load` functions belonging to the currently active page to re-run. Returns a `Promise` that resolves when the page is subsequently updated.
 * @type {() => Promise<void>}
 * @returns {Promise<void>}
 */
export const invalidateAll = /* @__PURE__ */ client_method('invalidate_all');

/**
 * Programmatically preloads the given page, which means
 *  1. ensuring that the code for the page is loaded, and
 *  2. calling the page's load function with the appropriate options.
 *
 * This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with `data-sveltekit-preload-data`.
 * If the next navigation is to `href`, the values returned from load will be used, making navigation instantaneous.
 * Returns a Promise that resolves with the result of running the new route's `load` functions once the preload is complete.
 *
 * @type {(href: string) => Promise<Record<string, any>>}
 * @param {string} href Page to preload
 * @returns {Promise<{ type: 'loaded'; status: number; data: Record<string, any> } | { type: 'redirect'; location: string }>}
 */
export const preloadData = /* @__PURE__ */ client_method('preload_data');

/**
 * Programmatically imports the code for routes that haven't yet been fetched.
 * Typically, you might call this to speed up subsequent navigation.
 *
 * You can specify routes by any matching pathname such as `/about` (to match `src/routes/about/+page.svelte`) or `/blog/*` (to match `src/routes/blog/[slug]/+page.svelte`).
 *
 * Unlike `preloadData`, this won't call `load` functions.
 * Returns a Promise that resolves when the modules have been imported.
 *
 * @type {(url: string) => Promise<void>}
 * @param {string} url
 * @returns {Promise<void>}
 */
export const preloadCode = /* @__PURE__ */ client_method('preload_code');

/**
 * A navigation interceptor that triggers before we navigate to a new URL, whether by clicking a link, calling `goto(...)`, or using the browser back/forward controls.
 *
 * Calling `cancel()` will prevent the navigation from completing. If `navigation.type === 'leave'` — meaning the user is navigating away from the app (or closing the tab) — calling `cancel` will trigger the native browser unload confirmation dialog. In this case, the navigation may or may not be cancelled depending on the user's response.
 *
 * When a navigation isn't to a SvelteKit-owned route (and therefore controlled by SvelteKit's client-side router), `navigation.to.route.id` will be `null`.
 *
 * If the navigation will (if not cancelled) cause the document to unload — in other words `'leave'` navigations and `'link'` navigations where `navigation.to.route === null` — `navigation.willUnload` is `true`.
 *
 * `beforeNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
 * @type {(callback: (navigation: import('@sveltejs/kit').BeforeNavigate) => void) => void}
 * @param {(navigation: import('@sveltejs/kit').BeforeNavigate) => void} callback
 * @returns {void}
 */
export const beforeNavigate = /* @__PURE__ */ client_method('before_navigate');

/**
 * A lifecycle function that runs the supplied `callback` immediately before we navigate to a new URL except during full-page navigations.
 *
 * If you return a `Promise`, SvelteKit will wait for it to resolve before completing the navigation. This allows you to — for example — use `document.startViewTransition`. Avoid promises that are slow to resolve, since navigation will appear stalled to the user.
 *
 * If a function (or a `Promise` that resolves to a function) is returned from the callback, it will be called once the DOM has updated.
 *
 * `onNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
 * @type {(callback: (navigation: import('@sveltejs/kit').OnNavigate) => import('types').MaybePromise<(() => void) | void>) => void}
 * @param {(navigation: import('@sveltejs/kit').OnNavigate) => void} callback
 * @returns {void}
 */
export const onNavigate = /* @__PURE__ */ client_method('on_navigate');

/**
 * A lifecycle function that runs the supplied `callback` when the current component mounts, and also whenever we navigate to a new URL.
 *
 * `afterNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
 * @type {(callback: (navigation: import('@sveltejs/kit').AfterNavigate) => void) => void}
 * @param {(navigation: import('@sveltejs/kit').AfterNavigate) => void} callback
 * @returns {void}
 */
export const afterNavigate = /* @__PURE__ */ client_method('after_navigate');

/**
 * Programmatically create a new history entry with the given `$page.state`. To use the current URL, you can pass `''` as the first argument. Used for [shallow routing](https://kit.svelte.dev/docs/shallow-routing).
 *
 * @type {(url: string | URL, state: App.PageState) => void}
 * @param {string | URL} url
 * @param {App.PageState} state
 * @returns {void}
 */
export const pushState = /* @__PURE__ */ client_method('push_state');

/**
 * Programmatically replace the current history entry with the given `$page.state`. To use the current URL, you can pass `''` as the first argument. Used for [shallow routing](https://kit.svelte.dev/docs/shallow-routing).
 *
 * @type {(url: string | URL, state: App.PageState) => void}
 * @param {string | URL} url
 * @param {App.PageState} state
 * @returns {void}
 */
export const replaceState = /* @__PURE__ */ client_method('replace_state');
