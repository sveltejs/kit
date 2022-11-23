/// <reference types="svelte" />
/// <reference types="vite/client" />

import './ambient.js';

import { CompileOptions } from 'svelte/types/compiler/interfaces';
import {
	AdapterEntry,
	CspDirectives,
	Logger,
	MaybePromise,
	Prerendered,
	PrerenderHttpErrorHandlerValue,
	PrerenderMissingIdHandlerValue,
	RequestOptions,
	RouteDefinition,
	TrailingSlash,
	UniqueInterface
} from './private.js';
import { SSRNodeLoader, SSRRoute, ValidatedConfig } from './internal.js';

export { PrerenderOption } from './private.js';

export interface Adapter {
	name: string;
	adapt(builder: Builder): MaybePromise<void>;
}

type AwaitedPropertiesUnion<input extends Record<string, any> | void> = input extends void
	? undefined // needs to be undefined, because void will break intellisense
	: input extends Record<string, any>
	? {
			[key in keyof input]: Awaited<input[key]>;
	  }
	: {} extends input // handles the any case
	? input
	: unknown;

export type AwaitedProperties<input extends Record<string, any> | void> =
	AwaitedPropertiesUnion<input> extends Record<string, any>
		? OptionalUnion<AwaitedPropertiesUnion<input>>
		: AwaitedPropertiesUnion<input>;

export type AwaitedActions<T extends Record<string, (...args: any) => any>> = {
	[Key in keyof T]: OptionalUnion<UnpackValidationError<Awaited<ReturnType<T[Key]>>>>;
}[keyof T];

// Takes a union type and returns a union type where each type also has all properties
// of all possible types (typed as undefined), making accessing them more ergonomic
type OptionalUnion<
	U extends Record<string, any>, // not unknown, else interfaces don't satisfy this constraint
	A extends keyof U = U extends U ? keyof U : never
> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;

type UnpackValidationError<T> = T extends ValidationError<infer X>
	? X
	: T extends void
	? undefined // needs to be undefined, because void will corrupt union type
	: T;

export interface Builder {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;

	config: ValidatedConfig;
	prerendered: Prerendered;

	/**
	 * Create entry points that map to individual functions
	 * @param fn A function that groups a set of routes into an entry point
	 */
	createEntries(fn: (route: RouteDefinition) => AdapterEntry): Promise<void>;

	generateManifest(opts: { relativePath: string; format?: 'esm' | 'cjs' }): string;

	getBuildDirectory(name: string): string;
	getClientDirectory(): string;
	getServerDirectory(): string;
	getStaticDirectory(): string;
	/** The application path including any configured base path */
	getAppPath(): string;

	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeClient(dest: string): string[];
	/**
	 * @param dest
	 */
	writePrerendered(
		dest: string,
		opts?: {
			fallback?: string;
		}
	): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeServer(dest: string): string[];
	/**
	 * @param from the source file or folder
	 * @param to the destination file or folder
	 * @param opts.filter a function to determine whether a file or folder should be copied
	 * @param opts.replace a map of strings to replace
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy(
		from: string,
		to: string,
		opts?: {
			filter?(basename: string): boolean;
			replace?: Record<string, string>;
		}
	): string[];

	/**
	 * @param {string} directory Path to the directory containing the files to be compressed
	 */
	compress(directory: string): Promise<void>;
}

export interface Config {
	compilerOptions?: CompileOptions;
	extensions?: string[];
	kit?: KitConfig;
	package?: {
		source?: string;
		dir?: string;
		emitTypes?: boolean;
		exports?(filepath: string): boolean;
		files?(filepath: string): boolean;
	};
	preprocess?: any;
	[key: string]: any;
}

export interface Cookies {
	/**
	 * Gets a cookie that was previously set with `cookies.set`, or from the request headers.
	 */
	get(name: string, opts?: import('cookie').CookieParseOptions): string | undefined;

