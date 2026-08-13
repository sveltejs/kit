/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '$app/env' {
	/**
	 * `true` if the app is running in the browser.
	 */
	export const browser: boolean;

	/**
	 * Whether the dev server is running. This is not guaranteed to correspond to `NODE_ENV` or `MODE`.
	 */
	export const dev: boolean;

	/**
	 * SvelteKit analyses your app during the `build` step by running it. During this process, `building` is `true`. This also applies during prerendering.
	 */
	export const building: boolean;

	/**
	 * The value of `config.version.name`.
	 */
	export const version: string;

	export {};
}

declare module '$app/forms' {
	/**
	 * Use this function to deserialize the response from a form submission.
	 * Usage:
	 *
	 * ```js
	 * import { deserialize } from '$app/forms';
	 *
	 * async function handleSubmit(event) {
	 *   const response = await fetch('/form?/action', {
	 *     method: 'POST',
	 *     body: new FormData(event.target)
	 *   });
	 *
	 *   const result = deserialize(await response.text());
	 *   // ...
	 * }
	 * ```
	 * */
	export function deserialize<Success extends Record<string, unknown> | undefined, Failure extends Record<string, unknown> | undefined>(result: string): ActionResult<Success, Failure>;
	/**
	 * This action enhances a `<form>` element that otherwise would work without JavaScript.
	 *
	 * The `submit` function is called upon submission with the given FormData and the `action` that should be triggered.
	 * If `cancel` is called, the form will not be submitted.
	 * You can use the abort `controller` to cancel the submission in case another one starts.
	 * If a function is returned, that function is called with the response from the server.
	 * If nothing is returned, the fallback will be used.
	 *
	 * If this function or its return value isn't set, it emulates the browser-native behaviour, just without the full-page reload. It
	 * - resets the `<form>` element and refreshes all data in case of a successful submission with no redirect response
	 * - updates the `form` prop, `page.form` and `page.status` if the action is on the same page as the form
	 * - navigates to the page the submission lands on — populating that page's `form` prop and `page.status` — on success and failure if that isn't the current page, just as a native form submission would, but with the `?/actionName` param stripped from the destination URL
	 * - redirects in case of a redirect response
	 * - renders the nearest error page in case of an unexpected error — the one nearest the action's route, if the action is on a different page
	 *
	 * If you provide a custom function with a callback and want to use the default behavior, invoke `update` in your callback.
	 * It accepts an options object
	 * - `reset: false` if you don't want the `<form>` values to be reset after a successful submission
	 * - `refreshAll` to control whether all data is refreshed after submission; it defaults to `true` for successes and `false` for failures
	 * - `navigate: false` to apply non-redirect results to the current page rather than navigating to `result.location`; redirects are always followed
	 * @param form_element The form element
	 * @param submit Submit callback
	 */
	export function enhance<Success extends Record<string, unknown> | undefined, Failure extends Record<string, unknown> | undefined>(form_element: HTMLFormElement, submit?: SubmitFunction<Success, Failure>): {
		destroy(): void;
	};
	/**
	 * When calling a form action via fetch, the response will be one of these shapes.
	 * ```svelte
	 * <form method="post" use:enhance={() => {
	 *   return ({ result }) => {
	 * 		// result is of type ActionResult
	 *   };
	 * }}
	 * ```
	 *
	 * Success and failure results carry the root-relative `pathname + search` of the action URL, with
	 * the `?/actionName` parameter removed. Redirect results carry the redirect target. Server-generated
	 * error results also carry the action location, while client-generated errors such as network
	 * failures do not. `update` uses this location to emulate native form navigation.
	 */
	export type ActionResult<
		Success extends Record<string, unknown> | undefined = Record<string, any>,
		Failure extends Record<string, unknown> | undefined = Record<string, any>
	> =
		| { type: 'success'; status: number; data?: Success; location: string }
		| { type: 'failure'; status: number; data?: Failure; location: string }
		| { type: 'redirect'; status: number; location: string }
		| { type: 'error'; status?: number; error: App.Error; location?: string };

	export type SubmitFunction<
		Success extends Record<string, unknown> | undefined = Record<string, any>,
		Failure extends Record<string, unknown> | undefined = Record<string, any>
	> = (input: {
		action: URL;
		formData: FormData;
		formElement: HTMLFormElement;
		controller: AbortController;
		submitter: HTMLElement | null;
		cancel: () => void;
	}) => MaybePromise<
		| void
		| ((opts: {
				formData: FormData;
				formElement: HTMLFormElement;
				action: URL;
				result: ActionResult<Success, Failure>;
				/**
				 * Call this to get the default behavior of a form submission response.
				 * @param options Set `reset: false` if you don't want the `<form>` values to be reset after a successful submission. `refreshAll` defaults to `true` for successful results and `false` for failures. When the submission navigates, setting it to `false` still runs the destination's `load` functions but may reuse shared layout data. Set `navigate: false` to apply non-redirect results to the current page instead of navigating to `result.location`. Redirects are always followed.
				 */
				update: (options?: {
					reset?: boolean;
					refreshAll?: boolean;
					navigate?: boolean;
					/** @deprecated Use `refreshAll` instead. */
					invalidateAll?: boolean;
				}) => Promise<void>;
		  }) => MaybePromise<void>)
	>;
	/**
	 * Updates the `form` property of the current page with the given data and updates `page.status`.
	 * In case of an error, it renders the nearest error page. In case of a redirect, it navigates to
	 * the redirect location.
	 * */
	export function applyAction<Success extends Record<string, unknown> | undefined, Failure extends Record<string, unknown> | undefined>(result: ActionResult<Success, Failure>): Promise<void>;
	type MaybePromise<T> = T | Promise<T>;

	export {};
}

declare module '$app/navigation' {
	import type { LayoutParams as AppLayoutParams, RouteId as AppRouteId } from '$app/types';
	/**
	 * Information about the target of a specific navigation.
	 */
	export interface NavigationTarget<
		Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
		RouteId extends AppRouteId | null = AppRouteId | null
	> {
		/**
		 * Parameters of the target page - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object.
		 * Is `null` if the target is not part of the SvelteKit app (could not be resolved to a route).
		 */
		params: Params | null;
		/**
		 * Info about the target route
		 */
		route: {
			/**
			 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`. It is `null` when no route is matched.
			 */
			id: RouteId | null;
		};
		/**
		 * The URL that is navigated to
		 */
		url: URL;
		/**
		 * The scroll position associated with this navigation.
		 *
		 * For the `from` target, this is the scroll position at the moment of navigation.
		 *
		 * For the `to` target, this represents the scroll position that will be or was restored:
		 * - In `beforeNavigate` and `onNavigate`, this is only available for `popstate` navigations (back/forward button)
		 *   and will be `null` for other navigation types, since the final scroll position isn't known
		 *   ahead of time.
		 * - In `afterNavigate`, this is always the scroll position that was applied after the navigation
		 *   completed.
		 */
		scroll: { x: number; y: number } | null;
	}

	export interface GotoOptions {
		/**
		 * If `true`, replaces the current history entry rather than creating a new one.
		 * @default false
		 */
		replace?: boolean;
		/** @deprecated Use `replace` instead. */
		replaceState?: boolean;
		/**
		 * If `true`, updates the URL and `page.state` without navigating.
		 * @default false
		 */
		shallow?: boolean;
		/**
		 * If `true`, resets the scroll position (to the top of the page, or to the element
		 * matching the URL's `#hash` if there is one) and resets focus (to the `<body>`, or the
		 * `autofocus` element if there is one) once the navigation completes.
		 *
		 * If `false`, the current scroll position and focused element are left alone.
		 * @default true, or false when `shallow` is true
		 */
		reset?: boolean;
		/**
		 * If `true`, reruns all `load` functions and queries of the page.
		 * @default false
		 */
		refreshAll?: boolean;
		/** Causes any `load` functions to rerun if they depend on one of the URLs. */
		invalidate?: Array<string | URL | ((url: URL) => boolean)>;
		/** @deprecated Use `refreshAll` instead. */
		invalidateAll?: boolean;
		/** An optional object that will be available as `page.state`. */
		state?: App.PageState;
		/**
		 * If `true`, `page.state` will be restored after a full page reload.
		 * @default false
		 */
		persistState?: boolean;
	}

	/**
	 * - `enter`: The app has hydrated/started
	 * - `form`: The user submitted a `<form method="GET">`
	 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
	 * - `leave`: The app is being left either because the tab is being closed or a navigation to a different document is occurring
	 * - `link`: Navigation was triggered by a link click
	 * - `popstate`: Navigation was triggered by back/forward navigation
	 */
	export type NavigationType = 'enter' | 'form' | 'leave' | 'link' | 'goto' | 'popstate';

