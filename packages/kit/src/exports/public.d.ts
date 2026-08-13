import 'svelte'; // pick up `declare module "*.svelte"`
import 'vite/client'; // pick up `declare module "*.jpg"`, etc.
import '../types/ambient.js';

import {
	AdapterEntry,
	HttpMethod,
	Logger,
	MaybePromise,
	Prerendered,
	PrerenderOption,
	RequestOptions,
	RouteSegment
} from '../types/private.js';
import { BuildData, SSRNodeLoader, SSRRoute, ValidatedConfig } from 'types';
import { Plugin } from 'vite';
import { RouteId as AppRouteId, LayoutParams as AppLayoutParams } from '$app/types';
import { ParamMatcher } from '@sveltejs/kit/params';

export { PrerenderOption } from '../types/private.js';

// @ts-ignore this is an optional peer dependency so could be missing. Written like this so dts-buddy preserves the ts-ignore
type Span = import('@opentelemetry/api').Span;

/**
 * [Adapters](https://svelte.dev/docs/kit/adapters) are responsible for taking the production build and turning it into something that can be deployed to a platform of your choosing.
 */
export interface Adapter {
	/**
	 * The name of the adapter, using for logging. Will typically correspond to the package name.
	 */
	name: string;
	/**
	 * This function is called after SvelteKit has built your app.
	 * @param builder An object provided by SvelteKit that contains methods for adapting the app
	 */
	adapt: (builder: Builder) => MaybePromise<void>;
	/**
	 * Checks called during dev and build to determine whether specific features will work in production with this adapter.
	 */
	supports?: {
		/**
		 * Test support for `read` from `$app/server`.
		 * @param details.config The merged adapter-specific route config exported from the route with `export const config`
		 */
		read?: (details: { config: Record<string, any>; route: { id: string } }) => boolean;

		/**
		 * Test support for `instrumentation.server.js`. To pass, the adapter must support running `instrumentation.server.js` prior to the application code.
		 * @since 2.31.0
		 */
		instrumentation?: () => boolean;
	};
	/**
	 * Creates an `Emulator`, which allows the adapter to influence the environment
	 * during dev, build and prerendering.
	 */
	emulate?: () => MaybePromise<Emulator>;
	vite?: {
		plugins?: {
			/**
			 * Vite plugins placed before any of SvelteKit's own plugins.
			 * @since 3.0.0
			 */
			pre?: Plugin[];
			/**
			 * Vite plugins placed after any of SvelteKit's own plugins.
			 * @since 3.0.0
			 */
			post?: Plugin[];
		};
	};
}

export type LoadProperties<input extends Record<string, any> | void> = input extends void
	? undefined // needs to be undefined, because void will break intellisense
	: input extends Record<string, any>
		? input
		: unknown;

export type AwaitedActions<T extends Record<string, (...args: any) => any>> = OptionalUnion<
	{
		[Key in keyof T]: UnpackValidationError<Awaited<ReturnType<T[Key]>>>;
	}[keyof T]
>;

// Takes a union type and returns a union type where each type also has all properties
// of all possible types (typed as undefined), making accessing them more ergonomic
type OptionalUnion<
	U extends Record<string, any>, // not unknown, else interfaces don't satisfy this constraint
	A extends keyof U = U extends U ? keyof U : never
> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;

declare const uniqueSymbol: unique symbol;

export interface ActionFailure<T = undefined> {
	status: number;
	data: T;
	[uniqueSymbol]: true; // necessary or else UnpackValidationError could wrongly unpack objects with the same shape as ActionFailure
}

type UnpackValidationError<T> =
	T extends ActionFailure<infer X>
		? X
		: T extends void
			? undefined // needs to be undefined, because void will corrupt union type
			: T;

/**
 * This object is passed to the `adapt` function of adapters.
 * It contains various methods and properties that are useful for adapting the app.
 */
export interface Builder {
	/** Print messages to the console. `log.info` and `log.minor` are silent unless Vite's `logLevel` is `info`. */
	log: Logger;
	/**
	 * Remove `dir` and all its contents.
	 * @deprecated Use `fs.rmSync(dir, { force: true, recursive: true })` instead
	 */
	rimraf: (dir: string) => void;
	/**
	 * Create `dir` and any required parent directories.
	 * @deprecated Use `fs.mkdirSync(dir, { recursive: true })` instead
	 */
	mkdirp: (dir: string) => void;