	/**
	 * Sets a cookie. This will add a `set-cookie` header to the response, but also make the cookie available via `cookies.get` during the current request.
	 *
	 * The `httpOnly` and `secure` options are `true` by default (except on http://localhost, where `secure` is `false`), and must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP. The `sameSite` option defaults to `lax`.
	 *
	 * By default, the `path` of a cookie is the 'directory' of the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.
	 */
	set(name: string, value: string, opts?: import('cookie').CookieSerializeOptions): void;

	/**
	 * Deletes a cookie by setting its value to an empty string and setting the expiry date in the past.
	 *
	 * By default, the `path` of a cookie is the 'directory' of the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.
	 */
	delete(name: string, opts?: import('cookie').CookieSerializeOptions): void;

	/**
	 * Serialize a cookie name-value pair into a Set-Cookie header string.
	 *
	 * The `httpOnly` and `secure` options are `true` by default (except on http://localhost, where `secure` is `false`), and must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP. The `sameSite` option defaults to `lax`.
	 *
	 * By default, the `path` of a cookie is the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.
	 *
	 * @param name the name for the cookie
	 * @param value value to set the cookie to
	 * @param options object containing serialization options
	 */
	serialize(name: string, value: string, opts?: import('cookie').CookieSerializeOptions): string;
}

export interface KitConfig {
	adapter?: Adapter;
	alias?: Record<string, string>;
	appDir?: string;
	csp?: {
		mode?: 'hash' | 'nonce' | 'auto';
		directives?: CspDirectives;
		reportOnly?: CspDirectives;
	};
	csrf?: {
		checkOrigin?: boolean;
	};
	env?: {
		dir?: string;
		publicPrefix?: string;
	};
	moduleExtensions?: string[];
	files?: {
		assets?: string;
		hooks?: {
			client?: string;
			server?: string;
		};
		lib?: string;
		params?: string;
		routes?: string;
		serviceWorker?: string;
		appTemplate?: string;
		errorTemplate?: string;
	};
	inlineStyleThreshold?: number;
	outDir?: string;
	paths?: {
		assets?: string;
		base?: string;
	};
	prerender?: {
		concurrency?: number;
		crawl?: boolean;
		default?: boolean;
		enabled?: boolean;
		entries?: Array<'*' | `/${string}`>;
		handleHttpError?: PrerenderHttpErrorHandlerValue;
		handleMissingId?: PrerenderMissingIdHandlerValue;
		origin?: string;
	};
	serviceWorker?: {
		register?: boolean;
		files?(filepath: string): boolean;
	};
	trailingSlash?: TrailingSlash;
	version?: {
		name?: string;
		pollInterval?: number;
	};
}

/**
 * This function runs every time the SvelteKit server receives a [request](https://kit.svelte.dev/docs/web-standards#fetch-apis-request) and
 * determines the [response](https://kit.svelte.dev/docs/web-standards#fetch-apis-response).
 * It receives an `event` object representing the request and a function called `resolve`, which renders the route and generates a `Response`.
 * This allows you to modify response headers or bodies, or bypass SvelteKit entirely (for implementing routes programmatically, for example).
 */
