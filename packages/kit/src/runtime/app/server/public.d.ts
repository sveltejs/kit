import { RouteId as AppRouteId, LayoutParams as AppLayoutParams } from '$app/types';

export * from './index.js';

// @ts-ignore this is an optional peer dependency so could be missing. Written like this so dts-buddy preserves the ts-ignore
type Span = import('@opentelemetry/api').Span;

export interface Cookies {
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

export interface RequestEvent<
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
	 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://svelte.dev/docs/kit/$app-server#Cookies) API instead.
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