	/** The fully resolved SvelteKit config. */
	config: ValidatedConfig;
	/** Information about prerendered pages and assets, if any. */
	prerendered: Prerendered;
	/** An array of all routes (including prerendered) */
	routes: RouteDefinition[];

	/**
	 * Create separate functions that map to one or more routes of your app.
	 * @param fn A function that groups a set of routes into an entry point
	 * @deprecated removed in 3.0. Use `builder.routes` instead
	 */
	createEntries?: (fn: (route: RouteDefinition) => AdapterEntry) => Promise<void>;

	/**
	 * Find all the assets imported by server files belonging to `routes`
	 */
	findServerAssets: (routes: RouteDefinition[]) => string[];

	/**
	 * Generate a fallback page for a static webserver to use when no route is matched. Useful for single-page apps.
	 */
	generateFallback: (dest: string) => Promise<void>;

	/**
	 * Generate a module exposing public environment variables as `$app/env/public` if the app uses it.
	 */
	generateEnvModule: () => void;

	/**
	 * Generate a server-side manifest to initialise the SvelteKit [server](https://svelte.dev/docs/kit/@sveltejs-kit#Server) with.
	 * @param opts
	 * @param opts.relativePath A relative path to the base directory of the server build output
	 */
	generateManifest: (opts: { relativePath: string; routes?: RouteDefinition[] }) => string;

	/**
	 * Resolve a path to the `name` directory inside `outDir`, e.g. `/path/to/.svelte-kit/my-adapter`.
	 * @param name path to the file, relative to the build directory
	 */
	getBuildDirectory: (name: string) => string;
	/** Get the fully resolved path to the directory containing client-side assets, including the contents of your `static` directory. */
	getClientDirectory: () => string;
	/** Get the fully resolved path to the directory containing server-side code. */
	getServerDirectory: () => string;
	/** Get the application path including any configured `base` path, e.g. `my-base-path/_app`. */
	getAppPath: () => string;

	/**
	 * Write client assets to `dest`.
	 * @param dest the destination folder
	 * @returns an array of files written to `dest`
	 */
	writeClient: (dest: string) => string[];
	/**
	 * Write prerendered files to `dest`.
	 * @param dest the destination folder
	 * @returns an array of files written to `dest`
	 */
	writePrerendered: (dest: string) => string[];
	/**
	 * Write server-side code to `dest`.
	 * @param dest the destination folder
	 * @returns an array of files written to `dest`
	 */
	writeServer: (dest: string) => string[];
	/**
	 * Copy a file or directory.
	 * @param from the source file or directory
	 * @param to the destination file or directory
	 * @param opts.filter a function to determine whether a file or directory should be copied
	 * @param opts.replace a map of strings to replace
	 * @returns an array of files that were copied
	 */
	copy: (
		from: string,
		to: string,
		opts?: {
			filter?(basename: string): boolean;
			replace?: Record<string, string>;
		}
	) => string[];

	/**
	 * Check if the server instrumentation file exists.
	 * @returns true if the server instrumentation file exists, false otherwise
	 * @since 2.31.0
	 */
	hasServerInstrumentationFile: () => boolean;

	/**
	 * Instrument `entrypoint` with `instrumentation`.
	 *
	 * Renames `entrypoint` to `start` and creates a new module at
	 * `entrypoint` which imports `instrumentation` and then dynamically imports `start`. This allows
	 * the module hooks necessary for instrumentation libraries to be loaded prior to any application code.
	 *
	 * Caveats:
	 * - "Live exports" will not work. If your adapter uses live exports, your users will need to manually import the server instrumentation on startup.
	 * - If `tla` is `false`, OTEL auto-instrumentation may not work properly. Use it if your environment supports it.
	 * - Use `hasServerInstrumentationFile` to check if the user has a server instrumentation file; if they don't, you shouldn't do this.
	 *
	 * @param options an object containing the following properties:
	 * @param options.entrypoint the path to the entrypoint to trace.
	 * @param options.instrumentation the path to the instrumentation file.
	 * @param options.start the name of the start file. This is what `entrypoint` will be renamed to.
	 * @param options.module configuration for the resulting entrypoint module.
	 * @param options.module.exports
	 * @param options.module.generateText a function that receives the relative paths to the instrumentation and start files, and generates the text of the module to be traced. If not provided, the default implementation will be used, which uses top-level await.
	 * @since 2.31.0
	 */
	instrument: (args: {
		entrypoint: string;
		instrumentation: string;
		start?: string;
		module?:
			| {
					exports: string[];
			  }
			| {
					generateText: (args: { instrumentation: string; start: string }) => string;
			  };
	}) => void;