	export interface NavigationBase {
		/**
		 * The type of navigation:
		 * - `enter`: The app has hydrated/started
		 * - `form`: The user submitted a `<form method="GET">`
		 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
		 * - `leave`: The app is being left either because the tab is being closed or a navigation to a different document is occurring
		 * - `link`: Navigation was triggered by a link click
		 * - `popstate`: Navigation was triggered by back/forward navigation
		 */
		type: NavigationType;
		/** Whether this is a shallow navigation. */
		shallow: boolean;
		/**
		 * Where navigation was triggered from
		 */
		from: NavigationTarget | null;
		/**
		 * Where navigation is going to/has gone to
		 */
		to: NavigationTarget | null;
		/**
		 * Whether or not the navigation will result in the page being unloaded (i.e. not a client-side navigation).
		 */
		willUnload: boolean;
		/**
		 * A promise that resolves once the navigation is complete, and rejects if the navigation
		 * fails or is aborted. In the case of a `willUnload` navigation, the promise will never resolve
		 */
		complete: Promise<void>;
	}

	/**
	 * The navigation that occurs when the app starts/hydrates
	 */
	export interface NavigationEnter extends NavigationBase {
		type: 'enter';

		/**
		 * In case of a history back/forward navigation, the number of steps to go back/forward
		 */
		delta?: undefined;

		/**
		 * Dispatched `Event` object when navigation occurred by `popstate` or `link`.
		 */
		event?: undefined;
	}

	export type NavigationExternal = NavigationGoto | NavigationLeave;

	/**
	 * A navigation triggered by a `goto(...)` call or a redirect
	 */
	export interface NavigationGoto extends NavigationBase {
		type: 'goto';
	}

	/**
	 * A navigation triggered by the tab being closed, or the user navigating to a different document
	 */
	export interface NavigationLeave extends NavigationBase {
		type: 'leave';
	}

	/**
	 * A navigation triggered by a `<form method="GET">`
	 */
	export interface NavigationFormSubmit extends NavigationBase {
		type: 'form';

		/**
		 * The `SubmitEvent` that caused the navigation
		 */
		event: SubmitEvent;
	}

	/**
	 * A navigation triggered by back/forward navigation
	 */
	export interface NavigationPopState extends NavigationBase {
		type: 'popstate';

		/**
		 * In case of a history back/forward navigation, the number of steps to go back/forward
		 */
		delta: number;

		/**
		 * The `PopStateEvent` that caused the navigation
		 */
		event: PopStateEvent;
	}

	/**
	 * A navigation triggered by a link click
	 */
	export interface NavigationLink extends NavigationBase {
		type: 'link';

		/**
		 * The `PointerEvent` that caused the navigation
		 */
		event: PointerEvent;
	}

	export type Navigation =
		| NavigationExternal
		| NavigationFormSubmit
		| NavigationPopState
		| NavigationLink;

	/**
	 * The argument passed to [`beforeNavigate`](https://svelte.dev/docs/kit/$app-navigation#beforeNavigate) callbacks.
	 */
	export type BeforeNavigate = Navigation & {
		/**
		 * Call this to prevent the navigation from starting.
		 */
		cancel: () => void;
	};

	/**
	 * The argument passed to [`onNavigate`](https://svelte.dev/docs/kit/$app-navigation#onNavigate) callbacks.
	 */
	export type OnNavigate = Navigation & {
		type: Exclude<NavigationType, 'enter' | 'leave'>;
		/**
		 * Since `onNavigate` callbacks are called immediately before a client-side navigation, they will never be called with a navigation that unloads the page.
		 */
		willUnload: false;
	};

	/**
	 * The argument passed to [`afterNavigate`](https://svelte.dev/docs/kit/$app-navigation#afterNavigate) callbacks.
	 */
	export type AfterNavigate = (Navigation | NavigationEnter) & {
		type: Exclude<NavigationType, 'leave'>;
		/**
		 * Since `afterNavigate` callbacks are called after a navigation completes, they will never be called with a navigation that unloads the page.
		 */
		willUnload: false;
	};
	/**
	 * A lifecycle function that captures state before navigating and restores it when traversing history.
	 *
	 * By default, the snapshot `id` is generated from the call site. Pass an explicit `id` to keep snapshots stable across deployments or distinguish multiple uses of a shared helper.
	 *
	 * The optional `reset` callback runs on navigations where there is no captured value to restore, such as when a new history entry is created. Captured values are serialized with the app's transport hook.
	 *
	 * `snapshot` must be called during a component initialization. It remains active as long as the component is mounted.
	 * */
	export function snapshot<T>(options: {
		id?: string;
		capture: () => T;
		restore: (value: T) => void;
		reset?: () => void;
	}): void;
	/**
	 * A lifecycle function that runs the supplied `callback` when the current component mounts, and also whenever we navigate to a URL.
	 *
	 * `afterNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
	 * */
	export function afterNavigate(callback: (navigation: AfterNavigate) => void): void;
	/**
	 * A navigation interceptor that triggers before we navigate to a URL, whether by clicking a link, calling `goto(...)`, or using the browser back/forward controls.
	 *
	 * Calling `cancel()` will prevent the navigation from completing. If `navigation.type === 'leave'` — meaning the user is navigating away from the app (or closing the tab) — calling `cancel` will trigger the native browser unload confirmation dialog. In this case, the navigation may or may not be cancelled depending on the user's response.
	 *
	 * When a navigation isn't to a SvelteKit-owned route (and therefore controlled by SvelteKit's client-side router), `navigation.to.route.id` will be `null`.
	 *
	 * If the navigation will (if not cancelled) cause the document to unload — in other words `'leave'` navigations and `'link'` navigations where `navigation.to.route === null` — `navigation.willUnload` is `true`.
	 *
	 * `beforeNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
	 * */
	export function beforeNavigate(callback: (navigation: BeforeNavigate) => void): void;
	/**
	 * A lifecycle function that runs the supplied `callback` immediately before we navigate to a new URL except during full-page navigations.
	 *
	 * If you return a `Promise`, SvelteKit will wait for it to resolve before completing the navigation. This allows you to — for example — use `document.startViewTransition`. Avoid promises that are slow to resolve, since navigation will appear stalled to the user.
	 *
	 * If a function (or a `Promise` that resolves to a function) is returned from the callback, it will be called once the DOM has updated.
	 *
	 * `onNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
	 * */
	export function onNavigate(callback: (navigation: OnNavigate) => MaybePromise<(() => void) | void>): void;
	/**
	 * If called when the page is being updated following a navigation (in `onMount` or `afterNavigate` or an action, for example), this disables SvelteKit's built-in scroll handling.
	 * This is generally discouraged, since it breaks user expectations.
	 * */
	export function disableScrollHandling(): void;
	/**
	 * Allows you to navigate programmatically to a given route, with control over details such as whether scroll and focus are reset
	 * (as they would be with a regular navigation) or preserved.
	 *
	 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) or the state change has been applied.
	 *
	 * `goto` is intended for navigations to routes that belong to the app, and will reject if a route cannot be resolved.
	 * For external URLs, use `window.location = url` to perform a full-page navigation instead of calling `goto(url)`.
	 *
	 * @param url Where to navigate to. Note that if you've set [`config.paths.base`](https://svelte.dev/docs/kit/configuration#paths) and the URL is root-relative, you need to prepend the base path if you want to navigate within the app.
	 * @param opts Options related to the navigation
	 * */
	export function goto(url: string | URL, opts?: GotoOptions): Promise<void>;
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
	 * @param resource The invalidated URL
	 * @param keepState If `true`, the current `page.state` will be preserved. Otherwise, it will be reset to an empty object. `false` by default.
	 * */
	export function invalidate(resource: string | URL | ((url: URL) => boolean), keepState?: boolean): Promise<void>;
	/**
	 * Causes all `load` and `query` functions belonging to the currently active page to re-run. Returns a `Promise` that resolves when the page is subsequently updated.
	 *
	 * Note that this resets `page.state` to an empty object. If you want to preserve `page.state` (for example when using [shallow routing](https://svelte.dev/docs/kit/shallow-routing)), use `refreshAll` instead.
	 *
	 * @deprecated Use [`refreshAll`](https://svelte.dev/docs/kit/$app-navigation#refreshAll) instead. Unlike `invalidateAll`, `refreshAll` does not reset `page.state`.
	 * */
	export function invalidateAll(): Promise<void>;
	/**
	 * Causes all currently active remote functions to refresh, and all `load` functions belonging to the currently active page to re-run.
	 * Returns a `Promise` that resolves when the page is subsequently updated.
	 * */
	export function refreshAll(): Promise<void>;
	/**
	 * Programmatically preloads the given page, which means
	 *  1. ensuring that the code for the page is loaded, and
	 *  2. calling the page's load function with the appropriate options.
	 *
	 * This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with `data-sveltekit-preload-data`.
	 * If the next navigation is to `href`, the values returned from load will be used, making navigation instantaneous.
	 * Returns a Promise that resolves with the result of running the new route's `load` functions once the preload is complete.
	 *
	 * @param href Page to preload
	 * */
	export function preloadData(href: string): Promise<({
		type: "loaded";
		data: Record<string, any>;
	} | {
		type: "redirect";
		location: string;
	} | {
		type: "error";
		error: App.Error;
	}) & {
		status: number;
	}>;
	/**
	 * Programmatically imports the code for routes that haven't yet been fetched.
	 * Typically, you might call this to speed up subsequent navigation.
	 *
	 * Takes a route ID such as `/about` or `/blog/[slug]`. Unlike pathnames, route IDs
	 * are never prefixed with the app's [base path](https://svelte.dev/docs/kit/configuration#paths).
	 * If you have a pathname rather than a route ID, you can convert it with
	 * [`match`](https://svelte.dev/docs/kit/$app-paths#match) from `$app/paths`:
	 *
	 * ```js
	 * import { match } from '$app/paths';
	 * import { preloadCode } from '$app/navigation';
	 *
	 * const matched = await match('/blog/hello-world');
	 * if (matched) await preloadCode(matched.id);
	 * ```
	 *
	 * Unlike `preloadData`, this won't call `load` functions.
	 * Returns a Promise that resolves when the modules have been imported.
	 *
	 * */
	export function preloadCode(id: import("$app/types").RouteId): Promise<void>;
	/**
	 * Programmatically create a new history entry with the given `page.state`. Used for [shallow routing](https://svelte.dev/docs/kit/shallow-routing).
	 *
	 * @deprecated Use `goto(url, { state, shallow: true })` instead.
	 * */
	export function pushState(url: string | URL, state: App.PageState): Promise<void>;
	/**
	 * Programmatically replace the current history entry with the given `page.state`. Used for [shallow routing](https://svelte.dev/docs/kit/shallow-routing).
	 *
	 * @deprecated Use `goto(url, { state, shallow: true, replace: true })` instead.
	 * */
	export function replaceState(url: string | URL, state: App.PageState): Promise<void>;
	type MaybePromise<T> = T | Promise<T>;

