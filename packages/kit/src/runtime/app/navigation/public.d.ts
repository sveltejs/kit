import type { LayoutParams as AppLayoutParams, RouteId as AppRouteId } from '$app/types';

export * from './client.js';

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