	/**
	 * Compress files in `directory` with gzip and brotli, where appropriate. Generates `.gz` and `.br` files alongside the originals.
	 * @param {string} directory The directory containing the files to be compressed
	 * @returns an array of the files in `directory` that were compressed
	 */
	compress: (directory: string) => Promise<string[]>;
}

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

/**
 * A collection of functions that influence the environment during dev, build and prerendering
 */
export interface Emulator {
	/**
	 * A function that is called with the current route `config` and `prerender` option
	 * and returns an `App.Platform` object
	 */
	platform?(details: { config: any; prerender: PrerenderOption }): MaybePromise<App.Platform>;
}

/**
 * The generic form of `PageLoad` and `LayoutLoad`. You should import those from `./$types` (see [generated types](https://svelte.dev/docs/kit/types#Generated-types))
 * rather than using `Load` directly.
 */
export type Load<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	InputData extends Record<string, unknown> | null = Record<string, any> | null,
	ParentData extends Record<string, unknown> = Record<string, any>,
	OutputData extends Record<string, unknown> | void = Record<string, any> | void,
	RouteId extends AppRouteId | null = AppRouteId | null
> = (event: LoadEvent<Params, InputData, ParentData, RouteId>) => MaybePromise<OutputData>;

/**
 * The generic form of `PageLoadEvent` and `LayoutLoadEvent`. You should import those from `./$types` (see [generated types](https://svelte.dev/docs/kit/types#Generated-types))
 * rather than using `LoadEvent` directly.
 */
export interface LoadEvent<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	Data extends Record<string, unknown> | null = Record<string, any> | null,
	ParentData extends Record<string, unknown> = Record<string, any>,
	RouteId extends AppRouteId | null = AppRouteId | null
> extends NavigationEvent<Params, RouteId> {
	/**
	 * `fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:
	 *
	 * - It can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request.
	 * - It can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context).
	 * - Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.
	 * - During server-side rendering, the response will be captured and inlined into the rendered HTML by hooking into the `text` and `json` methods of the `Response` object. Note that headers will _not_ be serialized, unless explicitly included via [`filterSerializedResponseHeaders`](https://svelte.dev/docs/kit/hooks#handle)
	 * - During hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request.
	 *
	 * You can learn more about making credentialed requests with cookies [here](https://svelte.dev/docs/kit/load#Cookies)
	 */
	fetch: typeof fetch;
	/**
	 * Contains the data returned by the route's server `load` function (in `+layout.server.js` or `+page.server.js`), if any.
	 */
	data: Data;
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
	 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://svelte.dev/docs/kit/@sveltejs-kit#Cookies) API in a server-only `load` function instead.
	 *
	 * `setHeaders` has no effect when a `load` function runs in the browser.
	 */
	setHeaders: (headers: Record<string, string>) => void;
	/**
	 * `await parent()` returns data from parent `+layout.js` `load` functions.
	 * Implicitly, a missing `+layout.js` is treated as a `({ data }) => data` function, meaning that it will return and forward data from parent `+layout.server.js` files.
	 *
	 * Be careful not to introduce accidental waterfalls when using `await parent()`. If for example you only want to merge parent data into the returned output, call it _after_ fetching your other data.
	 */
	parent: () => Promise<ParentData>;
	/**
	 * This function declares that the `load` function has a _dependency_ on one or more URLs or custom identifiers, which can subsequently be used with [`invalidate()`](https://svelte.dev/docs/kit/$app-navigation#invalidate) to cause `load` to rerun.
	 *
	 * Most of the time you won't need this, as `fetch` calls `depends` on your behalf — it's only necessary if you're using a custom API client that bypasses `fetch`.
	 *
	 * URLs can be absolute or relative to the page being loaded, and must be [encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).
	 *
	 * Custom identifiers have to be prefixed with one or more lowercase letters followed by a colon to conform to the [URI specification](https://www.rfc-editor.org/rfc/rfc3986.html).
	 *
	 * The following example shows how to use `depends` to register a dependency on a custom identifier, which is `invalidate`d after a button click, making the `load` function rerun.
	 *
	 * ```js
	 * /// file: src/routes/+page.js
	 * let count = 0;
	 * export async function load({ depends }) {
	 * 	depends('increase:count');
	 *
	 * 	return { count: count++ };
	 * }
	 * ```
	 *
	 * ```html
	 * /// file: src/routes/+page.svelte
	 * <script>
	 * 	import { invalidate } from '$app/navigation';
	 *
	 * 	let { data } = $props();
	 *
	 * 	const increase = async () => {
	 * 		await invalidate('increase:count');
	 * 	}
	 * </script>
	 *
	 * <p>{data.count}<p>
	 * <button on:click={increase}>Increase Count</button>
	 * ```
	 */
	depends: (...deps: Array<`${string}:${string}`>) => void;
	/**
	 * Use this function to opt out of dependency tracking for everything that is synchronously called within the callback. Example:
	 *
	 * ```js
	 * /// file: src/routes/+page.server.js
	 * export async function load({ untrack, url }) {
	 * 	// Untrack url.pathname so that path changes don't trigger a rerun
	 * 	if (untrack(() => url.pathname === '/')) {
	 * 		return { message: 'Welcome!' };
	 * 	}
	 * }
	 * ```
	 */
	untrack: <T>(fn: () => T) => T;

	/**
	 * Access to spans for tracing. If tracing is not enabled or the function is being run in the browser, these spans will do nothing.
	 * @since 2.31.0
	 */
	tracing: {
		/** Whether tracing is enabled. */
		enabled: boolean;
		/** The root span for the request. This span is named `sveltekit.handle.root`. */
		root: Span;
		/** The span associated with the current `load` function. */
		current: Span;
	};
}