export interface Handle {
	(input: {
		event: RequestEvent;
		resolve(event: RequestEvent, opts?: ResolveOptions): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleServerError {
	(input: { error: unknown; event: RequestEvent }): void | App.Error;
}

export interface HandleClientError {
	(input: { error: unknown; event: NavigationEvent }): void | App.Error;
}

export interface HandleFetch {
	(input: { event: RequestEvent; request: Request; fetch: typeof fetch }): MaybePromise<Response>;
}

/**
 * The generic form of `PageLoad` and `LayoutLoad`. You should import those from `./$types` (see [generated types](https://kit.svelte.dev/docs/types#generated-types))
 * rather than using `Load` directly.
 */
export interface Load<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	InputData extends Record<string, unknown> | null = Record<string, any> | null,
	ParentData extends Record<string, unknown> = Record<string, any>,
	OutputData extends Record<string, unknown> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> {
	(event: LoadEvent<Params, InputData, ParentData, RouteId>): MaybePromise<OutputData>;
}

export interface LoadEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	Data extends Record<string, unknown> | null = Record<string, any> | null,
	ParentData extends Record<string, unknown> = Record<string, any>,
	RouteId extends string | null = string | null
> extends NavigationEvent<Params, RouteId> {
	/**
	 * `fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:
	 *
	 * - it can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request
	 * - it can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context)
	 * - internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call
	 * - during server-side rendering, the response will be captured and inlined into the rendered HTML. Note that headers will _not_ be serialized, unless explicitly included via [`filterSerializedResponseHeaders`](https://kit.svelte.dev/docs/hooks#server-hooks-handle)
	 * - during hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request
	 *
	 * > Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.
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
	 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://kit.svelte.dev/docs/types#sveltejs-kit-cookies) API in a server-only `load` function instead.
	 *
	 * `setHeaders` has no effect when a `load` function runs in the browser.
	 */
	setHeaders(headers: Record<string, string>): void;
	/**
	 * `await parent()` returns data from parent `+layout.js` `load` functions.
	 * Implicitly, a missing `+layout.js` is treated as a `({ data }) => data` function, meaning that it will return and forward data from parent `+layout.server.js` files.
	 *
	 * Be careful not to introduce accidental waterfalls when using `await parent()`. If for example you only want to merge parent data into the returned output, call it _after_ fetching your other data.
	 */
	parent(): Promise<ParentData>;
	/**
	 * This function declares that the `load` function has a _dependency_ on one or more URLs or custom identifiers, which can subsequently be used with [`invalidate()`](/docs/modules#$app-navigation-invalidate) to cause `load` to rerun.
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
	 * 	export let data;
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
	depends(...deps: string[]): void;
}

export interface NavigationEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	RouteId extends string | null = string | null
> {
	/**
	 * The parameters of the current page - e.g. for a route like `/blog/[slug]`, the `slug` parameter
	 */
	params: Params;
	/**
	 * Info about the current route
	 */
	route: {
		/**
		 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`
		 */
		id: RouteId;
	};
	/**
	 * The URL of the current page
	 */
	url: URL;
}

export interface NavigationTarget {
	params: Record<string, string> | null;
	route: { id: string | null };
	url: URL;
}

/**
 * - `enter`: The app has hydrated
 * - `leave`: The user is leaving the app by closing the tab or using the back/forward buttons to go to a different document
 * - `link`: Navigation was triggered by a link click
 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
 * - `popstate`: Navigation was triggered by back/forward navigation
 */
export type NavigationType = 'enter' | 'leave' | 'link' | 'goto' | 'popstate';

export interface Navigation {
	/**
	 * Where navigation was triggered from
	 */
	from: NavigationTarget | null;
	/**
	 * Where navigation is going to/has gone to
	 */
	to: NavigationTarget | null;
	/**
	 * The type of navigation:
	 * - `leave`: The user is leaving the app by closing the tab or using the back/forward buttons to go to a different document
	 * - `link`: Navigation was triggered by a link click
	 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
	 * - `popstate`: Navigation was triggered by back/forward navigation
	 */
	type: Omit<NavigationType, 'enter'>;
	/**
	 * Whether or not the navigation will result in the page being unloaded (i.e. not a client-side navigation)
	 */
	willUnload: boolean;
	/**
	 * In case of a history back/forward navigation, the number of steps to go back/forward
	 */
	delta?: number;
}

/**
 * The interface that corresponds to the `beforeNavigate`'s input parameter.
 */
export interface BeforeNavigate extends Navigation {
	/**
	 * Call this to prevent the navigation from starting.
	 */
	cancel(): void;
}

/**
 * The interface that corresponds to the `afterNavigate`'s input parameter.
 */
export interface AfterNavigate extends Navigation {
	/**
	 * The type of navigation:
	 * - `enter`: The app has hydrated
	 * - `link`: Navigation was triggered by a link click
	 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
	 * - `popstate`: Navigation was triggered by back/forward navigation
	 */
	type: Omit<NavigationType, 'leave'>;
	willUnload: false;
}

/**
 * The shape of the `$page` store
 */
export interface Page<
	Params extends Record<string, string> = Record<string, string>,
	RouteId extends string | null = string | null
> {
	/**
	 * The URL of the current page
	 */
	url: URL;
	/**
	 * The parameters of the current page - e.g. for a route like `/blog/[slug]`, the `slug` parameter
	 */
	params: Params;
	/**
	 * Info about the current route
	 */
	route: {
		/**
		 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`
		 */
		id: RouteId;
	};
	/**
	 * Http status code of the current page
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
	 * Filled only after a form submission. See [form actions](https://kit.svelte.dev/docs/form-actions) for more info.
	 */
	form: any;
}

export interface ParamMatcher {
	(param: string): boolean;
}

export interface RequestEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	RouteId extends string | null = string | null
> {
	/**
	 * Get or set cookies related to the current request
	 */
	cookies: Cookies;
	/**
	 * `fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:
	 *
	 * - it can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request
	 * - it can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context)
	 * - internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call
	 *
	 * > Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.
	 */
	fetch: typeof fetch;
	/**
	 * The client's IP address, set by the adapter.
	 */
	getClientAddress(): string;
	/**
	 * Contains custom data that was added to the request within the [`handle hook`](https://kit.svelte.dev/docs/hooks#server-hooks-handle).
	 */
	locals: App.Locals;
	/**
	 * The parameters of the current page or endpoint - e.g. for a route like `/blog/[slug]`, the `slug` parameter
	 */
	params: Params;
	/**
	 * Additional data made available through the adapter.
	 */
	platform: Readonly<App.Platform>;
	/**
	 * The original request object
	 */
	request: Request;
	/**
	 * Info about the current route
	 */
	route: {
		/**
		 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`
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
	 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://kit.svelte.dev/docs/types#sveltejs-kit-cookies) API instead.
	 */
	setHeaders(headers: Record<string, string>): void;
	/**
	 * The URL of the current page or endpoint
	 */
	url: URL;
}

/**
 * A `(event: RequestEvent) => Response` function exported from a `+server.js` file that corresponds to an HTTP verb (`GET`, `PUT`, `PATCH`, etc) and handles requests with that method.
 *
 * It receives `Params` as the first generic argument, which you can skip by using [generated types](https://kit.svelte.dev/docs/types#generated-types) instead.
 */
export interface RequestHandler<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	RouteId extends string | null = string | null
> {
	(event: RequestEvent<Params, RouteId>): MaybePromise<Response>;
}

export interface ResolveOptions {
	/**
	 * Applies custom transforms to HTML. If `done` is true, it's the final chunk. Chunks are not guaranteed to be well-formed HTML
	 * (they could include an element's opening tag but not its closing tag, for example)
	 * but they will always be split at sensible boundaries such as `%sveltekit.head%` or layout/page components.
	 * @param input the html chunk and the info if this is the last chunk
	 */
	transformPageChunk?(input: { html: string; done: boolean }): MaybePromise<string | undefined>;
	/**
	 * Determines which headers should be included in serialized responses when a `load` function loads a resource with `fetch`.
	 * By default, none will be included.
	 * @param name header name
	 * @param value header value
	 */
	filterSerializedResponseHeaders?(name: string, value: string): boolean;
	/**
	 * Determines what should be added to the `<head>` tag to preload it.
	 * By default, `js`, `css` and `font` files will be preloaded.
	 * @param input the type of the file and its path
	 */
	preload?(input: { type: 'font' | 'css' | 'js' | 'asset'; path: string }): boolean;
}

export class Server {
	constructor(manifest: SSRManifest);
	init(options: ServerInitOptions): Promise<void>;
	respond(request: Request, options: RequestOptions): Promise<Response>;
}

export interface ServerInitOptions {
	env: Record<string, string>;
}

export interface SSRManifest {
	appDir: string;
	appPath: string;
	assets: Set<string>;
	mimeTypes: Record<string, string>;

	/** private fields */
	_: {
		entry: {
			file: string;
			imports: string[];
			stylesheets: string[];
			fonts: string[];
		};
		nodes: SSRNodeLoader[];
		routes: SSRRoute[];
		matchers(): Promise<Record<string, ParamMatcher>>;
	};
}

/**
 * The generic form of `PageServerLoad` and `LayoutServerLoad`. You should import those from `./$types` (see [generated types](https://kit.svelte.dev/docs/types#generated-types))
 * rather than using `ServerLoad` directly.
 */
export interface ServerLoad<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	ParentData extends Record<string, any> = Record<string, any>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> {
	(event: ServerLoadEvent<Params, ParentData, RouteId>): MaybePromise<OutputData>;
}

export interface ServerLoadEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	ParentData extends Record<string, any> = Record<string, any>,
	RouteId extends string | null = string | null
> extends RequestEvent<Params, RouteId> {
	/**
	 * `await parent()` returns data from parent `+layout.server.js` `load` functions.
	 *
	 * Be careful not to introduce accidental waterfalls when using `await parent()`. If for example you only want to merge parent data into the returned output, call it _after_ fetching your other data.
	 */
	parent(): Promise<ParentData>;
	/**
	 * This function declares that the `load` function has a _dependency_ on one or more URLs or custom identifiers, which can subsequently be used with [`invalidate()`](/docs/modules#$app-navigation-invalidate) to cause `load` to rerun.
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
	 * 	export let data;
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
	depends(...deps: string[]): void;
}

export interface Action<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> {
	(event: RequestEvent<Params, RouteId>): MaybePromise<OutputData>;
}

export type Actions<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> = Record<string, Action<Params, OutputData, RouteId>>;

/**
 * When calling a form action via fetch, the response will be one of these shapes.
 */
export type ActionResult<
	Success extends Record<string, unknown> | undefined = Record<string, any>,
	Invalid extends Record<string, unknown> | undefined = Record<string, any>
> =
	| { type: 'success'; status: number; data?: Success }
	| { type: 'invalid'; status: number; data?: Invalid }
	| { type: 'redirect'; status: number; location: string }
	| { type: 'error'; error: any };

/**
 * Creates an `HttpError` object with an HTTP status code and an optional message.
 * This object, if thrown during request handling, will cause SvelteKit to
 * return an error response without invoking `handleError`
 * @param status The HTTP status code
 * @param body An object that conforms to the App.Error type. If a string is passed, it will be used as the message property.
 */
export function error(status: number, body: App.Error): HttpError;
export function error(
	status: number,
	// this overload ensures you can omit the argument or pass in a string if App.Error is of type { message: string }
	body?: { message: string } extends App.Error ? App.Error | string | undefined : never
): HttpError;

/**
 * The object returned by the `error` function
 */
export interface HttpError {
	/** The HTTP status code */
	status: number;
	/** The error message */
	body: App.Error;
}

/**
 * Creates a `Redirect` object. If thrown during request handling, SvelteKit will
 * return a redirect response.
 */
export function redirect(
	status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308,
	location: string
): Redirect;

/**
 * The object returned by the `redirect` function
 */
export interface Redirect {
	/** The HTTP status code */
	status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
	/** The location to redirect to */
	location: string;
}

/**
 * Generates a JSON `Response` object from the supplied data.
 */
export function json(data: any, init?: ResponseInit): Response;

/**
 * Generates a `ValidationError` object.
 */
export function invalid<T extends Record<string, unknown> | undefined>(
	status: number,
	data?: T
): ValidationError<T>;

/**
 * The object returned by the `invalid` function
 */
export interface ValidationError<T extends Record<string, unknown> | undefined = undefined>
	extends UniqueInterface {
	status: number;
	data: T;
}
