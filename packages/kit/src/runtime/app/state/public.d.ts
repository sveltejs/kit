import type {
	LayoutParams as AppLayoutParams,
	ResolvedPathname,
	RouteId as AppRouteId
} from '$app/types';

export * from './index.js';

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