	export {};
}

declare module '$app/paths' {
	import type { AssetPath, RouteIdWithSearchOrHash, PathnameWithSearchOrHash, ResolvedPathname, RouteId, RouteParams } from '$app/types';
	/**
	 * Resolve the URL of an asset in your `static` directory, by prefixing it with [`config.paths.assets`](https://svelte.dev/docs/kit/configuration#paths) if configured, or otherwise by prefixing it with the base path.
	 *
	 * During server rendering, the base path is relative and depends on the page currently being rendered.
	 *
	 * @example
	 * ```svelte
	 * <script>
	 * 	import { asset } from '$app/paths';
	 * </script>
	 *
	 * <img alt="a potato" src={asset('potato.jpg')} />
	 * ```
	 * @since 2.26
	 *
	 * */
	export function asset(file: AssetPath): string;
	/**
	 * Resolve a pathname by prefixing it with the base path, if any, or resolve a route ID by populating dynamic segments with parameters.
	 *
	 * During server rendering, the base path is relative and depends on the page currently being rendered.
	 *
	 * @example
	 * ```js
	 * import { resolve } from '$app/paths';
	 *
	 * // using a pathname
	 * const resolved = resolve(`blog/hello-world`);
	 *
	 * // using a route ID plus parameters
	 * const resolved = resolve('/blog/[slug]', {
	 * 	slug: 'hello-world'
	 * });
	 * ```
	 * @since 2.26
	 *
	 * */
	export function resolve<T extends RouteIdWithSearchOrHash | PathnameWithSearchOrHash>(...args: ResolveArgs<T>): ResolvedPathname;
	/**
	 * Match a path or URL to a route ID and extracts any parameters.
	 *
	 * @example
	 * ```js
	 * import { match } from '$app/paths';
	 *
	 * const route = await match('blog/hello-world');
	 *
	 * if (route?.id === '/blog/[slug]') {
	 * 	const slug = route.params.slug;
	 * 	const response = await fetch(`/api/posts/${slug}`);
	 * 	const post = await response.json();
	 * }
	 * ```
	 * @since 2.52.0
	 *
	 * */
	export function match(url: URL | string): Promise<{ [K in RouteId]: {
		id: K;
		params: RouteParams<K>;
	}; }[RouteId] | null>;
	type StripSearchOrHash<T extends string> = T extends `${infer U}?${string}`
		? U
		: T extends `${infer U}#${string}`
			? U
			: T;

	type ResolveArgs<T> = T extends `/${string}`
		? StripSearchOrHash<T> extends infer U extends RouteId
			? RouteParams<U> extends Record<string, never>
				? [route: T]
				: [route: T, params: RouteParams<U>]
			: [never]
		: [pathname: T];

	export {};
}