export interface NavigationEvent<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	RouteId extends AppRouteId | null = AppRouteId | null
> {
	/**
	 * The parameters of the current page - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object
	 */
	params: Params;
	/**
	 * Info about the current route
	 */
	route: {
		/**
		 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`. It is `null` when no route is matched.
		 */
		id: RouteId;
	};
	/**
	 * The URL of the current page
	 */
	url: URL;
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

/**
 * A `(event: RequestEvent) => Response` function exported from a `+server.js` file that corresponds to an HTTP verb (`GET`, `PUT`, `PATCH`, etc) and handles requests with that method.
 *
 * It receives `Params` as the first generic argument, which you can skip by using [generated types](https://svelte.dev/docs/kit/types#Generated-types) instead.
 */
export type RequestHandler<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	RouteId extends AppRouteId | null = AppRouteId | null
> = (event: RequestEvent<Params, RouteId>) => MaybePromise<Response>;

export interface RouteDefinition<Config = any> {
	id: string;
	api: {
		methods: Array<HttpMethod | '*'>;
	};
	page: {
		methods: Array<Extract<HttpMethod, 'GET' | 'POST'>>;
	};
	pattern: RegExp;
	prerender: PrerenderOption;
	segments: RouteSegment[];
	methods: Array<HttpMethod | '*'>;
	config: Config;
}

export class Server {
	constructor(manifest: SSRManifest);
	init(options: ServerInitOptions): Promise<void>;
	respond(request: Request, options: RequestOptions): Promise<Response>;
}

export interface ServerInitOptions {
	/** A map of environment variables. */
	env: Record<string, string | undefined>;
	/** A function that turns an asset filename into a `ReadableStream`. Required for the `read` export from `$app/server` to work. */
	read?: (file: string) => MaybePromise<ReadableStream | null>;
}

/**
 * Information required to instantiate a new `Server` instance.
 */
export interface SSRManifest {
	/** The directory where SvelteKit keeps its stuff, including static assets (such as JS and CSS) and internally-used routes. */
	appDir: string;
	/** The `base` and `appDir` settings combined without a leading slash. */
	appPath: string;
	/** Static files from `config.files.assets` and the service worker (if any). */
	assets: Set<string>;
	mimeTypes: Record<string, string>;

	/** @internal private fields */
	_: {
		client: BuildData['client'];
		nodes: SSRNodeLoader[];
		/** hashed filename -> import to that file */
		remotes: Record<string, () => Promise<{ default: Record<string, any> }>>;
		routes: SSRRoute[];
		prerendered_routes: Set<string>;
		matchers: () => Promise<Record<string, ParamMatcher>>;
		/** A `[file]: size` map of all assets imported by server code. */
		server_assets: Record<string, number>;
	};
}

/**
 * The generic form of `PageServerLoad` and `LayoutServerLoad`. You should import those from `./$types` (see [generated types](https://svelte.dev/docs/kit/types#Generated-types))
 * rather than using `ServerLoad` directly.
 */
export type ServerLoad<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	ParentData extends Record<string, any> = Record<string, any>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends AppRouteId | null = AppRouteId | null
> = (event: ServerLoadEvent<Params, ParentData, RouteId>) => MaybePromise<OutputData>;

export interface ServerLoadEvent<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	ParentData extends Record<string, any> = Record<string, any>,
	RouteId extends AppRouteId | null = AppRouteId | null
> extends RequestEvent<Params, RouteId> {
	/**
	 * `await parent()` returns data from parent `+layout.server.js` `load` functions.
	 *
	 * Be careful not to introduce accidental waterfalls when using `await parent()`. If for example you only want to merge parent data into the returned output, call it _after_ fetching your other data.
	 */
	parent: () => Promise<ParentData>;
	/**
	 * This function declares that the `load` function has a _dependency_ on one or more URLs or custom identifiers, which can subsequently be used with [`invalidate()`](https://svelte.dev/docs/kit/$app-navigation#invalidate) to cause `load` to rerun.
	 *
	 * Most of the time you won't need this, as `fetch` calls `depends` on your behalf — it's only necessary if you're using a custom API client that bypasses `fetch`.
	 *
	 * URLs can be absolute or relative to the page being loaded, and must be [encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).
	 *
	 * Custom identifiers have to be prefixed with one or more lowercase letters followed by a colon to conform to the [URI specification](https://www.rfc-editor.org/rfc/rfc3986.html).
	 *
	 * The following example shows how to use `depends` to register a dependency on a custom identifier, which is `invalidate`d after a button click, making the `load` function rerun.
	 *
	 * ```js
	 * /// file: src/routes/+page.js
	 * let count = 0;
	 * export async function load({ depends }) {
	 * 	depends('increase:count');
	 *
	 * 	return { count: count++ };
	 * }
	 * ```
	 *
	 * ```html
	 * /// file: src/routes/+page.svelte
	 * <script>
	 * 	import { invalidate } from '$app/navigation';
	 *
	 * 	let { data } = $props();
	 *
	 * 	const increase = async () => {
	 * 		await invalidate('increase:count');
	 * 	}
	 * </script>
	 *
	 * <p>{data.count}<p>
	 * <button on:click={increase}>Increase Count</button>
	 * ```
	 */
	depends: (...deps: string[]) => void;
	/**
	 * Use this function to opt out of dependency tracking for everything that is synchronously called within the callback. Example:
	 *
	 * ```js
	 * /// file: src/routes/+page.js
	 * export async function load({ untrack, url }) {
	 * 	// Untrack url.pathname so that path changes don't trigger a rerun
	 * 	if (untrack(() => url.pathname === '/')) {
	 * 		return { message: 'Welcome!' };
	 * 	}
	 * }
	 * ```
	 */
	untrack: <T>(fn: () => T) => T;

	/**
	 * Access to spans for tracing. If tracing is not enabled, these spans will do nothing.
	 * @since 2.31.0
	 */
	tracing: {
		/** Whether tracing is enabled. */
		enabled: boolean;
		/** The root span for the request. This span is named `sveltekit.handle.root`. */
		root: Span;
		/** The span associated with the current server `load` function. */
		current: Span;
	};
}

/**
 * Shape of a form action method that is part of `export const actions = {...}` in `+page.server.js`.
 * See [form actions](https://svelte.dev/docs/kit/form-actions) for more information.
 */
export type Action<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends AppRouteId | null = AppRouteId | null
> = (event: RequestEvent<Params, RouteId>) => MaybePromise<OutputData>;

/**
 * Shape of the `export const actions = {...}` object in `+page.server.js`.
 * See [form actions](https://svelte.dev/docs/kit/form-actions) for more information.
 */
export type Actions<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends AppRouteId | null = AppRouteId | null
> = Record<string, Action<Params, OutputData, RouteId>>;

/**
 * The object returned by the [`error`](https://svelte.dev/docs/kit/@sveltejs-kit#error) function.
 */
export interface HttpError {
	/** The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses), in the range 400-599. */
	status: number;
	/** The content of the error. */
	body: App.Error;
}

/**
 * The object returned by the [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) function.
 */
export interface Redirect {
	/** The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages), in the range 300-308. */
	status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
	/** The location to redirect to. */
	location: string;
}

/**
 * The type of `export const snapshot` exported from a page or layout component.
 * @deprecated Use the [`snapshot`](https://svelte.dev/docs/kit/$app-navigation#snapshot) helper from `$app/navigation` instead.
 */
export interface Snapshot<T = any> {
	capture: () => T;
	restore: (snapshot: T) => void;
}

export * from './index.js';
