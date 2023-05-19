declare module '@sveltejs/kit' {
	import { CompileOptions } from 'svelte/types/compiler/interfaces';
	import type { PluginOptions } from '@sveltejs/vite-plugin-svelte';

	/**
	 * [Adapters](https://kit.svelte.dev/docs/adapters) are responsible for taking the production build and turning it into something that can be deployed to a platform of your choosing.
	 */
	export interface Adapter {
		/**
		 * The name of the adapter, using for logging. Will typically correspond to the package name.
		 */
		name: string;
		/**
		 * This function is called after SvelteKit has built your app.
		 * */
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

	type UnpackValidationError<T> = T extends ActionFailure<infer X>
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
		/** Remove `dir` and all its contents. */
		rimraf(dir: string): void;
		/** Create `dir` and any required parent directories. */
		mkdirp(dir: string): void;

		/** The fully resolved `svelte.config.js`. */
		config: ValidatedConfig;
		/** Information about prerendered pages and assets, if any. */
		prerendered: Prerendered;
		/** An array of all routes (including prerendered) */
		routes: RouteDefinition[];

		/**
		 * Create separate functions that map to one or more routes of your app.
		 * */
		createEntries(fn: (route: RouteDefinition) => AdapterEntry): Promise<void>;

		/**
		 * Generate a fallback page for a static webserver to use when no route is matched. Useful for single-page apps.
		 */
		generateFallback(dest: string): Promise<void>;

		/**
		 * Generate a server-side manifest to initialise the SvelteKit [server](https://kit.svelte.dev/docs/types#public-types-server) with.
		 * */
		generateManifest(opts: { relativePath: string; routes?: RouteDefinition[] }): string;

		/**
		 * Resolve a path to the `name` directory inside `outDir`, e.g. `/path/to/.svelte-kit/my-adapter`.
		 * */
		getBuildDirectory(name: string): string;
		/** Get the fully resolved path to the directory containing client-side assets, including the contents of your `static` directory. */
		getClientDirectory(): string;
		/** Get the fully resolved path to the directory containing server-side code. */
		getServerDirectory(): string;
		/** Get the application path including any configured `base` path, e.g. `/my-base-path/_app`. */
		getAppPath(): string;

		/**
		 * Write client assets to `dest`.
		 * */
		writeClient(dest: string): string[];
		/**
		 * Write prerendered files to `dest`.
		 * */
		writePrerendered(dest: string): string[];
		/**
		 * Write server-side code to `dest`.
		 * */
		writeServer(dest: string): string[];
		/**
		 * Copy a file or directory.
		 * */
		copy(
			from: string,
			to: string,
			opts?: {
				filter?(basename: string): boolean;
				replace?: Record<string, string>;
			}
		): string[];

		/**
		 * Compress files in `directory` with gzip and brotli, where appropriate. Generates `.gz` and `.br` files alongside the originals.
		 * */
		compress(directory: string): Promise<void>;
	}

	export interface Config {
		/**
		 * Options passed to [`svelte.compile`](https://svelte.dev/docs#compile-time-svelte-compile).
		 * */
		compilerOptions?: CompileOptions;
		/**
		 * List of file extensions that should be treated as Svelte files.
		 * */
		extensions?: string[];
		/** SvelteKit options */
		kit?: KitConfig;
		/** [`@sveltejs/package`](/docs/packaging) options. */
		package?: {
			source?: string;
			dir?: string;
			emitTypes?: boolean;
			exports?(filepath: string): boolean;
			files?(filepath: string): boolean;
		};
		/** Preprocessor options, if any. Preprocessing can alternatively also be done through Vite's preprocessor capabilities. */
		preprocess?: any;
		/** `vite-plugin-svelte` plugin options. */
		vitePlugin?: PluginOptions;
		/** Any additional options required by tooling that integrates with Svelte. */
		[key: string]: any;
	}

	export interface Cookies {
		/**
		 * Gets a cookie that was previously set with `cookies.set`, or from the request headers.
		 * */
		get(name: string, opts?: import('cookie').CookieParseOptions): string | undefined;

		/**
		 * Gets all cookies that were previously set with `cookies.set`, or from the request headers.
		 * */
		getAll(opts?: import('cookie').CookieParseOptions): Array<{ name: string; value: string }>;

		/**
		 * Sets a cookie. This will add a `set-cookie` header to the response, but also make the cookie available via `cookies.get` or `cookies.getAll` during the current request.
		 *
		 * The `httpOnly` and `secure` options are `true` by default (except on http://localhost, where `secure` is `false`), and must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP. The `sameSite` option defaults to `lax`.
		 *
		 * By default, the `path` of a cookie is the 'directory' of the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.
		 * */
		set(name: string, value: string, opts?: import('cookie').CookieSerializeOptions): void;

		/**
		 * Deletes a cookie by setting its value to an empty string and setting the expiry date in the past.
		 *
		 * By default, the `path` of a cookie is the 'directory' of the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.
		 * */
		delete(name: string, opts?: import('cookie').CookieSerializeOptions): void;

		/**
		 * Serialize a cookie name-value pair into a `Set-Cookie` header string, but don't apply it to the response.
		 *
		 * The `httpOnly` and `secure` options are `true` by default (except on http://localhost, where `secure` is `false`), and must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP. The `sameSite` option defaults to `lax`.
		 *
		 * By default, the `path` of a cookie is the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.
		 *
		 * */
		serialize(name: string, value: string, opts?: import('cookie').CookieSerializeOptions): string;
	}

	export interface KitConfig {
		/**
		 * Your [adapter](https://kit.svelte.dev/docs/adapters) is run when executing `vite build`. It determines how the output is converted for different platforms.
		 * */
		adapter?: Adapter;
		/**
		 * An object containing zero or more aliases used to replace values in `import` statements. These aliases are automatically passed to Vite and TypeScript.
		 *
		 * ```js
		 * /// file: svelte.config.js
		 * /// type: import('@sveltejs/kit').Config
		 * const config = {
		 *   kit: {
		 *     alias: {
		 *       // this will match a file
		 *       'my-file': 'path/to/my-file.js',
		 *
		 *       // this will match a directory and its contents
		 *       // (`my-directory/x` resolves to `path/to/my-directory/x`)
		 *       'my-directory': 'path/to/my-directory',
		 *
		 *       // an alias ending /* will only match
		 *       // the contents of a directory, not the directory itself
		 *       'my-directory/*': 'path/to/my-directory/*'
		 *     }
		 *   }
		 * };
		 * ```
		 *
		 * > The built-in `$lib` alias is controlled by `config.kit.files.lib` as it is used for packaging.
		 *
		 * > You will need to run `npm run dev` to have SvelteKit automatically generate the required alias configuration in `jsconfig.json` or `tsconfig.json`.
		 * */
		alias?: Record<string, string>;
		/**
		 * The directory relative to `paths.assets` where the built JS and CSS (and imported assets) are served from. (The filenames therein contain content-based hashes, meaning they can be cached indefinitely). Must not start or end with `/`.
		 * */
		appDir?: string;
		/**
		 * [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) configuration. CSP helps to protect your users against cross-site scripting (XSS) attacks, by limiting the places resources can be loaded from. For example, a configuration like this...
		 *
		 * ```js
		 * /// file: svelte.config.js
		 * /// type: import('@sveltejs/kit').Config
		 * const config = {
		 *   kit: {
		 *     csp: {
		 *       directives: {
		 *         'script-src': ['self']
		 *       },
		 *       reportOnly: {
		 *         'script-src': ['self']
		 *       }
		 *     }
		 *   }
		 * };
		 *
		 * export default config;
		 * ```
		 *
		 * ...would prevent scripts loading from external sites. SvelteKit will augment the specified directives with nonces or hashes (depending on `mode`) for any inline styles and scripts it generates.
		 *
		 * To add a nonce for scripts and links manually included in `src/app.html`, you may use the placeholder `%sveltekit.nonce%` (for example `<script nonce="%sveltekit.nonce%">`).
		 *
		 * When pages are prerendered, the CSP header is added via a `<meta http-equiv>` tag (note that in this case, `frame-ancestors`, `report-uri` and `sandbox` directives will be ignored).
		 *
		 * > When `mode` is `'auto'`, SvelteKit will use nonces for dynamically rendered pages and hashes for prerendered pages. Using nonces with prerendered pages is insecure and therefore forbidden.
		 *
		 * > Note that most [Svelte transitions](https://svelte.dev/tutorial/transition) work by creating an inline `<style>` element. If you use these in your app, you must either leave the `style-src` directive unspecified or add `unsafe-inline`.
		 *
		 * If this level of configuration is insufficient and you have more dynamic requirements, you can use the [`handle` hook](https://kit.svelte.dev/docs/hooks#server-hooks-handle) to roll your own CSP.
		 */
		csp?: {
			/**
			 * Whether to use hashes or nonces to restrict `<script>` and `<style>` elements. `'auto'` will use hashes for prerendered pages, and nonces for dynamically rendered pages.
			 */
			mode?: 'hash' | 'nonce' | 'auto';
			/**
			 * Directives that will be added to `Content-Security-Policy` headers.
			 */
			directives?: CspDirectives;
			/**
			 * Directives that will be added to `Content-Security-Policy-Report-Only` headers.
			 */
			reportOnly?: CspDirectives;
		};
		/**
		 * Protection against [cross-site request forgery (CSRF)](https://owasp.org/www-community/attacks/csrf) attacks.
		 */
		csrf?: {
			/**
			 * Whether to check the incoming `origin` header for `POST`, `PUT`, `PATCH`, or `DELETE` form submissions and verify that it matches the server's origin.
			 *
			 * To allow people to make `POST`, `PUT`, `PATCH`, or `DELETE` requests with a `Content-Type` of `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain` to your app from other origins, you will need to disable this option. Be careful!
			 * */
			checkOrigin?: boolean;
		};
		/**
		 * Here be dragons. Enable at your peril.
		 */
		dangerZone?: {
			/**
			 * Automatically add server-side `fetch`ed URLs to the `dependencies` map of `load` functions. This will expose secrets
			 * to the client if your URL contains them.
			 */
			trackServerFetches?: boolean;
		};
		/**
		 * Whether or not the app is embedded inside a larger app. If `true`, SvelteKit will add its event listeners related to navigation etc on the parent of `%sveltekit.body%` instead of `window`, and will pass `params` from the server rather than inferring them from `location.pathname`.
		 * */
		embedded?: boolean;
		/**
		 * Environment variable configuration
		 */
		env?: {
			/**
			 * The directory to search for `.env` files.
			 * */
			dir?: string;
			/**
			 * A prefix that signals that an environment variable is safe to expose to client-side code. See [`$env/static/public`](/docs/modules#$env-static-public) and [`$env/dynamic/public`](/docs/modules#$env-dynamic-public). Note that Vite's [`envPrefix`](https://vitejs.dev/config/shared-options.html#envprefix) must be set separately if you are using Vite's environment variable handling - though use of that feature should generally be unnecessary.
			 * */
			publicPrefix?: string;
		};
		/**
		 * Where to find various files within your project.
		 */
		files?: {
			/**
			 * a place to put static files that should have stable URLs and undergo no processing, such as `favicon.ico` or `manifest.json`
			 * */
			assets?: string;
			hooks?: {
				/**
				 * The location of your client [hooks](https://kit.svelte.dev/docs/hooks).
				 * */
				client?: string;
				/**
				 * The location of your server [hooks](https://kit.svelte.dev/docs/hooks).
				 * */
				server?: string;
			};
			/**
			 * your app's internal library, accessible throughout the codebase as `$lib`
			 * */
			lib?: string;
			/**
			 * a directory containing [parameter matchers](https://kit.svelte.dev/docs/advanced-routing#matching)
			 * */
			params?: string;
			/**
			 * the files that define the structure of your app (see [Routing](https://kit.svelte.dev/docs/routing))
			 * */
			routes?: string;
			/**
			 * the location of your service worker's entry point (see [Service workers](https://kit.svelte.dev/docs/service-workers))
			 * */
			serviceWorker?: string;
			/**
			 * the location of the template for HTML responses
			 * */
			appTemplate?: string;
			/**
			 * the location of the template for fallback error responses
			 * */
			errorTemplate?: string;
		};
		/**
		 * Inline CSS inside a `<style>` block at the head of the HTML. This option is a number that specifies the maximum length of a CSS file to be inlined. All CSS files needed for the page and smaller than this value are merged and inlined in a `<style>` block.
		 *
		 * > This results in fewer initial requests and can improve your [First Contentful Paint](https://web.dev/first-contentful-paint) score. However, it generates larger HTML output and reduces the effectiveness of browser caches. Use it advisedly.
		 * */
		inlineStyleThreshold?: number;
		/**
		 * An array of file extensions that SvelteKit will treat as modules. Files with extensions that match neither `config.extensions` nor `config.kit.moduleExtensions` will be ignored by the router.
		 * */
		moduleExtensions?: string[];
		/**
		 * The directory that SvelteKit writes files to during `dev` and `build`. You should exclude this directory from version control.
		 * */
		outDir?: string;
		/**
		 * Options related to the build output format
		 */
		output?: {
			/**
			 * SvelteKit will preload the JavaScript modules needed for the initial page to avoid import 'waterfalls', resulting in faster application startup. There
			 * are three strategies with different trade-offs:
			 * - `modulepreload` - uses `<link rel="modulepreload">`. This delivers the best results in Chromium-based browsers, but is currently ignored by Firefox and Safari (though support is coming to Safari soon).
			 * - `preload-js` - uses `<link rel="preload">`. Prevents waterfalls in Chromium and Safari, but Chromium will parse each module twice (once as a script, once as a module). Causes modules to be requested twice in Firefox. This is a good setting if you want to maximise performance for users on iOS devices at the cost of a very slight degradation for Chromium users.
			 * - `preload-mjs` - uses `<link rel="preload">` but with the `.mjs` extension which prevents double-parsing in Chromium. Some static webservers will fail to serve .mjs files with a `Content-Type: application/javascript` header, which will cause your application to break. If that doesn't apply to you, this is the option that will deliver the best performance for the largest number of users, until `modulepreload` is more widely supported.
			 * */
			preloadStrategy?: 'modulepreload' | 'preload-js' | 'preload-mjs';
		};
		paths?: {
			/**
			 * An absolute path that your app's files are served from. This is useful if your files are served from a storage bucket of some kind.
			 * */
			assets?: '' | `http://${string}` | `https://${string}`;
			/**
			 * A root-relative path that must start, but not end with `/` (e.g. `/base-path`), unless it is the empty string. This specifies where your app is served from and allows the app to live on a non-root path. Note that you need to prepend all your root-relative links with the base value or they will point to the root of your domain, not your `base` (this is how the browser works). You can use [`base` from `$app/paths`](/docs/modules#$app-paths-base) for that: `<a href="{base}/your-page">Link</a>`. If you find yourself writing this often, it may make sense to extract this into a reusable component.
			 * */
			base?: '' | `/${string}`;
			/**
			 * Whether to use relative asset paths. By default, if `paths.assets` is not external, SvelteKit will replace `%sveltekit.assets%` with a relative path and use relative paths to reference build artifacts, but `base` and `assets` imported from `$app/paths` will be as specified in your config.
			 *
			 * If `true`, `base` and `assets` imported from `$app/paths` will be replaced with relative asset paths during server-side rendering, resulting in portable HTML.
			 * If `false`, `%sveltekit.assets%` and references to build artifacts will always be root-relative paths, unless `paths.assets` is an external URL
			 *
			 * If your app uses a `<base>` element, you should set this to `false`, otherwise asset URLs will incorrectly be resolved against the `<base>` URL rather than the current page.
			 * */
			relative?: boolean | undefined;
		};
		/**
		 * See [Prerendering](https://kit.svelte.dev/docs/page-options#prerender).
		 */
		prerender?: {
			/**
			 * How many pages can be prerendered simultaneously. JS is single-threaded, but in cases where prerendering performance is network-bound (for example loading content from a remote CMS) this can speed things up by processing other tasks while waiting on the network response.
			 * */
			concurrency?: number;
			/**
			 * Whether SvelteKit should find pages to prerender by following links from `entries`.
			 * */
			crawl?: boolean;
			/**
			 * An array of pages to prerender, or start crawling from (if `crawl: true`). The `*` string includes all non-dynamic routes (i.e. pages with no `[parameters]`, because SvelteKit doesn't know what value the parameters should have).
			 * */
			entries?: Array<'*' | `/${string}`>;
			/**
			 * How to respond to HTTP errors encountered while prerendering the app.
			 *
			 * - `'fail'` — fail the build
			 * - `'ignore'` - silently ignore the failure and continue
			 * - `'warn'` — continue, but print a warning
			 * - `(details) => void` — a custom error handler that takes a `details` object with `status`, `path`, `referrer`, `referenceType` and `message` properties. If you `throw` from this function, the build will fail
			 *
			 * ```js
			 * /// file: svelte.config.js
			 * /// type: import('@sveltejs/kit').Config
			 * const config = {
			 *   kit: {
			 *     prerender: {
			 *       handleHttpError: ({ path, referrer, message }) => {
			 *         // ignore deliberate link to shiny 404 page
			 *         if (path === '/not-found' && referrer === '/blog/how-we-built-our-404-page') {
			 *           return;
			 *         }
			 *
			 *         // otherwise fail the build
			 *         throw new Error(message);
			 *       }
			 *     }
			 *   }
			 * };
			 * ```
			 *
			 * */
			handleHttpError?: PrerenderHttpErrorHandlerValue;
			/**
			 * How to respond when hash links from one prerendered page to another don't correspond to an `id` on the destination page.
			 *
			 * - `'fail'` — fail the build
			 * - `'ignore'` - silently ignore the failure and continue
			 * - `'warn'` — continue, but print a warning
			 * - `(details) => void` — a custom error handler that takes a `details` object with `path`, `id`, `referrers` and `message` properties. If you `throw` from this function, the build will fail
			 *
			 * */
			handleMissingId?: PrerenderMissingIdHandlerValue;
			/**
			 * How to respond when an entry generated by the `entries` export doesn't match the route it was generated from.
			 *
			 * - `'fail'` — fail the build
			 * - `'ignore'` - silently ignore the failure and continue
			 * - `'warn'` — continue, but print a warning
			 * - `(details) => void` — a custom error handler that takes a `details` object with `generatedFromId`, `entry`, `matchedId` and `message` properties. If you `throw` from this function, the build will fail
			 *
			 * */
			handleEntryGeneratorMismatch?: PrerenderEntryGeneratorMismatchHandlerValue;
			/**
			 * The value of `url.origin` during prerendering; useful if it is included in rendered content.
			 * */
			origin?: string;
		};
		serviceWorker?: {
			/**
			 * Whether to automatically register the service worker, if it exists.
			 * */
			register?: boolean;
			/**
			 * Determine which files in your `static` directory will be available in `$service-worker.files`.
			 * */
			files?(filepath: string): boolean;
		};
		typescript?: {
			/**
			 * A function that allows you to edit the generated `tsconfig.json`. You can mutate the config (recommended) or return a new one.
			 * This is useful for extending a shared `tsconfig.json` in a monorepo root, for example.
			 * */
			config?: (config: Record<string, any>) => Record<string, any> | void;
		};
		/**
		 * Client-side navigation can be buggy if you deploy a new version of your app while people are using it. If the code for the new page is already loaded, it may have stale content; if it isn't, the app's route manifest may point to a JavaScript file that no longer exists.
		 * SvelteKit helps you solve this problem through version management.
		 * If SvelteKit encounters an error while loading the page and detects that a new version has been deployed (using the `name` specified here, which defaults to a timestamp of the build) it will fall back to traditional full-page navigation.
		 * Not all navigations will result in an error though, for example if the JavaScript for the next page is already loaded. If you still want to force a full-page navigation in these cases, use techniques such as setting the `pollInterval` and then using `beforeNavigate`:
		 * ```html
		 * /// file: +layout.svelte
		 * <script>
		 *   import { beforeNavigate } from '$app/navigation';
		 *   import { updated } from '$app/stores';
		 *
		 *   beforeNavigate(({ willUnload, to }) => {
		 *     if ($updated && !willUnload && to?.url) {
		 *       location.href = to.url.href;
		 *     }
		 *   });
		 * </script>
		 * ```
		 *
		 * If you set `pollInterval` to a non-zero value, SvelteKit will poll for new versions in the background and set the value of the [`updated`](/docs/modules#$app-stores-updated) store to `true` when it detects one.
		 */
		version?: {
			/**
			 * The current app version string. If specified, this must be deterministic (e.g. a commit ref rather than `Math.random()` or `Date.now().toString()`), otherwise defaults to a timestamp of the build.
			 *
			 * For example, to use the current commit hash, you could do use `git rev-parse HEAD`:
			 *
			 * ```js
			 * /// file: svelte.config.js
			 * import * as child_process from 'node:child_process';
			 *
			 * export default {
			 *   kit: {
			 *     version: {
			 *       name: child_process.execSync('git rev-parse HEAD').toString().trim()
			 *     }
			 *   }
			 * };
			 * ```
			 */
			name?: string;
			/**
			 * The interval in milliseconds to poll for version changes. If this is `0`, no polling occurs.
			 * */
			pollInterval?: number;
		};
	}

	/**
	 * The [`handle`](https://kit.svelte.dev/docs/hooks#server-hooks-handle) hook runs every time the SvelteKit server receives a [request](https://kit.svelte.dev/docs/web-standards#fetch-apis-request) and
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

	/**
	 * The server-side [`handleError`](https://kit.svelte.dev/docs/hooks#shared-hooks-handleerror) hook runs when an unexpected error is thrown while responding to a request.
	 *
	 * If an unexpected error is thrown during loading or rendering, this function will be called with the error and the event.
	 * Make sure that this function _never_ throws an error.
	 */
	export interface HandleServerError {
		(input: { error: unknown; event: RequestEvent }): MaybePromise<void | App.Error>;
	}

	/**
	 * The client-side [`handleError`](https://kit.svelte.dev/docs/hooks#shared-hooks-handleerror) hook runs when an unexpected error is thrown while navigating.
	 *
	 * If an unexpected error is thrown during loading or the following render, this function will be called with the error and the event.
	 * Make sure that this function _never_ throws an error.
	 */
	export interface HandleClientError {
		(input: { error: unknown; event: NavigationEvent }): MaybePromise<void | App.Error>;
	}

	/**
	 * The [`handleFetch`](https://kit.svelte.dev/docs/hooks#server-hooks-handlefetch) hook allows you to modify (or replace) a `fetch` request that happens inside a `load` function that runs on the server (or during pre-rendering)
	 */
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

	/**
	 * The generic form of `PageLoadEvent` and `LayoutLoadEvent`. You should import those from `./$types` (see [generated types](https://kit.svelte.dev/docs/types#generated-types))
	 * rather than using `LoadEvent` directly.
	 */
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
		 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://kit.svelte.dev/docs/types#public-types-cookies) API in a server-only `load` function instead.
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
		 * The parameters of the current page - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object
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

	/**
	 * Information about the target of a specific navigation.
	 */
	export interface NavigationTarget {
		/**
		 * Parameters of the target page - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object.
		 * Is `null` if the target is not part of the SvelteKit app (could not be resolved to a route).
		 */
		params: Record<string, string> | null;
		/**
		 * Info about the target route
		 */
		route: { id: string | null };
		/**
		 * The URL that is navigated to
		 */
		url: URL;
	}

	/**
	 * - `enter`: The app has hydrated
	 * - `form`: The user submitted a `<form>`
	 * - `leave`: The user is leaving the app by closing the tab or using the back/forward buttons to go to a different document
	 * - `link`: Navigation was triggered by a link click
	 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
	 * - `popstate`: Navigation was triggered by back/forward navigation
	 */
	export type NavigationType = 'enter' | 'form' | 'leave' | 'link' | 'goto' | 'popstate';

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
		 * - `form`: The user submitted a `<form>`
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
	 * The argument passed to [`beforeNavigate`](https://kit.svelte.dev/docs/modules#$app-navigation-beforenavigate) callbacks.
	 */
	export interface BeforeNavigate extends Navigation {
		/**
		 * Call this to prevent the navigation from starting.
		 */
		cancel(): void;
	}

	/**
	 * The argument passed to [`afterNavigate`](https://kit.svelte.dev/docs/modules#$app-navigation-afternavigate) callbacks.
	 */
	export interface AfterNavigate extends Navigation {
		/**
		 * The type of navigation:
		 * - `enter`: The app has hydrated
		 * - `form`: The user submitted a `<form>`
		 * - `link`: Navigation was triggered by a link click
		 * - `goto`: Navigation was triggered by a `goto(...)` call or a redirect
		 * - `popstate`: Navigation was triggered by back/forward navigation
		 */
		type: Omit<NavigationType, 'leave'>;
		/**
		 * Since `afterNavigate` is called after a navigation completes, it will never be called with a navigation that unloads the page.
		 */
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
		 * The parameters of the current page - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object
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

	/**
	 * The shape of a param matcher. See [matching](https://kit.svelte.dev/docs/advanced-routing#matching) for more info.
	 */
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
		 * The parameters of the current route - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object
		 */
		params: Params;
		/**
		 * Additional data made available through the adapter.
		 */
		platform: Readonly<App.Platform> | undefined;
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
		 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://kit.svelte.dev/docs/types#public-types-cookies) API instead.
		 */
		setHeaders(headers: Record<string, string>): void;
		/**
		 * The requested URL.
		 */
		url: URL;
		/**
		 * `true` if the request comes from the client asking for `+page/layout.server.js` data. The `url` property will be stripped of the internal information
		 * related to the data request in this case. Use this property instead if the distinction is important to you.
		 */
		isDataRequest: boolean;
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
		 * */
		transformPageChunk?(input: { html: string; done: boolean }): MaybePromise<string | undefined>;
		/**
		 * Determines which headers should be included in serialized responses when a `load` function loads a resource with `fetch`.
		 * By default, none will be included.
		 * */
		filterSerializedResponseHeaders?(name: string, value: string): boolean;
		/**
		 * Determines what should be added to the `<head>` tag to preload it.
		 * By default, `js`, `css` and `font` files will be preloaded.
		 * */
		preload?(input: { type: 'font' | 'css' | 'js' | 'asset'; path: string }): boolean;
	}

	export interface RouteDefinition<Config = any> {
		id: string;
		api: {
			methods: HttpMethod[];
		};
		page: {
			methods: Extract<HttpMethod, 'GET' | 'POST'>[];
		};
		pattern: RegExp;
		prerender: PrerenderOption;
		segments: RouteSegment[];
		methods: HttpMethod[];
		config: Config;
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
			client: NonNullable<BuildData['client']>;
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

	/**
	 * Shape of a form action method that is part of `export const actions = {..}` in `+page.server.js`.
	 * See [form actions](https://kit.svelte.dev/docs/form-actions) for more information.
	 */
	export interface Action<
		Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
		OutputData extends Record<string, any> | void = Record<string, any> | void,
		RouteId extends string | null = string | null
	> {
		(event: RequestEvent<Params, RouteId>): MaybePromise<OutputData>;
	}

	/**
	 * Shape of the `export const actions = {..}` object in `+page.server.js`.
	 * See [form actions](https://kit.svelte.dev/docs/form-actions) for more information.
	 */
	export type Actions<
		Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
		OutputData extends Record<string, any> | void = Record<string, any> | void,
		RouteId extends string | null = string | null
	> = Record<string, Action<Params, OutputData, RouteId>>;

	/**
	 * When calling a form action via fetch, the response will be one of these shapes.
	 * ```svelte
	 * <form method="post" use:enhance={() => {
	 *   return ({ result }) => {
	 * 		// result is of type ActionResult
	 *   };
	 * }}
	 * ```
	 */
	export type ActionResult<
		Success extends Record<string, unknown> | undefined = Record<string, any>,
		Failure extends Record<string, unknown> | undefined = Record<string, any>
	> =
		| { type: 'success'; status: number; data?: Success }
		| { type: 'failure'; status: number; data?: Failure }
		| { type: 'redirect'; status: number; location: string }
		| { type: 'error'; status?: number; error: any };

	/**
	 * The object returned by the [`error`](https://kit.svelte.dev/docs/modules#sveltejs-kit-error) function.
	 */
	export interface HttpError {
		/** The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses), in the range 400-599. */
		status: number;
		/** The content of the error. */
		body: App.Error;
	}

	/**
	 * The object returned by the [`redirect`](https://kit.svelte.dev/docs/modules#sveltejs-kit-redirect) function
	 */
	export interface Redirect {
		/** The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages), in the range 300-308. */
		status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
		/** The location to redirect to. */
		location: string;
	}

	/**
	 * The object returned by the [`fail`](https://kit.svelte.dev/docs/modules#sveltejs-kit-fail) function
	 */
	export interface ActionFailure<T extends Record<string, unknown> | undefined = undefined>
		extends UniqueInterface {
		/** The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses), in the range 400-599. */
		status: number;
		/** Data associated with the failure (e.g. validation errors) */
		data: T;
	}

	export interface SubmitFunction<
		Success extends Record<string, unknown> | undefined = Record<string, any>,
		Failure extends Record<string, unknown> | undefined = Record<string, any>
	> {
		(input: {
			action: URL;
			/**
			 * use `formData` instead of `data`
			 * */
			data: FormData;
			formData: FormData;
			/**
			 * use `formElement` instead of `form`
			 * */
			form: HTMLFormElement;
			formElement: HTMLFormElement;
			controller: AbortController;
			submitter: HTMLElement | null;
			cancel(): void;
		}): MaybePromise<
			| void
			| ((opts: {
					/**
					 * use `formData` instead of `data`
					 * */
					data: FormData;
					formData: FormData;
					/**
					 * use `formElement` instead of `form`
					 * */
					form: HTMLFormElement;
					formElement: HTMLFormElement;
					action: URL;
					result: ActionResult<Success, Failure>;
					/**
					 * Call this to get the default behavior of a form submission response.
					 * */
					update(options?: { reset: boolean }): Promise<void>;
			  }) => void)
		>;
	}

	/**
	 * The type of `export const snapshot` exported from a page or layout component.
	 */
	export interface Snapshot<T = any> {
		capture: () => T;
		restore: (snapshot: T) => void;
	}
	export interface AdapterEntry {
		/**
		 * A string that uniquely identifies an HTTP service (e.g. serverless function) and is used for deduplication.
		 * For example, `/foo/a-[b]` and `/foo/[c]` are different routes, but would both
		 * be represented in a Netlify _redirects file as `/foo/:param`, so they share an ID
		 */
		id: string;

		/**
		 * A function that compares the candidate route with the current route to determine
		 * if it should be grouped with the current route.
		 *
		 * Use cases:
		 * - Fallback pages: `/foo/[c]` is a fallback for `/foo/a-[b]`, and `/[...catchall]` is a fallback for all routes
		 * - Grouping routes that share a common `config`: `/foo` should be deployed to the edge, `/bar` and `/baz` should be deployed to a serverless function
		 */
		filter(route: RouteDefinition): boolean;

		/**
		 * A function that is invoked once the entry has been created. This is where you
		 * should write the function to the filesystem and generate redirect manifests.
		 */
		complete(entry: { generateManifest(opts: { relativePath: string }): string }): MaybePromise<void>;
	}

	// Based on https://github.com/josh-hemphill/csp-typed-directives/blob/latest/src/csp.types.ts
	//
	// MIT License
	//
	// Copyright (c) 2021-present, Joshua Hemphill
	// Copyright (c) 2021, Tecnico Corporation
	//
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the "Software"), to deal
	// in the Software without restriction, including without limitation the rights
	// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	// copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	//
	// The above copyright notice and this permission notice shall be included in all
	// copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	// SOFTWARE.

	export namespace Csp {
		type ActionSource = 'strict-dynamic' | 'report-sample';
		type BaseSource =
			| 'self'
			| 'unsafe-eval'
			| 'unsafe-hashes'
			| 'unsafe-inline'
			| 'wasm-unsafe-eval'
			| 'none';
		type CryptoSource = `${'nonce' | 'sha256' | 'sha384' | 'sha512'}-${string}`;
		type FrameSource = HostSource | SchemeSource | 'self' | 'none';
		type HostNameScheme = `${string}.${string}` | 'localhost';
		type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;
		type HostProtocolSchemes = `${string}://` | '';
		type HttpDelineator = '/' | '?' | '#' | '\\';
		type PortScheme = `:${number}` | '' | ':*';
		type SchemeSource = 'http:' | 'https:' | 'data:' | 'mediastream:' | 'blob:' | 'filesystem:';
		type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
		type Sources = Source[];
		type UriPath = `${HttpDelineator}${string}`;
	}

	export interface CspDirectives {
		'child-src'?: Csp.Sources;
		'default-src'?: Array<Csp.Source | Csp.ActionSource>;
		'frame-src'?: Csp.Sources;
		'worker-src'?: Csp.Sources;
		'connect-src'?: Csp.Sources;
		'font-src'?: Csp.Sources;
		'img-src'?: Csp.Sources;
		'manifest-src'?: Csp.Sources;
		'media-src'?: Csp.Sources;
		'object-src'?: Csp.Sources;
		'prefetch-src'?: Csp.Sources;
		'script-src'?: Array<Csp.Source | Csp.ActionSource>;
		'script-src-elem'?: Csp.Sources;
		'script-src-attr'?: Csp.Sources;
		'style-src'?: Array<Csp.Source | Csp.ActionSource>;
		'style-src-elem'?: Csp.Sources;
		'style-src-attr'?: Csp.Sources;
		'base-uri'?: Array<Csp.Source | Csp.ActionSource>;
		sandbox?: Array<
			| 'allow-downloads-without-user-activation'
			| 'allow-forms'
			| 'allow-modals'
			| 'allow-orientation-lock'
			| 'allow-pointer-lock'
			| 'allow-popups'
			| 'allow-popups-to-escape-sandbox'
			| 'allow-presentation'
			| 'allow-same-origin'
			| 'allow-scripts'
			| 'allow-storage-access-by-user-activation'
			| 'allow-top-navigation'
			| 'allow-top-navigation-by-user-activation'
		>;
		'form-action'?: Array<Csp.Source | Csp.ActionSource>;
		'frame-ancestors'?: Array<Csp.HostSource | Csp.SchemeSource | Csp.FrameSource>;
		'navigate-to'?: Array<Csp.Source | Csp.ActionSource>;
		'report-uri'?: Csp.UriPath[];
		'report-to'?: string[];

		'require-trusted-types-for'?: Array<'script'>;
		'trusted-types'?: Array<'none' | 'allow-duplicates' | '*' | string>;
		'upgrade-insecure-requests'?: boolean;

		
		'require-sri-for'?: Array<'script' | 'style' | 'script style'>;

		
		'block-all-mixed-content'?: boolean;

		
		'plugin-types'?: Array<`${string}/${string}` | 'none'>;

		
		referrer?: Array<
			| 'no-referrer'
			| 'no-referrer-when-downgrade'
			| 'origin'
			| 'origin-when-cross-origin'
			| 'same-origin'
			| 'strict-origin'
			| 'strict-origin-when-cross-origin'
			| 'unsafe-url'
			| 'none'
		>;
	}

	export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

	export interface Logger {
		(msg: string): void;
		success(msg: string): void;
		error(msg: string): void;
		warn(msg: string): void;
		minor(msg: string): void;
		info(msg: string): void;
	}

	export type MaybePromise<T> = T | Promise<T>;

	export interface Prerendered {
		/**
		 * A map of `path` to `{ file }` objects, where a path like `/foo` corresponds to `foo.html` and a path like `/bar/` corresponds to `bar/index.html`.
		 */
		pages: Map<
			string,
			{
				/** The location of the .html file relative to the output directory */
				file: string;
			}
		>;
		/**
		 * A map of `path` to `{ type }` objects.
		 */
		assets: Map<
			string,
			{
				/** The MIME type of the asset */
				type: string;
			}
		>;
		/**
		 * A map of redirects encountered during prerendering.
		 */
		redirects: Map<
			string,
			{
				status: number;
				location: string;
			}
		>;
		/** An array of prerendered paths (without trailing slashes, regardless of the trailingSlash config) */
		paths: string[];
	}

	export interface PrerenderHttpErrorHandler {
		(details: {
			status: number;
			path: string;
			referrer: string | null;
			referenceType: 'linked' | 'fetched';
			message: string;
		}): void;
	}

	export interface PrerenderMissingIdHandler {
		(details: { path: string; id: string; referrers: string[]; message: string }): void;
	}

	export interface PrerenderEntryGeneratorMismatchHandler {
		(details: { generatedFromId: string; entry: string; matchedId: string; message: string }): void;
	}

	export type PrerenderHttpErrorHandlerValue = 'fail' | 'warn' | 'ignore' | PrerenderHttpErrorHandler;
	export type PrerenderMissingIdHandlerValue = 'fail' | 'warn' | 'ignore' | PrerenderMissingIdHandler;
	export type PrerenderEntryGeneratorMismatchHandlerValue =
		| 'fail'
		| 'warn'
		| 'ignore'
		| PrerenderEntryGeneratorMismatchHandler;

	export type PrerenderOption = boolean | 'auto';

	export type PrerenderMap = Map<string, PrerenderOption>;

	export interface RequestOptions {
		getClientAddress(): string;
		platform?: App.Platform;
	}

	export interface RouteSegment {
		content: string;
		dynamic: boolean;
		rest: boolean;
	}

	export type TrailingSlash = 'never' | 'always' | 'ignore';

	/**
	 * This doesn't actually exist, it's a way to better distinguish the type
	 */
	export const uniqueSymbol: unique symbol;

	export interface UniqueInterface {
		readonly [uniqueSymbol]: unknown;
	}
	import { SvelteComponent } from 'svelte/internal';

	export interface ServerModule {
		Server: typeof InternalServer;
	}

	export interface ServerInternalModule {
		set_building(building: boolean): void;
		set_assets(path: string): void;
		set_private_env(environment: Record<string, string>): void;
		set_public_env(environment: Record<string, string>): void;
		set_version(version: string): void;
		set_fix_stack_trace(fix_stack_trace: (stack: string) => string): void;
	}

	export interface Asset {
		file: string;
		size: number;
		type: string | null;
	}

	export interface AssetDependencies {
		file: string;
		imports: string[];
		stylesheets: string[];
		fonts: string[];
	}

	export interface BuildData {
		app_dir: string;
		app_path: string;
		manifest_data: ManifestData;
		service_worker: string | null;
		client: {
			start: string;
			app: string;
			imports: string[];
			stylesheets: string[];
			fonts: string[];
		} | null;
		server_manifest: import('vite').Manifest;
	}

	export interface CSRPageNode {
		component: typeof SvelteComponent;
		universal: {
			load?: Load;
			trailingSlash?: TrailingSlash;
		};
	}

	export type CSRPageNodeLoader = () => Promise<CSRPageNode>;

	/**
	 * Definition of a client side route.
	 * The boolean in the tuples indicates whether the route has a server load.
	 */
	export type CSRRoute = {
		id: string;
		exec(path: string): undefined | Record<string, string>;
		errors: Array<CSRPageNodeLoader | undefined>;
		layouts: Array<[has_server_load: boolean, node_loader: CSRPageNodeLoader] | undefined>;
		leaf: [has_server_load: boolean, node_loader: CSRPageNodeLoader];
	};

	export interface Deferred {
		fulfil: (value: any) => void;
		reject: (error: Error) => void;
	}

	export type GetParams = (match: RegExpExecArray) => Record<string, string>;

	export interface ServerHooks {
		handleFetch: HandleFetch;
		handle: Handle;
		handleError: HandleServerError;
	}

	export interface ClientHooks {
		handleError: HandleClientError;
	}

	export interface Env {
		private: Record<string, string>;
		public: Record<string, string>;
	}

	export class InternalServer extends Server {
		init(options: ServerInitOptions): Promise<void>;
		respond(
			request: Request,
			options: RequestOptions & {
				prerendering?: PrerenderOptions;
				read: (file: string) => Buffer;
			}
		): Promise<Response>;
	}

	export interface ManifestData {
		assets: Asset[];
		nodes: PageNode[];
		routes: RouteData[];
		matchers: Record<string, string>;
	}

	export interface PageNode {
		depth: number;
		component?: string; // TODO supply default component if it's missing (bit of an edge case)
		universal?: string;
		server?: string;
		parent_id?: string;
		parent?: PageNode;
		/**
		 * Filled with the pages that reference this layout (if this is a layout)
		 */
		child_pages?: PageNode[];
	}

	export interface PrerenderDependency {
		response: Response;
		body: null | string | Uint8Array;
	}

	export interface PrerenderOptions {
		cache?: string; // including this here is a bit of a hack, but it makes it easy to add <meta http-equiv>
		fallback?: boolean;
		dependencies: Map<string, PrerenderDependency>;
	}

	export type RecursiveRequired<T> = {
		// Recursive implementation of TypeScript's Required utility type.
		// Will recursively continue until it reaches a primitive or Function
		[K in keyof T]-?: Extract<T[K], Function> extends never // If it does not have a Function type
			? RecursiveRequired<T[K]> // recursively continue through.
			: T[K]; // Use the exact type for everything else
	};

	export type RequiredResolveOptions = Required<ResolveOptions>;

	export interface RouteParam {
		name: string;
		matcher: string;
		optional: boolean;
		rest: boolean;
		chained: boolean;
	}

	/**
	 * Represents a route segment in the app. It can either be an intermediate node
	 * with only layout/error pages, or a leaf, at which point either `page` and `leaf`
	 * or `endpoint` is set.
	 */
	export interface RouteData {
		id: string;
		parent: RouteData | null;

		segment: string;
		pattern: RegExp;
		params: RouteParam[];

		layout: PageNode | null;
		error: PageNode | null;
		leaf: PageNode | null;

		page: {
			layouts: Array<number | undefined>;
			errors: Array<number | undefined>;
			leaf: number;
		} | null;

		endpoint: {
			file: string;
		} | null;
	}

	export type ServerRedirectNode = {
		type: 'redirect';
		location: string;
	};

	export type ServerNodesResponse = {
		type: 'data';
		/**
		 * If `null`, then there was no load function <- TODO is this outdated now with the recent changes?
		 */
		nodes: Array<ServerDataNode | ServerDataSkippedNode | ServerErrorNode | null>;
	};

	export type ServerDataResponse = ServerRedirectNode | ServerNodesResponse;

	/**
	 * Signals a successful response of the server `load` function.
	 * The `uses` property tells the client when it's possible to reuse this data
	 * in a subsequent request.
	 */
	export interface ServerDataNode {
		type: 'data';
		/**
		 * The serialized version of this contains a serialized representation of any deferred promises,
		 * which will be resolved later through chunk nodes.
		 */
		data: Record<string, any> | null;
		uses: Uses;
		slash?: TrailingSlash;
	}

	/**
	 * Resolved data/error of a deferred promise.
	 */
	export interface ServerDataChunkNode {
		type: 'chunk';
		id: number;
		data?: Record<string, any>;
		error?: any;
	}

	/**
	 * Signals that the server `load` function was not run, and the
	 * client should use what it has in memory
	 */
	export interface ServerDataSkippedNode {
		type: 'skip';
	}

	/**
	 * Signals that the server `load` function failed
	 */
	export interface ServerErrorNode {
		type: 'error';
		error: App.Error;
		/**
		 * Only set for HttpErrors
		 */
		status?: number;
	}

	export interface ServerMetadataRoute {
		config: any;
		api: {
			methods: HttpMethod[];
		};
		page: {
			methods: Array<'GET' | 'POST'>;
		};
		methods: HttpMethod[];
		prerender: PrerenderOption | undefined;
		entries: Array<string> | undefined;
	}

	export interface ServerMetadata {
		nodes: Array<{ has_server_load: boolean }>;
		routes: Map<string, ServerMetadataRoute>;
	}

	export interface SSRComponent {
		default: {
			render(props: Record<string, any>): {
				html: string;
				head: string;
				css: {
					code: string;
					map: any; // TODO
				};
			};
		};
	}

	export type SSRComponentLoader = () => Promise<SSRComponent>;

	export interface SSRNode {
		component: SSRComponentLoader;
		/** index into the `components` array in client/manifest.js */
		index: number;
		/** external JS files */
		imports: string[];
		/** external CSS files */
		stylesheets: string[];
		/** external font files */
		fonts: string[];
		/** inlined styles */
		inline_styles?(): MaybePromise<Record<string, string>>;

		universal: {
			load?: Load;
			prerender?: PrerenderOption;
			ssr?: boolean;
			csr?: boolean;
			trailingSlash?: TrailingSlash;
			config?: any;
			entries?: PrerenderEntryGenerator;
		};

		server: {
			load?: ServerLoad;
			prerender?: PrerenderOption;
			ssr?: boolean;
			csr?: boolean;
			trailingSlash?: TrailingSlash;
			actions?: Actions;
			config?: any;
			entries?: PrerenderEntryGenerator;
		};

		universal_id: string;
		server_id: string;
	}

	export type SSRNodeLoader = () => Promise<SSRNode>;

	export interface SSROptions {
		app_template_contains_nonce: boolean;
		csp: ValidatedConfig['kit']['csp'];
		csrf_check_origin: boolean;
		track_server_fetches: boolean;
		embedded: boolean;
		env_public_prefix: string;
		hooks: ServerHooks;
		preload_strategy: ValidatedConfig['kit']['output']['preloadStrategy'];
		root: SSRComponent['default'];
		service_worker: boolean;
		templates: {
			app(values: {
				head: string;
				body: string;
				assets: string;
				nonce: string;
				env: Record<string, string>;
			}): string;
			error(values: { message: string; status: number }): string;
		};
		version_hash: string;
	}

	export interface PageNodeIndexes {
		errors: Array<number | undefined>;
		layouts: Array<number | undefined>;
		leaf: number;
	}

	export type PrerenderEntryGenerator = () => MaybePromise<Array<Record<string, string>>>;

	export type SSREndpoint = Partial<Record<HttpMethod, RequestHandler>> & {
		prerender?: PrerenderOption;
		trailingSlash?: TrailingSlash;
		config?: any;
		entries?: PrerenderEntryGenerator;
	};

	export interface SSRRoute {
		id: string;
		pattern: RegExp;
		params: RouteParam[];
		page: PageNodeIndexes | null;
		endpoint: (() => Promise<SSREndpoint>) | null;
		endpoint_id?: string;
	}

	export interface SSRState {
		fallback?: string;
		getClientAddress(): string;
		/**
		 * True if we're currently attempting to render an error page
		 */
		error: boolean;
		/**
		 * Allows us to prevent `event.fetch` from making infinitely looping internal requests
		 */
		depth: number;
		platform?: any;
		prerendering?: PrerenderOptions;
		/**
		 * When fetching data from a +server.js endpoint in `load`, the page's
		 * prerender option is inherited by the endpoint, unless overridden
		 */
		prerender_default?: PrerenderOption;
		read?: (file: string) => Buffer;
	}

	export type StrictBody = string | ArrayBufferView;

	export interface Uses {
		dependencies: Set<string>;
		params: Set<string>;
		parent: boolean;
		route: boolean;
		url: boolean;
	}

	export type ValidatedConfig = RecursiveRequired<Config>;

	export type ValidatedKitConfig = RecursiveRequired<KitConfig>;
    export function error(status: number, body: App.Error): {
        status: number;
        body: App.Error;
        toString(): string;
    };
    export function error(status: number, body?: {
        message: string;
    } extends App.Error ? App.Error | string | undefined : never): {
        status: number;
        body: App.Error;
        toString(): string;
    };
    /**
     * Create a `Redirect` object. If thrown during request handling, SvelteKit will return a redirect response.
     * Make sure you're not catching the thrown redirect, which would prevent SvelteKit from handling it.
     * */
    export function redirect(status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308, location: string): {
        status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
        location: string;
    };
    /**
     * Create a JSON `Response` object from the supplied data.
     * */
    export function json(data: any, init?: ResponseInit | undefined): Response;
    /**
     * Create a `Response` object from the supplied body.
     * */
    export function text(body: string, init?: ResponseInit | undefined): Response;
    /**
     * Create an `ActionFailure` object.
     * */
    export function fail(status: number, data?: Record<string, any> | undefined): {
        status: number;
        data: Record<string, any> | undefined;
    };
    /**
     * Populate a route ID with params to resolve a pathname.
     * */
    export function resolvePath(id: string, params: Record<string, string | undefined>): string;
}

declare module '@sveltejs/kit/hooks' {

	/**
	 * A helper function for sequencing multiple `handle` calls in a middleware-like manner.
	 * The behavior for the `handle` options is as follows:
	 * - `transformPageChunk` is applied in reverse order and merged
	 * - `preload` is applied in forward order, the first option "wins" and no `preload` options after it are called
	 * - `filterSerializedResponseHeaders` behaves the same as `preload`
	 *
	 * ```js
	 * /// file: src/hooks.server.js
	 * import { sequence } from '@sveltejs/kit/hooks';
	 *
	 * /// type: import('@sveltejs/kit').Handle
	 * async function first({ event, resolve }) {
	 * 	console.log('first pre-processing');
	 * 	const result = await resolve(event, {
	 * 		transformPageChunk: ({ html }) => {
	 * 			// transforms are applied in reverse order
	 * 			console.log('first transform');
	 * 			return html;
	 * 		},
	 * 		preload: () => {
	 * 			// this one wins as it's the first defined in the chain
	 * 			console.log('first preload');
	 * 		}
	 * 	});
	 * 	console.log('first post-processing');
	 * 	return result;
	 * }
	 *
	 * /// type: import('@sveltejs/kit').Handle
	 * async function second({ event, resolve }) {
	 * 	console.log('second pre-processing');
	 * 	const result = await resolve(event, {
	 * 		transformPageChunk: ({ html }) => {
	 * 			console.log('second transform');
	 * 			return html;
	 * 		},
	 * 		preload: () => {
	 * 			console.log('second preload');
	 * 		},
	 * 		filterSerializedResponseHeaders: () => {
	 * 			// this one wins as it's the first defined in the chain
	 *    		console.log('second filterSerializedResponseHeaders');
	 * 		}
	 * 	});
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
	 * first preload
	 * second pre-processing
	 * second filterSerializedResponseHeaders
	 * second transform
	 * first transform
	 * second post-processing
	 * first post-processing
	 * ```
	 *
	 * */
	export function sequence(...handlers: import('@sveltejs/kit').Handle[]): import('@sveltejs/kit').Handle;
}

declare module '@sveltejs/kit/node' {
    export function getRequest({ request, base, bodySizeLimit }: {
        request: any;
        base: any;
        bodySizeLimit: any;
    }): Promise<Request>;

    export function setResponse(res: any, response: any): Promise<void>;
}

declare module '@sveltejs/kit/node/polyfills' {
	/**
	 * Make various web APIs available as globals:
	 * - `crypto`
	 * - `fetch`
	 * - `Headers`
	 * - `Request`
	 * - `Response`
	 */
	export function installPolyfills(): void;
}

declare module '@sveltejs/kit/vite' {
	/**
	 * Returns the SvelteKit Vite plugins.
	 * */
	export function sveltekit(): Promise<import('vite').Plugin[]>;
	export { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
}

declare module '$app/environment' {
	/**
	 * `true` if the app is running in the browser.
	 */
	export const browser: boolean;
	/**
	 * Whether the dev server is running. This is not guaranteed to correspond to `NODE_ENV` or `MODE`.
	 */
	export const dev: boolean;
	export { building, version } from "__sveltekit/environment";
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
    export function deserialize<Success_1 extends Record<string, unknown> | undefined, Invalid_1 extends Record<string, unknown> | undefined>(result: string): import("@sveltejs/kit").ActionResult<Success_1, Invalid_1>;
    /**
     * This action enhances a `<form>` element that otherwise would work without JavaScript.
     *
     * The `submit` function is called upon submission with the given FormData and the `action` that should be triggered.
     * If `cancel` is called, the form will not be submitted.
     * You can use the abort `controller` to cancel the submission in case another one starts.
     * If a function is returned, that function is called with the response from the server.
     * If nothing is returned, the fallback will be used.
     *
     * If this function or its return value isn't set, it
     * - falls back to updating the `form` prop with the returned data if the action is one same page as the form
     * - updates `$page.status`
     * - resets the `<form>` element and invalidates all data in case of successful submission with no redirect response
     * - redirects in case of a redirect response
     * - redirects to the nearest error page in case of an unexpected error
     *
     * If you provide a custom function with a callback and want to use the default behavior, invoke `update` in your callback.
     * */
    export function enhance<Success_1 extends Record<string, unknown> | undefined, Invalid_1 extends Record<string, unknown> | undefined>(form_element: HTMLFormElement, submit?: import("@sveltejs/kit").SubmitFunction<Success_1, Invalid_1>): {
        destroy(): void;
    };
    /**
     * This action updates the `form` property of the current page with the given data and updates `$page.status`.
     * In case of an error, it redirects to the nearest error page.
     * */
    export const applyAction: any;
}

declare module '$app/navigation' {
	/**
	 * If called when the page is being updated following a navigation (in `onMount` or `afterNavigate` or an action, for example), this disables SvelteKit's built-in scroll handling.
	 * This is generally discouraged, since it breaks user expectations.
	 * */
	export const disableScrollHandling: () => void;
	/**
	 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified `url`.
	 * For external URLs, use `window.location = url` instead of calling `goto(url)`.
	 *
	 * */
	export const goto: any;
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
	 * */
	export const invalidate: any;
	/**
	 * Causes all `load` functions belonging to the currently active page to re-run. Returns a `Promise` that resolves when the page is subsequently updated.
	 * */
	export const invalidateAll: any;
	/**
	 * Programmatically preloads the given page, which means
	 *  1. ensuring that the code for the page is loaded, and
	 *  2. calling the page's load function with the appropriate options.
	 *
	 * This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with `data-sveltekit-preload-data`.
	 * If the next navigation is to `href`, the values returned from load will be used, making navigation instantaneous.
	 * Returns a Promise that resolves when the preload is complete.
	 *
	 * */
	export const preloadData: any;
	/**
	 * Programmatically imports the code for routes that haven't yet been fetched.
	 * Typically, you might call this to speed up subsequent navigation.
	 *
	 * You can specify routes by any matching pathname such as `/about` (to match `src/routes/about/+page.svelte`) or `/blog/*` (to match `src/routes/blog/[slug]/+page.svelte`).
	 *
	 * Unlike `preloadData`, this won't call `load` functions.
	 * Returns a Promise that resolves when the modules have been imported.
	 * */
	export const preloadCode: any;
	/**
	 * A navigation interceptor that triggers before we navigate to a new URL, whether by clicking a link, calling `goto(...)`, or using the browser back/forward controls.
	 * Calling `cancel()` will prevent the navigation from completing. If the navigation would have directly unloaded the current page, calling `cancel` will trigger the native
	 * browser unload confirmation dialog. In these cases, `navigation.willUnload` is `true`.
	 *
	 * When a navigation isn't client side, `navigation.to.route.id` will be `null`.
	 *
	 * `beforeNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
	 * */
	export const beforeNavigate: any;
	/**
	 * A lifecycle function that runs the supplied `callback` when the current component mounts, and also whenever we navigate to a new URL.
	 *
	 * `afterNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
	 * */
	export const afterNavigate: any;
}

declare module '$app/paths' {
	/**
	 * A string that matches [`config.kit.paths.base`](https://kit.svelte.dev/docs/configuration#paths).
	 *
	 * Example usage: `<a href="{base}/your-page">Link</a>`
	 */
	export const base: "" | `/${string}`;
	/**
	 * An absolute path that matches [`config.kit.paths.assets`](https://kit.svelte.dev/docs/configuration#paths).
	 *
	 * > If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during `vite dev` or `vite preview`, since the assets don't yet live at their eventual URL.
	 */
	export const assets: "" | `http://${string}` | `https://${string}` | "/_svelte_kit_assets";
}

declare module '$app/stores' {
    export function getStores(): {
        
        page: typeof page;
        
        navigating: typeof navigating;
        
        updated: typeof updated;
    };
    /**
     * A readable store whose value contains page data.
     *
     * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
     *
     * */
    export const page: import('svelte/store').Readable<import('@sveltejs/kit').Page>;
    /**
     * A readable store.
     * When navigating starts, its value is a `Navigation` object with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
     * When navigating finishes, its value reverts to `null`.
     *
     * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
     * */
    export const navigating: import('svelte/store').Readable<import('@sveltejs/kit').Navigation | null>;
    /**
     * A readable store whose initial value is `false`. If [`version.pollInterval`](https://kit.svelte.dev/docs/configuration#version) is a non-zero value, SvelteKit will poll for new versions of the app and update the store value to `true` when it detects one. `updated.check()` will force an immediate check, regardless of polling.
     *
     * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
     * */
    export const updated: import('svelte/store').Readable<boolean> & {
        check(): Promise<boolean>;
    };
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
	 * Defines the common shape of expected and unexpected errors. Expected errors are thrown using the `error` function. Unexpected errors are handled by the `handleError` hooks which should return this shape.
	 */
	export interface Error {
		message: string;
	}

	/**
	 * The interface that defines `event.locals`, which can be accessed in [hooks](https://kit.svelte.dev/docs/hooks) (`handle`, and `handleError`), server-only `load` functions, and `+server.js` files.
	 */
	export interface Locals {}

	/**
	 * Defines the common shape of the [$page.data store](https://kit.svelte.dev/docs/modules#$app-stores-page) - that is, the data that is shared between all pages.
	 * The `Load` and `ServerLoad` functions in `./$types` will be narrowed accordingly.
	 * Use optional properties for data that is only present on specific pages. Do not add an index signature (`[key: string]: any`).
	 */
	export interface PageData {}

	/**
	 * If your adapter provides [platform-specific context](https://kit.svelte.dev/docs/adapters#platform-specific-context) via `event.platform`, you can specify it here.
	 */
	export interface Platform {}
}

/**
 * This module is only available to [service workers](https://kit.svelte.dev/docs/service-workers).
 */
declare module '$service-worker' {
	/**
	 * The `base` path of the deployment. Typically this is equivalent to `config.kit.paths.base`, but it is calculated from `location.pathname` meaning that it will continue to work correctly if the site is deployed to a subdirectory.
	 * Note that there is a `base` but no `assets`, since service workers cannot be used if `config.kit.paths.assets` is specified.
	 */
	export const base: string;
	/**
	 * An array of URL strings representing the files generated by Vite, suitable for caching with `cache.addAll(build)`.
	 * During development, this is an empty array.
	 */
	export const build: string[];
	/**
	 * An array of URL strings representing the files in your static directory, or whatever directory is specified by `config.kit.files.assets`. You can customize which files are included from `static` directory using [`config.kit.serviceWorker.files`](https://kit.svelte.dev/docs/configuration)
	 */
	export const files: string[];
	/**
	 * An array of pathnames corresponding to prerendered pages and endpoints.
	 * During development, this is an empty array.
	 */
	export const prerendered: string[];
	/**
	 * See [`config.kit.version`](https://kit.svelte.dev/docs/configuration#version). It's useful for generating unique cache names inside your service worker, so that a later deployment of your app can invalidate old caches.
	 */
	export const version: string;
}