import { Adapter } from '@sveltejs/kit';
import { Options } from '@sveltejs/vite-plugin-svelte';
import {
	CspDirectives,
	PrerenderEntryGeneratorMismatchHandlerValue,
	PrerenderHttpErrorHandlerValue,
	PrerenderInvalidUrlHandlerValue,
	PrerenderMissingIdHandlerValue,
	PrerenderUnseenRoutesHandlerValue
} from 'types';

export * from './index.js';

/**
 * An extension of [`vite-plugin-svelte`'s options](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#svelte-options).
 */
export type Config = Omit<Options, 'experimental'> & {
	/**
	 * Your [adapter](https://svelte.dev/docs/kit/adapters) is run when executing `vite build`. It determines how the output is converted for different platforms.
	 * @default undefined
	 */
	adapter?: Adapter;
	/**
	 * An object containing zero or more aliases used to replace values in `import` statements. These aliases are automatically passed to Vite and TypeScript.
	 *
	 * This option is deprecated. Use [subpath imports](https://svelte.dev/docs/kit/$lib) instead.
	 *
	 * > [!NOTE] You will need to run `npm run dev` to have SvelteKit automatically generate the required alias configuration in `jsconfig.json` or `tsconfig.json`.
	 * @deprecated
	 * @default {}
	 */
	alias?: Record<string, string>;
	/**
	 * The directory where SvelteKit keeps its stuff, including static assets (such as JS and CSS) and internally-used routes.
	 *
	 * If `paths.assets` is specified, there will be two app directories — `${paths.assets}/${appDir}` and `${paths.base}/${appDir}`.
	 * @default "_app"
	 */
	appDir?: string;
	/**
	 * [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) configuration. CSP helps to protect your users against cross-site scripting (XSS) attacks, by limiting the places resources can be loaded from. For example, a configuration like this...
	 *
	 * ```js
	 * /// file: vite.config.js
	 * import { sveltekit } from '@sveltejs/kit/vite';
	 * import { defineConfig } from 'vite';
	 *
	 * export default defineConfig({
	 * 	plugins: [
	 * 		sveltekit({
	 * 			csp: {
	 * 				directives: {
	 * 					'script-src': ['self']
	 * 				},
	 * 				// must be specified with either the `report-uri` or `report-to` directives, or both
	 * 				reportOnly: {
	 * 					'script-src': ['self'],
	 * 					'report-uri': ['/']
	 * 				}
	 * 			}
	 * 		})
	 * 	]
	 * });
	 * ```
	 *
	 * ...would prevent scripts loading from external sites. SvelteKit will augment the specified directives with nonces or hashes (depending on `mode`) for any inline styles and scripts it generates.
	 *
	 * To add a nonce for scripts and links manually included in `src/app.html`, you may use the placeholder `%sveltekit.nonce%` (for example `<script nonce="%sveltekit.nonce%">`).
	 *
	 * When pages are prerendered, the CSP header is added via a `<meta http-equiv>` tag (note that in this case, `frame-ancestors`, `report-uri` and `sandbox` directives will be ignored).
	 *
	 * > [!NOTE] When `mode` is `'auto'`, SvelteKit will use nonces for dynamically rendered pages and hashes for prerendered pages. Using nonces with prerendered pages is insecure and therefore forbidden.
	 *
	 * If this level of configuration is insufficient and you have more dynamic requirements, you can use the [`handle` hook](https://svelte.dev/docs/kit/hooks#handle) to roll your own CSP.
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
		 * @default true
		 * @deprecated removed in 3.0. Use `trustedOrigins: ['*']` instead
		 */
		checkOrigin?: boolean;
		/**
		 * An array of origins that are allowed to make cross-origin form submissions to your app.
		 *
		 * Each origin should be a complete origin including protocol (e.g., `https://payment-gateway.com`).
		 * This is useful for allowing trusted third-party services like payment gateways or authentication providers to submit forms to your app.
		 *
		 * If the array contains `'*'`, all origins will be trusted. This is generally not recommended!
		 *
		 * > [!NOTE] Only add origins you completely trust, as this bypasses CSRF protection for those origins.
		 *
		 * CSRF checks only apply in production, not in local development.
		 * @default []
		 * @example
		 * ```js
		 * ['https://checkout.stripe.com', 'https://accounts.google.com']
		 * ```
		 */
		trustedOrigins?: string[];
	};
	/**
	 * Whether or not the app is embedded inside a larger app. If `true`, SvelteKit will add its event listeners related to navigation etc on the parent of `%sveltekit.body%` instead of `window`, and will pass `params` from the server rather than inferring them from `location.pathname`.
	 * Note that it is generally not supported to embed multiple SvelteKit apps on the same page and use client-side SvelteKit features within them (things such as pushing to the history state assume a single instance).
	 * @default false
	 */
	embedded?: boolean;
	/**
	 * Environment variable configuration
	 */
	env?: {
		/**
		 * The directory to search for `.env` files.
		 * @default "."
		 */
		dir?: string;
	};
	/** Experimental features. Here be dragons. These are not subject to semantic versioning, so breaking changes or removal can happen in any release. */
	experimental?: Options['experimental'] & {
		/**
		 * Whether to enable the experimental remote functions feature. This feature is not yet stable and may be changed or removed at any time.
		 * @default false
		 */
		remoteFunctions?: boolean;

		/**
		 * Whether to enable the experimental forked preloading feature using Svelte's fork API.
		 * @default false
		 */
		forkPreloads?: boolean;
	};
	/**
	 * Where to find various files within your project.
	 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
	 */
	files?: {
		/**
		 * The location of your source code.
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "src"
		 * @since 2.28
		 */
		src?: string;
		/**
		 * A place to put static files that should have stable URLs and undergo no processing, such as `favicon.ico` or `manifest.json`.
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "static"
		 */
		assets?: string;
		hooks?: {
			/**
			 * The location of your client [hooks](https://svelte.dev/docs/kit/hooks).
			 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
			 * @default "src/hooks.client"
			 */
			client?: string;
			/**
			 * The location of your server [hooks](https://svelte.dev/docs/kit/hooks).
			 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
			 * @default "src/hooks.server"
			 */
			server?: string;
			/**
			 * The location of your universal [hooks](https://svelte.dev/docs/kit/hooks).
			 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
			 * @default "src/hooks"
			 * @since 2.3.0
			 */
			universal?: string;
		};
		/**
		 * A directory containing [parameter matchers](https://svelte.dev/docs/kit/advanced-routing#Matching).
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "src/params"
		 */
		params?: string;
		/**
		 * The files that define the structure of your app (see [Routing](https://svelte.dev/docs/kit/routing)).
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "src/routes"
		 */
		routes?: string;
		/**
		 * The location of your service worker's entry point (see [Service workers](https://svelte.dev/docs/kit/service-workers)).
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "src/service-worker"
		 */
		serviceWorker?: string;
		/**
		 * The location of the template for HTML responses.
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "src/app.html"
		 */
		appTemplate?: string;
		/**
		 * The location of the template for fallback error responses.
		 * @deprecated this feature is still supported, but it's generally recommended to use [monorepos](https://levelup.video/tutorials/monorepos-with-pnpm) instead
		 * @default "src/error.html"
		 */
		errorTemplate?: string;
	};
	/**
	 * Inline CSS inside a `<style>` block at the head of the HTML. This option is a number that specifies the maximum length of a CSS file in UTF-16 code units, as specified by the [String.length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length) property, to be inlined. All CSS files needed for the page that are smaller than this value are merged and inlined in a `<style>` block.
	 *
	 * > [!NOTE] This results in fewer initial requests and can improve your [First Contentful Paint](https://web.dev/first-contentful-paint) score. However, it generates larger HTML output and reduces the effectiveness of browser caches. Use it advisedly.
	 * @default 0
	 */
	inlineStyleThreshold?: number;
	/**
	 * An array of file extensions that SvelteKit will treat as modules. Files with extensions that match neither `config.extensions` nor `config.moduleExtensions` will be ignored by the router.
	 * @default [".js", ".ts"]
	 */
	moduleExtensions?: string[];
	/**
	 * The directory that SvelteKit writes files to during `dev` and `build`. You should exclude this directory from version control.
	 * @default ".svelte-kit"
	 */
	outDir?: string;
	/**
	 * Options related to the build output format
	 */
	output?: {
		/**
		 * Whether to use the [HTTP `Link` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Link) to preload assets instead of the [`<link>` HTML element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link) for non-prerendered pages.
		 *
		 * Note that some web servers such as Nginx and Apache have a default header size limit which may be easily exceeded.
		 * If you are using one of these web servers, you may want to leave this as `false` or configure a higher limit.
		 *
		 * @default false
		 * @since 3.0.0
		 */
		linkHeaderPreload?: boolean;
		/**
		 * SvelteKit will preload the JavaScript modules needed for the initial page to avoid import 'waterfalls', resulting in faster application startup. There
		 * are three strategies with different trade-offs:
		 * - `modulepreload` - uses `<link rel="modulepreload">`. This delivers the best results in Chromium-based browsers, in Firefox 115+, and Safari 17+. It is ignored in older browsers.
		 * - `preload-js` - uses `<link rel="preload">`. Prevents waterfalls in Chromium and Safari, but Chromium will parse each module twice (once as a script, once as a module). Causes modules to be requested twice in Firefox. This is a good setting if you want to maximise performance for users on iOS devices at the cost of a very slight degradation for Chromium users.
		 * - `preload-mjs` - uses `<link rel="preload">` but with the `.mjs` extension which prevents double-parsing in Chromium. Some static webservers will fail to serve .mjs files with a `Content-Type: application/javascript` header, which will cause your application to break. If that doesn't apply to you, this is the option that will deliver the best performance for the largest number of users, until `modulepreload` is more widely supported.
		 * @default "modulepreload"
		 * @since 1.8.4
		 * @deprecated removed in 3.0
		 */
		preloadStrategy?: 'modulepreload' | 'preload-js' | 'preload-mjs';
		/**
		 * The bundle strategy option affects how your app's JavaScript and CSS files are loaded.
		 * - If `'split'`, splits the app up into multiple .js/.css files so that they are loaded lazily as the user navigates around the app. This is the default, and is recommended for most scenarios.
		 * - If `'single'`, creates just one .js bundle and one .css file containing code for the entire app.
		 * - If `'inline'`, inlines all JavaScript and CSS of the entire app into the HTML. The result is usable without a server (i.e. you can just open the file in your browser).
		 *
		 * When using `'split'`, you can also adjust the bundling behaviour by setting [`output.codeSplitting`](https://rolldown.rs/reference/OutputOptions.codeSplitting) inside your Vite config's [`build.rolldownOptions`](https://vite.dev/config/build-options#build-rolldownoptions).
		 *
		 * If you want to inline your assets, you'll need to set Vite's [`build.assetsInlineLimit`](https://vite.dev/config/build-options.html#build-assetsinlinelimit) option to an appropriate size then import your assets through Vite.
		 *
		 * ```js
		 * /// file: vite.config.js
		 * import { sveltekit } from '@sveltejs/kit/vite';
		 * import { defineConfig } from 'vite';
		 *
		 * export default defineConfig({
		 *   plugins: [sveltekit()],
		 *   build: {
		 *     // inline all imported assets
		 *     assetsInlineLimit: Infinity
		 *   }
		 * });
		 * ```
		 *
		 * ```svelte
		 * /// file: src/routes/+layout.svelte
		 * <script>
		 *   // import the asset through Vite
		 *   import favicon from './favicon.png';
		 * </script>
		 *
		 * <svelte:head>
		 *   <!-- this asset will be inlined as a base64 URL -->
		 *   <link rel="icon" href={favicon} />
		 * </svelte:head>
		 * ```
		 * @default 'split'
		 * @since 2.13.0
		 */
		bundleStrategy?: 'split' | 'single' | 'inline';
	};
	paths?: {
		/**
		 * An absolute path that your app's files are served from. This is useful if your files are served from a storage bucket of some kind.
		 * @default ""
		 */
		assets?: '' | `http://${string}` | `https://${string}`;
		/**
		 * A root-relative path that must start, but not end with `/` (e.g. `/base-path`), unless it is the empty string. This specifies where your app is served from and allows the app to live on a non-root path. Note that you need to prepend all your root-relative links with the base value or they will point to the root of your domain, not your `base` (this is how the browser works). You can use [`resolve(...)` from `$app/paths`](https://svelte.dev/docs/kit/$app-paths#resolve) for that: `<a href="{resolve('/your-page')}">Link</a>`. If you find yourself writing this often, it may make sense to extract this into a reusable component.
		 * @default ""
		 */
		base?: '' | `/${string}`;
		/**
		 * The origin of your app, used for CSRF protection and prerendering.
		 *
		 * By default, this is `undefined`, meaning SvelteKit will derive the origin from `request.url` (which is set by the adapter, and ultimately by the platform).
		 *
		 * If your app is served from an origin that isn't known at request time — for example because it's deployed to a preview deployment whose URL isn't known at build time, or because it's behind a reverse proxy that doesn't pass the `host` header — you can set this to a string like `https://my-site.com`.
		 *
		 * This is also used as the value of `url.origin` during prerendering (when unset, it defaults to `http://sveltekit-prerender`), and as the trusted origin for CSRF checks on form submissions and remote function calls.
		 *
		 * @default undefined
		 * @since 3.0
		 */
		origin?: string;
		/**
		 * Whether to use relative asset paths.
		 *
		 * If `true`, paths created with `resolve()` and `asset()` imported from `$app/paths` will be replaced with relative asset paths during server-side rendering, resulting in more portable HTML.
		 * If `false`, `%sveltekit.assets%` and references to build artifacts will always be root-relative paths, unless `paths.assets` is an external URL
		 *
		 * [Single-page app](https://svelte.dev/docs/kit/single-page-apps) fallback pages will always use absolute paths, regardless of this setting.
		 *
		 * If your app uses a `<base>` element, you should set this to `false`, otherwise asset URLs will incorrectly be resolved against the `<base>` URL rather than the current page.
		 *
		 * In 1.0, `undefined` was a valid value, which was set by default. In that case, if `paths.assets` was not external, SvelteKit would replace `%sveltekit.assets%` with a relative path and use relative paths to reference build artifacts, but `base` and `assets` imported from `$app/paths` would be as specified in your config.
		 *
		 * @default true
		 * @since 1.9.0
		 */
		relative?: boolean;
	};
	/**
	 * See [Prerendering](https://svelte.dev/docs/kit/page-options#prerender).
	 */
	prerender?: {
		/**
		 * How many pages can be prerendered simultaneously. JS is single-threaded, but in cases where prerendering performance is network-bound (for example loading content from a remote CMS) this can speed things up by processing other tasks while waiting on the network response.
		 * @default 1
		 */
		concurrency?: number;
		/**
		 * Whether SvelteKit should find pages to prerender by following links from `entries`.
		 * @default true
		 */
		crawl?: boolean;
		/**
		 * An array of pages to prerender, or start crawling from (if `crawl: true`). The `*` string includes all routes containing no required `[parameters]`  with optional parameters included as being empty (since SvelteKit doesn't know what value any parameters should have).
		 * @default ["*"]
		 */
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
		 * /// file: vite.config.js
		 * import { sveltekit } from '@sveltejs/kit/vite';
		 * import { defineConfig } from 'vite';
		 *
		 * export default defineConfig({
		 * 	plugins: [
		 * 		sveltekit({
		 *  		prerender: {
		 *  			handleHttpError: ({ path, referrer, message }) => {
		 * 					// ignore deliberate link to shiny 404 page
		 * 					if (path === '/not-found' && referrer === '/blog/how-we-built-our-404-page') {
		 * 						return;
		 * 					}
		 *
		 * 					// otherwise fail the build
		 * 					throw new Error(message);
		 * 				}
		 * 			}
		 * 		})
		 * 	]
		 * });
		 * ```
		 *
		 * @default "fail"
		 * @since 1.15.7
		 */
		handleHttpError?: PrerenderHttpErrorHandlerValue;
		/**
		 * How to respond when hash links from one prerendered page to another don't correspond to an `id` on the destination page.
		 *
		 * - `'fail'` — fail the build
		 * - `'ignore'` - silently ignore the failure and continue
		 * - `'warn'` — continue, but print a warning
		 * - `(details) => void` — a custom error handler that takes a `details` object with `path`, `id`, `referrers` and `message` properties. If you `throw` from this function, the build will fail
		 *
		 * @default "fail"
		 * @since 1.15.7
		 */
		handleMissingId?: PrerenderMissingIdHandlerValue;
		/**
		 * How to respond when an entry generated by the `entries` export doesn't match the route it was generated from.
		 *
		 * - `'fail'` — fail the build
		 * - `'ignore'` - silently ignore the failure and continue
		 * - `'warn'` — continue, but print a warning
		 * - `(details) => void` — a custom error handler that takes a `details` object with `generatedFromId`, `entry`, `matchedId` and `message` properties. If you `throw` from this function, the build will fail
		 *
		 * @default "fail"
		 * @since 1.16.0
		 */
		handleEntryGeneratorMismatch?: PrerenderEntryGeneratorMismatchHandlerValue;
		/**
		 * How to respond when a route is marked as prerenderable but has not been prerendered.
		 *
		 * - `'fail'` — fail the build
		 * - `'ignore'` - silently ignore the failure and continue
		 * - `'warn'` — continue, but print a warning
		 * - `(details) => void` — a custom error handler that takes a `details` object with a `routes` property which contains all routes that haven't been prerendered. If you `throw` from this function, the build will fail
		 *
		 * The default behavior is to fail the build. This may be undesirable when you know that some of your routes may never be reached under certain
		 * circumstances such as a CMS not returning data for a specific area, resulting in certain routes never being reached.
		 *
		 * @default "fail"
		 * @since 2.16.0
		 */
		handleUnseenRoutes?: PrerenderUnseenRoutesHandlerValue;
		/**
		 * How to respond when SvelteKit encounters a URL it cannot parse while crawling prerendered HTML (for example, an AT Protocol URL such as `at://did:plc:...`).
		 *
		 * - `'fail'` — fail the build
		 * - `'ignore'` - silently ignore the failure and continue
		 * - `'warn'` — continue, but print a warning
		 * - `(details) => void` — a custom error handler that takes a `details` object with `href`, `referrer` and `message` properties. If you `throw` from this function, the build will fail
		 *
		 * @default "fail"
		 * @since 2.67.0
		 */
		handleInvalidUrl?: PrerenderInvalidUrlHandlerValue;
	};
	router?: {
		/**
		 * What type of client-side router to use.
		 * - `'pathname'` is the default and means the current URL pathname determines the route
		 * - `'hash'` means the route is determined by `location.hash`. In this case, SSR and prerendering are disabled. This is only recommended if `pathname` is not an option, for example because you don't control the webserver where your app is deployed.
		 *   It comes with some caveats: you can't use server-side rendering (or indeed any server logic), and you have to make sure that the links in your app all start with #/, or they won't work. Beyond that, everything works exactly like a normal SvelteKit app.
		 *
		 * @default "pathname"
		 * @since 2.14.0
		 */
		type?: 'pathname' | 'hash';
		/**
		 * How to determine which route to load when navigating to a new page.
		 *
		 * By default, SvelteKit will serve a route manifest to the browser.
		 * When navigating, this manifest is used (along with the `reroute` hook, if it exists) to determine which components to load and which `load` functions to run.
		 * Because everything happens on the client, this decision can be made immediately. The drawback is that the manifest needs to be
		 * loaded and parsed before the first navigation can happen, which may have an impact if your app contains many routes.
		 *
		 * Alternatively, SvelteKit can determine the route on the server. This means that for every navigation to a path that has not yet been visited, the server will be asked to determine the route.
		 * This has several advantages:
		 * - The client does not need to load the routing manifest upfront, which can lead to faster initial page loads
		 * - The list of routes is hidden from public view
		 * - The server has an opportunity to intercept each navigation (for example through middleware in front of SvelteKit, such as a reverse proxy or your platform's edge functions), enabling (for example) A/B testing opaque to SvelteKit
		 *
		 * Route resolution requests are answered as soon as the route has been looked up, before the `handle` hook is invoked. To intercept them within SvelteKit itself, use the `reroute` hook, which runs for these requests too.
		 *
		 * The drawback is that for unvisited paths, resolution will take slightly longer (though this is mitigated by [preloading](https://svelte.dev/docs/kit/link-options#data-sveltekit-preload-data)).
		 *
		 * > [!NOTE] When using server-side route resolution and prerendering, the resolution is prerendered along with the route itself.
		 *
		 * @default "client"
		 * @since 2.17.0
		 */
		resolution?: 'client' | 'server';
	};
	serviceWorker?:
		| {
				/**
				 * Whether to automatically register the service worker, if it exists.
				 * @default true
				 */
				register: true;
				/**
				 * Options for serviceWorker.register("...", options);
				 */
				options?: RegistrationOptions;
		  }
		| {
				/**
				 * Whether to automatically register the service worker, if it exists.
				 * @default true
				 */
				register?: false;
		  };
	/**
	 * Options for enabling [OpenTelemetry](https://opentelemetry.io/) tracing for SvelteKit operations.
	 * @default { server: false }
	 */
	tracing?: {
		/**
		 * Enables server-side [OpenTelemetry](https://opentelemetry.io/) span emission for SvelteKit operations including the [`handle` hook](https://svelte.dev/docs/kit/hooks#handle), [`load` functions](https://svelte.dev/docs/kit/load), [form actions](https://svelte.dev/docs/kit/form-actions), and [remote functions](https://svelte.dev/docs/kit/remote-functions). Tracing — and more significantly, observability instrumentation — can have a nontrivial overhead, so consider whether you really need it, or if it might be more appropriate to turn it on in development and preview environments only.
		 * @default false
		 */
		server?: boolean;
	};
	/**
	 * @deprecated Add configuration to `tsconfig.json` directly
	 */
	typescript?: {
		/**
		 * A function that allows you to edit the generated `tsconfig.json`. You can mutate the config (recommended) or return a new one.
		 * This is useful for extending a shared `tsconfig.json` in a monorepo root, for example.
		 *
		 * Note that any paths configured here should be relative to the generated config file, which is written to `node_modules/$app/tsconfig.json`.
		 *
		 * @default (config) => config
		 * @since 1.3.0
		 */
		config?: (config: Record<string, any>) => Record<string, any> | void;
	};
	/**
	 * Client-side navigation can be buggy if you deploy a new version of your app while people are using it. If the code for the new page is already loaded, it may have stale content; if it isn't, the app's route manifest may point to a JavaScript file that no longer exists.
	 * SvelteKit helps you solve this problem through version management. The current version is included in data, remote, and form action responses via the `x-sveltekit-version` header, so SvelteKit can detect new deployments without polling — for example when a navigation triggers a server `load` function, or when a remote function is called. SvelteKit also checks for new versions when the tab regains focus or becomes visible.
	 * If SvelteKit encounters an error while loading the page and detects that a new version has been deployed (using the `name` specified here, which defaults to a timestamp of the build) it will fall back to traditional full-page navigation.
	 * Not all navigations will result in an error though, for example if the JavaScript for the next page is already loaded. If you still want to force a full-page navigation in these cases, use `beforeNavigate`:
	 * ```html
	 * /// file: +layout.svelte
	 * <script>
	 *   import { beforeNavigate } from '$app/navigation';
	 *   import { updated } from '$app/state';
	 *
	 *   beforeNavigate(({ willUnload, to }) => {
	 *     if (updated.current && !willUnload && to?.url) {
	 *       location.href = to.url.href;
	 *     }
	 *   });
	 * </script>
	 * ```
	 *
	 * In addition to these checks, SvelteKit polls for new versions on an interval and sets [`updated.current`](https://svelte.dev/docs/kit/$app-state#updated) to `true` when it detects one. Set `pollInterval` to `0` to disable polling (the header- and event-based checks will still run).
	 */
	version?: {
		/**
		 * The current app version string. If specified, this must be deterministic (e.g. a commit ref rather than `Math.random()` or `Date.now().toString()`), otherwise defaults to a timestamp of the build.
		 *
		 * For example, to use the current commit hash, you could do use `git rev-parse HEAD`:
		 *
		 * ```js
		 * /// file: vite.config.js
		 * import * as child_process from 'node:child_process';
		 * import { sveltekit } from '@sveltejs/kit/vite';
		 * import { defineConfig } from 'vite';
		 *
		 * export default defineConfig({
		 * 	plugins: [
		 * 		sveltekit({
		 *  		version: {
		 * 				name: child_process.execSync('git rev-parse HEAD').toString().trim()
		 * 			}
		 * 		})
		 * 	]
		 * });
		 * ```
		 */
		name?: string;
		/**
		 * The interval in milliseconds to poll for version changes. If this is `0`, no polling occurs. SvelteKit also checks for new versions on server responses (via the `x-sveltekit-version` header) and when the tab regains focus or becomes visible, so polling is only needed for long-lived sessions on a single page.
		 * @default 3600000
		 */
		pollInterval?: number;
	};
};