declare module '$app/server' {
	import type { StandardSchemaV1 } from '@standard-schema/spec';
	import type { RouteId as AppRouteId, LayoutParams as AppLayoutParams } from '$app/types';
	/**
	 * Read the contents of an imported asset from the filesystem
	 * @example
	 * ```js
	 * import { read } from '$app/server';
	 * import somefile from './somefile.txt';
	 *
	 * const asset = read(somefile);
	 * const text = await asset.text();
	 * ```
	 * @since 2.4.0
	 */
	export function read(asset: string): Response;
	/**
	 * Returns the current `RequestEvent`. Can be used inside server hooks, server `load` functions, actions, and endpoints (and functions called by them).
	 *
	 * In environments without [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage), this must be called synchronously (i.e. not after an `await`).
	 * @since 2.20.0
	 *
	 * */
	export function getRequestEvent(): RequestEvent;
	/**
	 * Creates a remote command. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
	 *
	 * @since 2.27
	 */
	export function command<Output>(fn: () => MaybePromise<Output>): RemoteCommand<void, Output>;
	/**
	 * Creates a remote command. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
	 *
	 * @since 2.27
	 */
	export function command<Input, Output>(validate: "unchecked", fn: (arg: Input) => MaybePromise<Output>): RemoteCommand<Input, Output>;
	/**
	 * Creates a remote command. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
	 *
	 * @since 2.27
	 */
	export function command<Schema extends StandardSchemaV1, Output>(validate: Schema, fn: (arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>): RemoteCommand<StandardSchemaV1.InferInput<Schema>, Output>;
	/**
	 * Creates a form object that can be spread onto a `<form>` element.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
	 *
	 * @since 2.27
	 */
	export function form<Output>(fn: () => MaybePromise<Output>): RemoteForm<void, Output>;
	/**
	 * Creates a form object that can be spread onto a `<form>` element.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
	 *
	 * @since 2.27
	 */
	export function form<Input extends RemoteFormInput, Output>(validate: "unchecked", fn: (data: Input, issue: InvalidField<Input>) => MaybePromise<Output>): RemoteForm<Input, Output>;
	/**
	 * Creates a form object that can be spread onto a `<form>` element.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
	 *
	 * @since 2.27
	 */
	export function form<Schema extends StandardSchemaV1<RemoteFormInput, Record<string, any>>, Output>(validate: true extends HasNonOptionalBoolean<StandardSchemaV1.InferInput<Schema>> ? "Error: All booleans in form schemas must be optional (e.g. `v.optional(v.boolean(), false)`) because checkbox inputs do not send a false value when unchecked." : Schema, fn: (data: StandardSchemaV1.InferOutput<Schema>, issue: InvalidField<StandardSchemaV1.InferInput<Schema>>) => MaybePromise<Output>): RemoteForm<StandardSchemaV1.InferInput<Schema>, Output>;
	/**
	 * Creates a remote prerender function. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
	 *
	 * @since 2.27
	 */
	export function prerender<Output>(fn: () => MaybePromise<Output>, options?: {
		inputs?: RemotePrerenderInputsGenerator<void>;
		dynamic?: boolean;
	} | undefined): RemotePrerenderFunction<void, Output>;
	/**
	 * Creates a remote prerender function. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
	 *
	 * @since 2.27
	 */
	export function prerender<Input, Output>(validate: "unchecked", fn: (arg: Input) => MaybePromise<Output>, options?: {
		inputs?: RemotePrerenderInputsGenerator<Input>;
		dynamic?: boolean;
	} | undefined): RemotePrerenderFunction<Input, Output>;
	/**
	 * Creates a remote prerender function. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
	 *
	 * @since 2.27
	 */
	export function prerender<Schema extends StandardSchemaV1, Output>(schema: Schema, fn: (arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>, options?: {
		inputs?: RemotePrerenderInputsGenerator<StandardSchemaV1.InferInput<Schema>>;
		dynamic?: boolean;
	} | undefined): RemotePrerenderFunction<StandardSchemaV1.InferInput<Schema>, Output>;
	/**
	 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
	 *
	 * @since 2.27
	 */
	export function query<Output>(fn: () => MaybePromise<Output>): RemoteQueryFunction<void, Output>;
	/**
	 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
	 *
	 * @since 2.27
	 */
	export function query<Input, Output>(validate: "unchecked", fn: (arg: Input) => MaybePromise<Output>): RemoteQueryFunction<Input, Output>;
	/**
	 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
	 *
	 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
	 *
	 * @since 2.27
	 */
	export function query<Schema extends StandardSchemaV1, Output>(schema: Schema, fn: (arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>): RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output, StandardSchemaV1.InferOutput<Schema>>;
	export namespace query {
		/**
		 * Creates a batch query function that collects multiple calls and executes them in a single request
		 *
		 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.batch) for full documentation.
		 *
		 * @since 2.35
		 */
		function batch<Input, Output>(validate: "unchecked", fn: (args: Input[]) => MaybePromise<(arg: Input, idx: number) => Output>): RemoteQueryFunction<Input, Output>;
		/**
		 * Creates a batch query function that collects multiple calls and executes them in a single request
		 *
		 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.batch) for full documentation.
		 *
		 * @since 2.35
		 */
		function batch<Schema extends StandardSchemaV1, Output>(schema: Schema, fn: (args: StandardSchemaV1.InferOutput<Schema>[]) => MaybePromise<(arg: StandardSchemaV1.InferOutput<Schema>, idx: number) => Output>): RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output, StandardSchemaV1.InferOutput<Schema>>;
		/**
		 * Creates a live remote query. When called from the browser, the function will be invoked on the server via a streaming `fetch` call.
		 *
		 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.live) for full documentation.
		 *
		 * */
		function live<Output>(fn: (arg: void) => RemoteLiveQueryUserFunctionReturnType<Output>): RemoteLiveQueryFunction<void, Output>;
		
		function live<Input, Output>(validate: "unchecked", fn: (arg: Input) => RemoteLiveQueryUserFunctionReturnType<Output>): RemoteLiveQueryFunction<Input, Output>;
		
		function live<Schema extends StandardSchemaV1, Output>(schema: Schema, fn: (arg: StandardSchemaV1.InferOutput<Schema>) => RemoteLiveQueryUserFunctionReturnType<Output>): RemoteLiveQueryFunction<StandardSchemaV1.InferInput<Schema>, Output, StandardSchemaV1.InferOutput<Schema>>;
	}
	/**
	 * Inside a remote `command` or `form` callback, returns an iterable
	 * of `{ arg, query }` entries for the query instances the client asked to refresh, up to
	 * the supplied `limit`. Each `query` is a `RemoteQuery` bound to the original
	 * client-side cache key, so `refresh()` / `set()` propagate correctly even when
	 * the query's schema transforms the input. `arg` is the *validated* argument,
	 * i.e. the value after the schema has run (so `InferOutput<Schema>` for queries
	 * declared with a Standard Schema).
	 *
	 * Arguments that fail validation or exceed `limit` are recorded as failures in
	 * the response to the client.
	 * See [Client-requested refreshes](https://svelte.dev/docs/kit/remote-functions#Single-flight-mutations-Client-requested-refreshes)
	 * for usage in a remote `command` or `form`.
	 *
	 * @example
	 * ```ts
	 * import { requested } from '$app/server';
	 *
	 * for (const { arg, query } of requested(getPost, 5)) {
	 * 	// `arg` is the validated argument; `query` is bound to the client's
	 * 	// cache key. It's safe to throw away this promise -- SvelteKit will
	 * 	// await it and forward any errors to the client.
	 * 	void query.refresh();
	 * }
	 * ```
	 *
	 * As a shorthand for the above, you can also call `refreshAll` on the result:
	 *
	 * @example
	 * ```ts
	 * import { requested } from '$app/server';
	 *
	 * await requested(getPost, 5).refreshAll();
	 * ```
	 *
	 * Works with `query.batch` as well — refreshes for individual entries are
	 * collected into a single batched call.
	 *
	 * For live queries, the same applies, but with `reconnect` and `reconnectAll`.
	 *
	 * */
	export function requested<Input, Output, Validated = Input>(query: RemoteQueryFunction<Input, Output, Validated>, limit: number): QueryRequestedResult<Validated, Output>;
	/**
	 * Inside a remote `command` or `form` callback, returns an iterable
	 * of `{ arg, query }` entries for the live query instances the client asked to reconnect, up to
	 * the supplied `limit`. Each `query` is a `RemoteLiveQuery` bound to the original
	 * client-side cache key, so `reconnect()` propagates correctly even when
	 * the query's schema transforms the input. `arg` is the *validated* argument.
	 *
	 * Arguments that fail validation or exceed `limit` are recorded as failures in
	 * the response to the client.
	 * See [Client-requested refreshes](https://svelte.dev/docs/kit/remote-functions#Single-flight-mutations-Client-requested-refreshes)
	 * for usage in a remote `command` or `form`.
	 *
	 * @example
	 * ```ts
	 * import { requested } from '$app/server';
	 *
	 * for (const { query } of requested(getPost, 5)) {
	 * 	void query.reconnect();
	 * }
	 * ```
	 *
	 * As a shorthand, you can also call `reconnectAll` on the result:
	 *
	 * @example
	 * ```ts
	 * import { requested } from '$app/server';
	 *
	 * await requested(getPost, 5).reconnectAll();
	 * ```
	 *
	 * */
	export function requested<Input, Output, Validated = Input>(query: RemoteLiveQueryFunction<Input, Output, Validated>, limit: number): LiveQueryRequestedResult<Validated, Output>;
	// @ts-ignore this is an optional peer dependency so could be missing. Written like this so dts-buddy preserves the ts-ignore
	type Span = import('@opentelemetry/api').Span;

	interface Cookies {
		/**
		 * Gets a cookie that was previously set with `cookies.set`, or from the request headers.
		 * @param name the name of the cookie
		 * @param opts the options, passed directly to `cookie.parseCookie`. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookieparsecookiestr-options)
		 */
		get: (name: string, opts?: import('cookie').ParseOptions) => string | undefined;

		/**
		 * Gets all cookies that were previously set with `cookies.set`, or from the request headers.
		 * @param opts the options, passed directly to `cookie.parseCookie`. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookieparsecookiestr-options)
		 */
		getAll: (opts?: import('cookie').ParseOptions) => Array<{ name: string; value: string }>;

		/**
		 * Sets a cookie. This will add a `set-cookie` header to the response, but also make the cookie available via `cookies.get` or `cookies.getAll` during the current request.
		 *
		 * The `httpOnly` is `true` by default, as is `secure`, except during development, when it defaults to `false`. These must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP.
		 *
		 * The `path` option is `'/'` by default. You can use relative paths, or set `path: ''` to make the cookie only available on the current path and its children.
		 * @param name the name of the cookie
		 * @param value the cookie value
		 * @param opts the options passed to `cookie.stringifySetCookie` with the SvelteKit defaults described above. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookiestringifysetcookiesetcookieobj-options)
		 */
		set: (name: string, value: string, opts: import('cookie').SerializeOptions) => void;

		/**
		 * Deletes a cookie by setting its value to an empty string and setting the expiry date in the past.
		 *
		 * The `httpOnly` is `true` by default, as is `secure`, except during development, when it defaults to `false`. These must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP.
		 *
		 * The `path` option is `'/'` by default. You can use relative paths, or set `path: ''` to make the cookie only available on the current path and its children.
		 * @param name the name of the cookie
		 * @param opts the options passed to `cookie.stringifySetCookie` with the SvelteKit defaults described above. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookiestringifysetcookiesetcookieobj-options)
		 */
		delete: (name: string, opts: import('cookie').SerializeOptions) => void;

		/**
		 * Parses a single `Set-Cookie` header. This allows you to apply cookies received from an external source:
		 *
		 * ```js
		 * import { getRequestEvent } from '$app/server';
		 *
		 * export async function GET() {
		 * 	const { cookies } = getRequestEvent();
		 *
		 * 	const response = await fetch('...');
		 *
		 * 	for (const str of response.headers.getSetCookie()) {
		 * 		const { name, value, ...options } = cookies.parse(str);
		 * 		cookies.set(name, value, { ...options, path: '/' });
		 * 	}
		 *
		 * 	// ...
		 * }
		 * ```
		 *
		 * Note the use of `headers.getSetCookie()`, which returns an array of cookie headers, _not_ `headers.get('set-cookie')` which returns a single comma-separated string.
		 */
		parse: typeof import('cookie').parseSetCookie;

		/**
		 * Serialize a cookie name-value pair into a `Set-Cookie` header string, but don't apply it to the response.
		 *
		 * The `httpOnly` is `true` by default, as is `secure`, except during development, when it defaults to `false`. These must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP.
		 *
		 * The `path` option is `'/'` by default. You can use relative paths, or set `path: ''` to make the cookie only available on the current path and its children.
		 * @param name the name of the cookie
		 * @param value the cookie value
		 * @param opts the options passed to `cookie.stringifySetCookie` with the SvelteKit defaults described above. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookiestringifysetcookiesetcookieobj-options)
		 */
		serialize: (name: string, value: string, opts: import('cookie').SerializeOptions) => string;
	}

	interface RequestEvent<
		Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
		RouteId extends AppRouteId | null = AppRouteId | null
	> {
		/**
		 * Get or set cookies related to the current request
		 */
		readonly cookies: Cookies;
		/**
		 * `fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:
		 *
		 * - It can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request.
		 * - It can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context).
		 * - Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.
		 * - During server-side rendering, the response will be captured and inlined into the rendered HTML by hooking into the `text` and `json` methods of the `Response` object. Note that headers will _not_ be serialized, unless explicitly included via [`filterSerializedResponseHeaders`](https://svelte.dev/docs/kit/hooks#handle)
		 * - During hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request.
		 *
		 * You can learn more about making credentialed requests with cookies [here](https://svelte.dev/docs/kit/load#Cookies).
		 */
		readonly fetch: typeof fetch;
		/**
		 * The client's IP address, set by the adapter.
		 */
		readonly getClientAddress: () => string;
		/**
		 * Contains custom data that was added to the request within the [`server handle hook`](https://svelte.dev/docs/kit/hooks#handle).
		 */
		readonly locals: App.Locals;
		/**
		 * The parameters of the current route - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object.
		 *
		 * Inside `query` functions (including `query.batch` and `query.live`), accessing this property throws an error.
		 * Pass values from the page as arguments to the query instead. Inside `form` and `command` functions it relates to the page
		 * the remote function was called from, _not_ the URL of the endpoint SvelteKit creates for the remote function. Never use it
		 * to determine whether or not a user is authorized to access certain data, as these values are part of the request which could be manipulated.
		 */
		readonly params: Params;
		/**
		 * Additional data made available through the adapter.
		 */
		readonly platform: Readonly<App.Platform> | undefined;
		/**
		 * The original request object.
		 */
		readonly request: Request;
		/**
		 * Info about the current route.
		 */
		readonly route: {
			/**
			 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`. It is `null` when no route is matched.
			 *
			 * Inside `query` functions (including `query.batch` and `query.live`), accessing this property throws an error.
			 * Pass values from the page as arguments to the query instead. Inside `form` and `command` functions it relates to the page
			 * the remote function was called from, _not_ the URL of the endpoint SvelteKit creates for the remote function. Never use it
			 * to determine whether or not a user is authorized to access certain data, as these values are part of the request which could be manipulated.
			 */
			id: RouteId;
		};
		/**
		 * If you need to set headers for the response, you can do so using the this method. This is useful if you want the page to be cached, for example:
		 *
		 *	```js
		 *	/// file: src/routes/blog/+page.js
		 *	export async function load({ fetch, setHeaders }) {
		 *		const url = `https://cms.example.com/articles.json`;
		 *		const response = await fetch(url);
		 *
		 *		setHeaders({
		 *			age: response.headers.get('age'),
		 *			'cache-control': response.headers.get('cache-control')
		 *		});
		 *
		 *		return response.json();
		 *	}
		 *	```
		 *
		 * Setting the same header multiple times (even in separate `load` functions) is an error — you can only set a given header once.
		 *
		 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://svelte.dev/docs/kit/@sveltejs-kit#Cookies) API instead.
		 */
		readonly setHeaders: (headers: Record<string, string>) => void;
		/**
		 * The requested URL.
		 *
		 * Inside `query` functions (including `query.batch` and `query.live`), accessing this property throws an error.
		 * Pass values from the page as arguments to the query instead. Inside `form` and `command` functions it relates to the page
		 * the remote function was called from, _not_ the URL of the endpoint SvelteKit creates for the remote function. Never use it
		 * to determine whether or not a user is authorized to access certain data, as these values are part of the request which could be manipulated.
		 */
		readonly url: URL;
		/**
		 * `true` if the request comes from the client asking for `+page/layout.server.js` data. The `url` property will be stripped of the internal information
		 * related to the data request in this case. Use this property instead if the distinction is important to you.
		 */
		readonly isDataRequest: boolean;
		/**
		 * `true` for `+server.js` calls coming from SvelteKit without the overhead of actually making an HTTP request. This happens when you make same-origin `fetch` requests on the server.
		 */
		readonly isSubRequest: boolean;

		/**
		 * Access to spans for tracing. If tracing is not enabled, these spans will do nothing.
		 * @since 2.31.0
		 */
		readonly tracing: {
			/** Whether tracing is enabled. */
			enabled: boolean;
			/** The root span for the request. This span is named `sveltekit.handle.root`. */
			root: Span;
			/** The span associated with the current `handle` hook, `load` function, or form action. */
			current: Span;
		};

		/**
		 * `true` if the request comes from the client via a remote function. The `url` property will be stripped of the internal information
		 * related to the data request in this case. Use this property instead if the distinction is important to you.
		 */
		readonly isRemoteRequest: boolean;
	}
	type RemoteLiveQueryUserFunctionReturnType<Output> = MaybePromise<
		| AsyncGenerator<Output>
		| AsyncIterator<Output>
		| AsyncIterable<Output>
		| Generator<Output>
		| Iterator<Output>
		| Iterable<Output>
	>;
	type RemotePrerenderInputsGenerator<Input = any> = () => MaybePromise<Input[]>;
	// If T is unknown or has an index signature, the types below will recurse indefinitely and create giant unions that TS can't handle
	type WillRecurseIndefinitely<T> = unknown extends T ? true : string extends keyof T ? true : false;

	// Input type mappings for form fields
	type InputTypeMap = {
		text: string;
		email: string;
		password: string;
		url: string;
		tel: string;
		search: string;
		number: number;
		range: number;
		date: string;
		'datetime-local': string;
		time: string;
		month: string;
		week: string;
		color: string;
		checkbox: boolean | string[];
		radio: string;
		file: File;
		hidden: string | number | boolean;
		submit: string | number | boolean;
		button: string;
		reset: string;
		image: string;
		select: string;
		'select multiple': string[];
		'file multiple': File[];
	};

	// Valid input types for a given value type
	type RemoteFormFieldType<T> = {
		[K in keyof InputTypeMap]: T extends InputTypeMap[K] ? K : never;
	}[keyof InputTypeMap];

	// Input element properties based on type
	type InputElementProps<T extends keyof InputTypeMap> = T extends 'checkbox' | 'radio'
		? {
				name: string;
				type: T;
				value?: string;
				'aria-invalid': boolean | 'false' | 'true' | undefined;
				get checked(): boolean;
				set checked(value: boolean);
				readonly defaultChecked?: boolean;
			}
		: T extends 'file'
			? {
					name: string;
					type: 'file';
					'aria-invalid': boolean | 'false' | 'true' | undefined;
					get files(): FileList | null;
					set files(v: FileList | null);
				}
			: T extends 'select'
				? {
						name: string;
						'aria-invalid': boolean | 'false' | 'true' | undefined;
						get value(): string;
						set value(v: string);
					}
				: T extends 'select multiple'
					? {
							name: string;
							multiple: true;
							'aria-invalid': boolean | 'false' | 'true' | undefined;
							get value(): string[];
							set value(v: string[]);
						}
					: T extends 'text'
						? {
								name: string;
								'aria-invalid': boolean | 'false' | 'true' | undefined;
								get value(): string | number;
								set value(v: string | number);
								readonly defaultValue?: string | number;
							}
						: {
								name: string;
								type: T;
								'aria-invalid': boolean | 'false' | 'true' | undefined;
								get value(): string | number;
								set value(v: string | number);
								readonly defaultValue?: string | number;
							};

	type RemoteFormFieldMethods<T> = {
		/** The values that will be submitted */
		value(): DeepPartial<T>;
		/** Set the values that will be submitted */
		set(input: DeepPartial<T>): DeepPartial<T>;
		/** Whether the field or any nested field has been interacted with since the form was mounted */
		touched(): boolean;
		/** Whether the field or any nested field has been edited since the form was mounted */
		dirty(): boolean;
		/** Validation issues, if any */
		issues(): RemoteFormIssue[] | undefined;
	};

	// These two types use "T extends unknown ? .. : .." to distribute over unions.
	// Example: if "type T = A | b" then "keyof T" only contains keys that both A and B have, with "KeysOfUnion<T>" we get the keys of both A and B
	type KeysOfUnion<T> = T extends unknown ? keyof T : never;
	type ValueOfUnionKey<T, K extends PropertyKey> = T extends unknown
		? K extends keyof T
			? T[K]
			: never
		: never;

	type RemoteFormFieldValue = string | string[] | number | boolean | File | File[];

	type AsArgs<Type extends keyof InputTypeMap, Value> = Type extends 'checkbox'
		? Value extends string[]
			? [type: Type, value: Value[number] | (string & {})]
			: Value extends boolean
				? [type: Type] | [type: Type, value: boolean]
				: [type: Type] | [type: Type, value: Value | (string & {})]
		: Type extends 'submit' | 'hidden'
			? Value extends string
				? [type: Type, value: Value | (string & {})]
				: [type: Type, value: Value]
			: Type extends 'radio'
				? [type: Type, value: Value | (string & {})]
				: Type extends 'file' | 'file multiple'
					? [type: Type]
					: [type: Type] | [type: Type, value: Value | undefined];

	/**
	 * Form field accessor type that provides name(), value(), and issues() methods
	 */
	type RemoteFormField<Value extends RemoteFormFieldValue> = RemoteFormFieldMethods<Value> & {
		/**
		 * Returns an object that can be spread onto an input element with the correct type attribute,
		 * aria-invalid attribute if the field is invalid, and appropriate value/checked property getters/setters.
		 * @example
		 * ```svelte
		 * <input {...myForm.fields.myString.as('text')} />
		 * <input {...myForm.fields.myNumber.as('number')} />
		 * <input {...myForm.fields.myBoolean.as('checkbox')} />
		 * ```
		 */
		as<T extends RemoteFormFieldType<Value>>(...args: AsArgs<T, Value>): InputElementProps<T>;
	};

	type RemoteFormFieldContainer<Value> = RemoteFormFieldMethods<Value> & {
		/** Validation issues belonging to this or any of the fields that belong to it, if any */
		allIssues(): RemoteFormIssue[] | undefined;
	};

	type UnknownField<Value> = RemoteFormFieldMethods<Value> & {
		/** Validation issues belonging to this or any of the fields that belong to it, if any */
		allIssues(): RemoteFormIssue[] | undefined;
		/**
		 * Returns an object that can be spread onto an input element with the correct type attribute,
		 * aria-invalid attribute if the field is invalid, and appropriate value/checked property getters/setters.
		 * @example
		 * ```svelte
		 * <input {...myForm.fields.myString.as('text')} />
		 * <input {...myForm.fields.myNumber.as('number')} />
		 * <input {...myForm.fields.myBoolean.as('checkbox')} />
		 * ```
		 */
		as<T extends RemoteFormFieldType<Value>>(...args: AsArgs<T, Value>): InputElementProps<T>;
	} & {
		[key: string | number]: UnknownField<any>;
	};

	type RemoteFormFieldsRoot<Input extends RemoteFormInput | void> =
		IsAny<Input> extends true
			? RecursiveFormFields
			: Input extends void
				? {
						/** Validation issues, if any */
						issues(): RemoteFormIssue[] | undefined;
						/** Validation issues belonging to this or any of the fields that belong to it, if any */
						allIssues(): RemoteFormIssue[] | undefined;
					}
				: RemoteFormFields<Input>;

	/**
	 * Recursive type to build form fields structure with proxy access
	 */
	type RemoteFormFields<T> =
		WillRecurseIndefinitely<T> extends true
			? RecursiveFormFields
			: NonNullable<T> extends string | number | boolean | File
				? RemoteFormField<NonNullable<T>>
				: // [NonNullable<T>] is used to prevent distributing over union while still allowing
					// nullable wrappers (e.g. `string[] | undefined` from a schema with `.default([])`)
					// to be treated as arrays; only the last condition should distribute over unions
					[NonNullable<T>] extends [string[] | File[]]
					? RemoteFormField<NonNullable<T>> & {
							[K in number]: RemoteFormField<NonNullable<T>[number]>;
						}
					: [NonNullable<T>] extends [Array<infer U>]
						? RemoteFormFieldContainer<NonNullable<T>> & {
								[K in number]: RemoteFormFields<U>;
							}
						: RemoteFormFieldContainer<T> & {
								[K in KeysOfUnion<T>]-?: RemoteFormFields<ValueOfUnionKey<T, K>>;
							};

	// By breaking this out into its own type, we avoid the TS recursion depth limit
	type RecursiveFormFields = RemoteFormFieldContainer<any> & {
		[key: string | number]: UnknownField<any>;
	};

	type MaybeArray<T> = T | T[];

	interface RemoteFormInput {
		[key: string]: MaybeArray<string | number | boolean | File | RemoteFormInput> | undefined;
	}

	interface RemoteFormIssue {
		message: string;
		path: Array<string | number>;
	}

	// If the schema specifies `id` as a string or number, ensure that `for(...)`
	// only accepts that type. Otherwise, accept `string | number`
	type ExtractId<Input> = Input extends { id: infer Id }
		? Id extends string | number
			? Id
			: string | number
		: string | number;

	/**
	 * A function and proxy object used to imperatively create validation errors in form handlers.
	 *
	 * Access properties to create field-specific issues: `issue.fieldName('message')`.
	 * The type structure mirrors the input data structure for type-safe field access.
	 * Call `invalid(issue.foo(...), issue.nested.bar(...))` to throw a validation error.
	 */
	type InvalidField<T> =
		WillRecurseIndefinitely<T> extends true
			? Record<string | number, any>
			: NonNullable<T> extends string | number | boolean | File
				? (message: string) => StandardSchemaV1.Issue
				: NonNullable<T> extends Array<infer U>
					? {
							[K in number]: InvalidField<U>;
						} & ((message: string) => StandardSchemaV1.Issue)
					: NonNullable<T> extends RemoteFormInput
						? {
								[K in keyof T]-?: InvalidField<T[K]>;
							} & ((message: string) => StandardSchemaV1.Issue)
						: Record<string, never>;

	/**
	 * The form instance as received inside an `enhance` callback. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
	 */
	type RemoteFormEnhanceInstance<
		Input extends RemoteFormInput | void = RemoteFormInput | void,
		Output = any
	> = Omit<RemoteForm<Input, Output>, 'enhance' | 'element'> & {
		readonly element: HTMLFormElement;
	};

	/**
	 * The callback passed to a remote form's `enhance` method. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
	 */
	type RemoteFormEnhanceCallback<
		Input extends RemoteFormInput | void = RemoteFormInput | void,
		Output = any
	> = (form: RemoteFormEnhanceInstance<Input, Output>) => MaybePromise<void>;

	/**
	 * The type of a remote `form` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
	 */
	type RemoteForm<Input extends RemoteFormInput | void, Output> = {
		/** Attachment that sets up an event handler that intercepts the form submission on the client to prevent a full page reload */
		[attachment: symbol]: (node: HTMLFormElement) => void;
		method: 'POST';
		/** The URL to send the form to. */
		action: string;
		/** The `<form>` element this instance is currently attached to, if any. */
		get element(): HTMLFormElement | null;
		/** Submit the currently attached form programmatically. */
		submit(): Promise<boolean> & {
			updates: (...updates: RemoteQueryUpdate[]) => Promise<boolean>;
		};
		/** Use the `enhance` method to influence what happens when the form is submitted. */
		enhance(callback: RemoteFormEnhanceCallback<Input, Output>): {
			method: 'POST';
			action: string;
			[attachment: symbol]: (node: HTMLFormElement) => void;
		};
		/**
		 * Create an instance of the form for the given `id`.
		 * The `id` is stringified and used for deduplication to potentially reuse existing instances.
		 * Useful when you have multiple forms that use the same remote form action, for example in a loop.
		 * ```svelte
		 * {#each todos as todo}
		 *	{const todoForm = updateTodo.for(todo.id)}
		 *	<form {...todoForm}>
		 *		{#if todoForm.result?.invalid}<p>Invalid data</p>{/if}
		 *		...
		 *	</form>
		 *	{/each}
		 * ```
		 */
		for(id: ExtractId<Input>): Omit<RemoteForm<Input, Output>, 'for'>;
		/** Preflight checks */
		preflight(schema: StandardSchemaV1<Input, any>): RemoteForm<Input, Output>;
		/** Validate the form contents programmatically */
		validate(options?: {
			/**
			 * Set this to `true` to also show validation issues of fields that haven't yet been
			 * edited and blurred. This option is ignored for forms that have previously been
			 * submitted, in which case all fields are always subject to validation
			 * (unless the form is reset, at which point it is treated as pristine)
			 */
			all?: boolean;
			/** Set this to `true` to only run the `preflight` validation. */
			preflightOnly?: boolean;
		}): Promise<void>;
		/** The result of the form submission */
		get result(): Output | undefined;
		/** The number of pending submissions */
		get pending(): number;
		/** True if the form has been submitted at least once, and hasn't been reset since */
		get submitted(): boolean;
		/** Access form fields using object notation */
		fields: RemoteFormFieldsRoot<Input>;
	};

	/**
	 * The type of a remote `command` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
	 */
	type RemoteCommand<Input, Output> = {
		(arg: undefined extends Input ? Input | void : Input): Promise<Output> & {
			updates(...updates: RemoteQueryUpdate[]): Promise<Output>;
		};
		/** The number of pending command executions */
		get pending(): number;
	};

	type RemoteQueryUpdate =
		| RemoteQuery<any>
		| RemoteLiveQuery<any>
		| RemoteQueryFunction<any, any>
		| RemoteLiveQueryFunction<any, any>
		| RemoteQueryOverride;

	type RemoteResource<T> = Promise<T> & {
		/** The error in case the query fails. */
		get error(): App.Error | undefined;
		/** `true` before the first result is available and during refreshes */
		get loading(): boolean;
	} & (
			| {
					/** The current value of the query. Undefined until `ready` is `true` */
					get current(): undefined;
					ready: false;
			  }
			| {
					/** The current value of the query. Undefined until `ready` is `true` */
					get current(): T;
					ready: true;
			  }
		);

	type RemoteQuery<T> = RemoteResource<T> & {
		/**
		 * On the client, this function will update the value of the query without re-fetching it.
		 *
		 * On the server, this can be called in the context of a `command` or `form` and the specified data will accompany the action response back to the client.
		 * This prevents SvelteKit needing to refresh all queries on the page in a second server round-trip.
		 */
		set(value: T): void;
		/**
		 * On the client, this function will re-fetch the query from the server.
		 *
		 * On the server, this can be called in the context of a `command` or `form` and the refreshed data will accompany the action response back to the client.
		 * This prevents SvelteKit needing to refresh all queries on the page in a second server round-trip.
		 */
		refresh(): Promise<void>;
		/**
		 * Temporarily override a query's value during a [single-flight mutation](https://svelte.dev/docs/kit/remote-functions#Single-flight-mutations) to provide optimistic updates.
		 *
		 * ```svelte
		 * <script>
		 *   import { getTodos, addTodo } from './todos.remote.js';
		 *   const todos = getTodos();
		 * </script>
		 *
		 * <form {...addTodo.enhance(async (form) => {
		 *   await form.submit().updates(
		 *     todos.withOverride((todos) => [...todos, { text: form.fields.text.value() }])
		 *   );
		 * })}>
		 *   <input type="text" name="text" />
		 *   <button type="submit">Add Todo</button>
		 * </form>
		 * ```
		 */
		withOverride(update: (current: T) => T): RemoteQueryOverride;
	};

	type RemoteLiveQuery<T> = RemoteResource<T> &
		AsyncIterable<T> & {
			/** `true` if the live stream is currently connected. */
			readonly connected: boolean;
			/** `true` once the current live stream iterator is done. */
			readonly done: boolean;
			/** Reconnects the live stream immediately. */
			reconnect(): Promise<void>;
		};

	type RemoteQueryOverride = () => void;

	/**
	 * The type of a remote `prerender` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
	 */
	type RemotePrerenderFunction<Input, Output> = (
		arg: undefined extends Input ? Input | void : Input
	) => RemoteResource<Output>;

	/**
	 * The return value of a remote `query` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
	 *
	 * The optional `Validated` generic parameter represents the argument type *after* the
	 * query's schema has validated and (optionally) transformed it — this is the type the
	 * query's implementation function receives on the server, and the type yielded by
	 * [`requested`](https://svelte.dev/docs/kit/$app-server#requested). For queries declared
	 * with [Standard Schema](https://standardschema.dev/) it differs from `Input` when the
	 * schema contains a transform (e.g. `v.pipe(v.number(), v.transform(String))` has
	 * `Input = number` but `Validated = string`). For `'unchecked'` validators and queries
	 * without arguments it defaults to `Input`.
	 */
	type RemoteQueryFunction<Input, Output, _Validated = Input> = (
		arg: undefined extends Input ? Input | void : Input
	) => RemoteQuery<Output>;

	/**
	 * The type of a remote `query.live` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.live) for full documentation.
	 *
	 * The optional `Validated` generic parameter represents the argument type *after* the
	 * query's schema has validated and (optionally) transformed it, and matches the type
	 * yielded by [`requested`](https://svelte.dev/docs/kit/$app-server#requested).
	 */
	type RemoteLiveQueryFunction<Input, Output, _Validated = Input> = (
		arg: undefined extends Input ? Input | void : Input
	) => RemoteLiveQuery<Output>;

	/**
	 * A single entry yielded by [`requested`](https://svelte.dev/docs/kit/$app-server#requested)
	 * when called with a regular `query`. `arg` is the validated argument (the input *after*
	 * the query's schema validated and transformed it, if applicable); `query` is a
	 * `RemoteQuery` bound to the client's original cache key, so `refresh()` / `set()` will
	 * update the correct client entry.
	 */
	type RequestedEntry<Validated, Output> = {
		arg: Validated;
		query: RemoteQuery<Output>;
	};

	/**
	 * A single entry yielded by [`requested`](https://svelte.dev/docs/kit/$app-server#requested)
	 * when called with a `query.live`. `arg` is the validated argument; `query` is a
	 * `RemoteLiveQuery` bound to the client's original cache key, so `reconnect()` targets
	 * the correct client subscription.
	 */
	type LiveRequestedEntry<Validated, Output> = {
		arg: Validated;
		query: RemoteLiveQuery<Output>;
	};

	type QueryRequestedResult<Validated, Output> = Iterable<RequestedEntry<Validated, Output>> &
		AsyncIterable<RequestedEntry<Validated, Output>> & {
			/**
			 * Call `refresh` on all queries selected by this `requested` invocation.
			 * This is identical to:
			 * ```ts
			 * import { requested } from '$app/server';
			 *
			 * for await (const { query } of requested(getPost, ...)) {
			 *   void query.refresh();
			 * }
			 * ```
			 */
			refreshAll: () => Promise<void>;
		};

	type LiveQueryRequestedResult<Validated, Output> = Iterable<
		LiveRequestedEntry<Validated, Output>
	> &
		AsyncIterable<LiveRequestedEntry<Validated, Output>> & {
			/**
			 * Call `reconnect` on all live queries selected by this `requested` invocation.
			 * This is identical to:
			 * ```ts
			 * import { requested } from '$app/server';
			 *
			 * for await (const { query } of requested(liveQuery, ...)) {
			 *   void query.reconnect();
			 * }
			 * ```
			 */
			reconnectAll: () => Promise<void>;
		};
	type MaybePromise<T> = T | Promise<T>;

	type DeepPartial<T> = T extends Record<PropertyKey, unknown> | unknown[]
		? {
				[K in keyof T]?: T[K] extends Record<PropertyKey, unknown> | unknown[]
					? DeepPartial<T[K]>
					: T[K];
			}
		: T | undefined;

	type IsAny<T> = 0 extends 1 & T ? true : false;

	type HasNonOptionalBoolean<T> =
		IsAny<T> extends true
			? never
			: [T] extends [boolean]
				? true
				: T extends Array<infer U>
					? HasNonOptionalBoolean<U>
					: T extends Record<string, any>
						? { [K in keyof T]: HasNonOptionalBoolean<T[K]> }[keyof T]
						: never;

	export {};
}

declare module '$app/service-worker' {
	/**
	 * The execution context of a service worker. This export exists to make it easier to
	 * use service workers with the correct types, provided the importing module is governed
	 * by a `tsconfig.json` that extends [`$app/tsconfig/service-worker`](https://svelte.dev/docs/kit/$app-tsconfig-service-worker).
	 *
	 */
	// @ts-ignore
	export const self: ServiceWorkerGlobalScope;

	export {};
}

declare module '$app/state' {
	import type { LayoutParams as AppLayoutParams, ResolvedPathname, RouteId as AppRouteId } from '$app/types';
	import type { Navigation } from '$app/navigation';
	export type ReadonlyURLSearchParams = Omit<URLSearchParams, 'set' | 'append' | 'delete' | 'sort'>;

	export type ReadonlyURL = Readonly<
		Omit<URL, 'searchParams'> & {
			searchParams: ReadonlyURLSearchParams;
		}
	>;

	/**
	 * The shape of the [`page`](https://svelte.dev/docs/kit/$app-state#page) reactive object.
	 */
	export interface Page<
		Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
		RouteId extends AppRouteId | null = AppRouteId | null
	> {
		/**
		 * The URL of the current page.
		 */
		url: ReadonlyURL & { readonly pathname: ResolvedPathname | (string & {}) };
		/**
		 * The parameters of the current page - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object.
		 */
		params: Params;
		/**
		 * Info about the current route.
		 */
		route: {
			/**
			 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`. It is `null` when no route is matched.
			 */
			id: RouteId;
		};
		/**
		 * HTTP status code of the current page.
		 */
		status: number;
		/**
		 * The error object of the current page, if any. Filled from the `handleError` hooks.
		 */
		error: App.Error | null;
		/**
		 * The merged result of all data from all `load` functions on the current page. You can type a common denominator through `App.PageData`.
		 */
		data: App.PageData & Record<string, any>;
		/**
		 * The page state, which can be manipulated using [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) from `$app/navigation`.
		 */
		state: App.PageState;
		/**
		 * Information about the target of the current shallow navigation, or `null` if no shallow navigation has occurred.
		 */
		shallow: {
			/** Parameters of the target route, or `null` if the URL does not resolve to a route. */
			params: AppLayoutParams<'/'> | null;
			/** Info about the target route, or `null` if the URL does not resolve to a route. */
			route: { id: AppRouteId } | null;
			/** The normalized URL passed to `goto(..., { shallow: true })`. */
			url: ReadonlyURL;
		} | null;
		/**
		 * Filled only after a form submission. See [form actions](https://svelte.dev/docs/kit/form-actions) for more info.
		 */
		form: any;
	}
	/**
	 * A read-only reactive object with information about the current page, serving several use cases:
	 * - retrieving the combined `data` of all pages/layouts anywhere in your component tree (also see [loading data](https://svelte.dev/docs/kit/load))
	 * - retrieving the current value of the `form` prop anywhere in your component tree (also see [form actions](https://svelte.dev/docs/kit/form-actions))
	 * - retrieving the page state that was set through `goto` (also see [goto](https://svelte.dev/docs/kit/$app-navigation#goto) and [shallow routing](https://svelte.dev/docs/kit/shallow-routing))
	 * - retrieving metadata such as the URL you're on, the current route and its parameters, the target of a shallow navigation, and whether or not there was an error
	 *
	 * ```svelte
	 * <!--- file: +layout.svelte --->
	 * <script>
	 * 	import { page } from '$app/state';
	 * </script>
	 *
	 * <p>Currently at {page.url.pathname}</p>
	 *
	 * {#if page.error}
	 * 	<span class="red">Problem detected</span>
	 * {:else}
	 * 	<span class="small">All systems operational</span>
	 * {/if}
	 * ```
	 *
	 * Changes to `page` are available exclusively with runes. (The legacy reactivity syntax will not reflect any changes)
	 *
	 * ```svelte
	 * <!--- file: +page.svelte --->
	 * <script>
	 * 	import { page } from '$app/state';
	 * 	const id = $derived(page.params.id); // This will correctly update id for usage on this page
	 * 	$: badId = page.params.id; // Do not use; will never update after initial load
	 * </script>
	 * ```
	 *
	 * On the server, values can only be read during rendering (in other words _not_ in e.g. `load` functions). In the browser, the values can be read at any time.
	 *
	 * */
	export const page: Page;
	/**
	 * A read-only object representing an in-progress navigation, with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
	 * Values are `null` when no navigation is occurring, or during server rendering.
	 * */
	export const navigating: Navigation | {
		from: null;
		to: null;
		type: null;
		willUnload: null;
		delta: null;
		complete: null;
	};
	/**
	 * A read-only reactive value that's initially `false`. SvelteKit checks for new versions on data, remote, and form action responses (via the `x-sveltekit-version` header), when the tab regains focus or becomes visible, and on a poll interval (see [`version.pollInterval`](https://svelte.dev/docs/kit/configuration#version)). `updated.current` is set to `true` when a new version is detected. `updated.check()` will force an immediate check, regardless of polling.
	 * */
	export const updated: {
		get current(): boolean;
		check(): Promise<boolean>;
	};

	export {};
}

/**
 * It's possible to tell SvelteKit how to type objects inside your app by declaring the `App` namespace. By default, a new project will have a file called `src/app.d.ts` containing the following:
 *
 * ```ts
 * declare global {
 * 	namespace App {
 * 		// interface Error {}
 * 		// interface Locals {}
 * 		// interface PageData {}
 * 		// interface PageState {}
 * 		// interface Platform {}
 * 	}
 * }
 *
 * export {};
 * ```
 *
 * The `export {}` line exists because without it, the file would be treated as an _ambient module_ which prevents you from adding `import` declarations.
 * If you need to add ambient `declare module` declarations, do so in a separate file like `src/ambient.d.ts`.
 *
 * By populating these interfaces, you will gain type safety when using `event.locals`, `event.platform`, and `data` from `load` functions.
 */
declare namespace App {
	/**
	 * Defines the common shape of expected and unexpected errors. Expected errors are thrown using the `error` function. Every error passes through the `handleError` hooks, which must return this shape (with `status` and `message` optional, since they default to those of the caught error).
	 */
	export interface Error {
		status: number;
		message: string;
	}

	/**
	 * The interface that defines `event.locals`, which can be accessed in server [hooks](https://svelte.dev/docs/kit/hooks) (`handle`, and `handleError`), server-only `load` functions, and `+server.js` files.
	 */
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	export interface Locals {}

	/**
	 * Defines the common shape of the [page.data state](https://svelte.dev/docs/kit/$app-state#page) - that is, the data that is shared between all pages.
	 * The `Load` and `ServerLoad` functions in `./$types` will be narrowed accordingly.
	 * Use optional properties for data that is only present on specific pages. Do not add an index signature (`[key: string]: any`).
	 */
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	export interface PageData {}

	/**
	 * The shape of the `page.state` object, which can be manipulated using [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto).
	 */
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	export interface PageState {}

	/**
	 * If your adapter provides [platform-specific context](https://svelte.dev/docs/kit/adapters#Platform-specific-context) via `event.platform`, you can specify it here.
	 */
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	export interface Platform {}
}

/**
 * This module is available to [service workers](https://svelte.dev/docs/kit/service-workers) and other contexts.
 * It exports information about the build output, static files, prerendered pages, and routes.
 */
declare module '$app/manifest' {
	/**
	 * An array of `{ path: string }` objects representing the files generated by Vite.
	 * The path is relative to the [base path](https://svelte.dev/docs/kit/configuration#paths), and is intended for use with `cache.add(...)` inside a [service worker](https://svelte.dev/docs/kit/service-workers).
	 * During development, this is an empty array.
	 */
	export const immutable: Array<{ path: string }>;
	/**
	 * An array of `{ path: AssetPath }` objects representing the files in your `static` directory, or whatever directory is specified by `config.files.assets`.
	 * The path is relative to the [base path](https://svelte.dev/docs/kit/configuration#paths), and can be used with [`asset(...)`](https://svelte.dev/docs/kit/$app-paths#asset).
	 */
	export const assets: Array<{ path: import('$app/types').AssetPath }>;
	/**
	 * An array of `{ path: Path }` objects representing prerendered pages and endpoints, relative to the [base path](https://svelte.dev/docs/kit/configuration#paths).
	 * During development, this is an empty array.
	 */
	export const prerendered: Array<{ path: import('$app/types').Path }>;
	/**
	 * A route in your app, along with its capabilities. `page` indicates the presence of a `+page`,
	 * while `endpoint` indicates the presence of a `+server`. Both are `true` when both files exist.
	 */
	export type ManifestRoute =
		| {
				id: Exclude<import('$app/types').PageRouteId, import('$app/types').EndpointRouteId>;
				page: true;
				endpoint: false;
		  }
		| {
				id: Exclude<import('$app/types').EndpointRouteId, import('$app/types').PageRouteId>;
				page: false;
				endpoint: true;
		  }
		| {
				id: Extract<import('$app/types').PageRouteId, import('$app/types').EndpointRouteId>;
				page: true;
				endpoint: true;
		  };
	/**
	 * An array of objects representing the routes in your app. Only routes that the router can match
	 * are included — directories that merely hold a `+layout` are not routes of their own.
	 *
	 * Each object has an `id`, plus `page` and `endpoint` booleans describing whether the route has a
	 * `+page` and/or a `+server`. Both are `true` for a route that has both, so the capabilities can
	 * be filtered independently:
	 *
	 * ```js
	 * import { routes } from '$app/manifest';
	 *
	 * const pages = routes.filter((route) => route.page);
	 * const endpoints = routes.filter((route) => route.endpoint);
	 * ```
	 */
	export const routes: ManifestRoute[];
}

/**
 * This module contains generated types for the routes in your app.
 */
declare module '$app/types' {
	/**
	 * Interface for all generated app types. This gets extended via declaration merging. DO NOT USE THIS INTERFACE DIRECTLY.
	 */
	export interface AppTypes {
		// These are all functions so that we can leverage function overloads to get the correct type.
		// Using the return types directly would error with a "not the same type" error.
		// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
		PageRouteId(): string;
		EndpointRouteId(): string;
		RouteId(): string;
		RouteParams(): Record<string, Record<string, string>>;
		LayoutParams(): Record<string, Record<string, string>>;
		Path(): string;
		ResolvedPathname(): string;
		AssetPath(): string;
	}

	/**
	 * A union of the route IDs in your app that have a `+page`.
	 *
	 * A route ID can be in both `PageRouteId` and `EndpointRouteId`, if its directory contains both a `+page` and a `+server`.
	 */
	export type PageRouteId = ReturnType<AppTypes['PageRouteId']>;

	/**
	 * A union of the route IDs in your app that have a `+server`.
	 *
	 * A route ID can be in both `PageRouteId` and `EndpointRouteId`, if its directory contains both a `+page` and a `+server`.
	 */
	export type EndpointRouteId = ReturnType<AppTypes['EndpointRouteId']>;

	/**
	 * A union of all the route IDs in your app — the union of `PageRouteId` and `EndpointRouteId`. Used for `page.route.id` and `event.route.id`.
	 */
	export type RouteId = ReturnType<AppTypes['RouteId']>;

	/**
	 * `RouteId`, but possibly suffixed with a search string and/or hash.
	 */
	export type RouteIdWithSearchOrHash = RouteId | `${RouteId}?${string}` | `${RouteId}#${string}`;

	/**
	 * A utility for getting the parameters associated with a given route.
	 */
	export type RouteParams<T extends RouteId> = T extends keyof ReturnType<AppTypes['RouteParams']>
		? ReturnType<AppTypes['RouteParams']>[T]
		: Record<string, never>;

	/**
	 * The route IDs accepted by `LayoutParams`. Like `RouteId`, these preserve route groups and `[param]` syntax, but they identify directories containing layouts rather than matchable routes.
	 */
	type LayoutParamsId = keyof ReturnType<AppTypes['LayoutParams']>;

	/**
	 * A utility for getting the parameters associated with a given layout, which is similar to `RouteParams` but also includes optional parameters for any child route.
	 */
	export type LayoutParams<T extends LayoutParamsId> = ReturnType<AppTypes['LayoutParams']>[T];

	/**
	 * A union of all valid paths in your app, relative to the `base` path.
	 */
	export type Path = ReturnType<AppTypes['Path']>;

	/**
	 * `Path`, but possibly suffixed with a search string and/or hash.
	 */
	export type PathnameWithSearchOrHash = Path | `${Path}?${string}` | `${Path}#${string}`;

	/**
	 * `Path`, but prefixed with a base path. Used for `page.url.pathname`.
	 */
	export type ResolvedPathname = ReturnType<AppTypes['ResolvedPathname']>;

	/**
	 * A union of all the filenames of assets contained in your `static` directory, relative to the `base` path.
	 */
	export type AssetPath = ReturnType<AppTypes['AssetPath']>;
}

//# sourceMappingURL=index.d.ts.map