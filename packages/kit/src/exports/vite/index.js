/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { Options } from '@sveltejs/vite-plugin-svelte' */
/** @import { PreprocessorGroup } from 'svelte/compiler' */
/** @import {  ManifestData, RemoteChunk, ServerMetadata, ValidatedConfig } from 'types' */
/** @import { CorsOptions, Plugin, ResolvedConfig, Rolldown, UserConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';

import { resolve_entry } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { to_fs } from '../../utils/vite.js';
import { runtime_directory, logger, get_global_name } from '../../core/utils.js';
import { dev } from './dev/index.js';
import { preview } from './preview/index.js';
import {
	enforced_config,
	get_config_aliases,
	is_remote_module,
	remote_module_pattern,
	warn_overridden_config
} from './utils.js';
import { stackless } from '../../utils/error.js';
import { s } from '../../utils/misc.js';
import { dedent } from '../../core/sync/utils.js';
import create_manifest_data from '../../core/sync/create_manifest_data/index.js';
import { get_import_aliases, get_hash_import_keys } from '../../utils/imports.js';
import { import_peer } from '../../utils/import.js';
import { should_ignore, has_children } from './static_analysis/utils.js';
import { process_config, split_config, validate_config } from '../../core/config/index.js';
import { plugin_env_vars, plugin_service_worker_env_vars } from './plugins/env-vars.js';
import { plugin_guard } from './plugins/guard.js';
import { plugin_remote, plugin_remote_guard } from './plugins/remote.js';
import { write_app_manifest } from '../../core/sync/write_app_manifest.js';
import { plugin_service_worker_build } from './build/service-worker.js';
import { plugin_adapter, plugin_compile } from './build/index.js';

const options_regex = /(export\s+const\s+(prerender|csr|ssr|trailingSlash))\s*=/s;

/**
 * Resolves the CORS config for dev and preview servers.
 * SvelteKit needs `preflightContinue: true` so that OPTIONS requests for
 * `+server.js` endpoints aren't intercepted by Vite's CORS middleware.
 * If the user has explicitly set values that prevent this, we warn them
 * and preserve their settings.
 * @param {CorsOptions | boolean | undefined} user_cors
 * @param {'server.cors' | 'preview.cors'} key
 * @param {boolean} warn Whether to emit a warning when the user's settings prevent OPTIONS handlers from working. Only relevant for the dev/preview servers, not `vite build`.
 * @returns {CorsOptions | undefined}
 */
function resolve_cors(user_cors, key, warn) {
	// `preview.cors` falls back to the resolved `server.cors`, so emitting a value here when
	// the user hasn't set one is what drops Vite's `defaultAllowedOrigins` restriction
	if (user_cors === undefined) {
		return key === 'server.cors' ? { preflightContinue: true } : undefined;
	}

	// with `cors: false` Vite installs no CORS middleware, so OPTIONS handlers already work
	if (user_cors === false) return undefined;

	if (typeof user_cors === 'object' && user_cors !== null) {
		if (user_cors.preflightContinue === undefined) return { preflightContinue: true };
		if (user_cors.preflightContinue) return undefined;
	}

	if (warn) {
		console.warn(
			styleText(
				['yellow', 'bold'],
				`OPTIONS request handlers will not work unless \`${key}.preflightContinue\` is set to \`true\``
			)
		);
	}

	return undefined;
}

const removed_modules = [
	{
		name: '$lib',
		pattern: /^\$lib(?:\/.*|\?.*)?$/,
		message:
			"`$lib` has been removed. Use `#lib` instead: https://svelte.dev/docs/kit/$lib. To keep using `$lib`, add `alias: { '$lib': 'src/lib' }` to your SvelteKit config."
	},
	{
		name: '$service-worker',
		pattern: /^\$service-worker(?:\?.*)?$/,
		message:
			'`$service-worker` has been removed. Use `immutable`, `assets` and `prerendered` from `$app/manifest`, `version` from `$app/env`, and `resolve(...)` from `$app/paths` instead: https://svelte.dev/docs/kit/$service-worker'
	}
];

/** @type {Set<string>} */
const warned = new Set();

/** @type {PreprocessorGroup} */
const warning_preprocessor = {
	name: 'sveltekit:warnings',
	script: ({ content, filename }) => {
		if (!filename) return;

		const basename = path.basename(filename);
		if (basename.startsWith('+page.') || basename.startsWith('+layout.')) {
			const match = content.match(options_regex);
			if (match && match.index !== undefined && !should_ignore(content, match.index)) {
				const fixed = basename.replace('.svelte', '(.server).js/ts');

				const message =
					`\n${styleText(['bold', 'red'], path.relative(process.cwd(), filename))}\n` +
					`\`${match[1]}\` will be ignored — move it to ${fixed} instead. See https://svelte.dev/docs/kit/page-options for more information.`;

				if (!warned.has(message)) {
					console.log(message);
					warned.add(message);
				}
			}
		}
	},
	markup: ({ content, filename }) => {
		if (!filename) return;

		const basename = path.basename(filename);

		if (basename.startsWith('+layout.') && !has_children(content, true)) {
			const message =
				`\n${styleText(['bold', 'red'], path.relative(process.cwd(), filename))}\n` +
				'`<slot />` or `{@render ...}` tag' +
				' missing — inner content will not be rendered';

			if (!warned.has(message)) {
				console.log(message);
				warned.add(message);
			}
		}
	}
};

/** @type {typeof import('@sveltejs/vite-plugin-svelte')} */
let vite_plugin_svelte;

/**
 * The SvelteKit Vite plugin, which must be added to your `vite.config.js` file along with your project's configuration:
 *
 * ```js
 * /// file: vite.config.js
 * import adapter from '@sveltejs/adapter-auto';
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 * 	plugins: [
 * 		sveltekit({
 * 			adapter: adapter(),
 * 			compilerOptions: {
 * 				experimental: {
 * 					async: true
 * 				}
 * 			},
 * 			experimental: {
 * 				remoteFunctions: true
 * 			}
 * 		})
 * 	]
 * });
 * ```
 *
 * As well as SvelteKit, the plugin options are used by other tooling that integrates with Svelte such as editor extensions.
 *
 * Any options that don't belong to SvelteKit are passed through to [`vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md), so you can set options like `inspector` here too. The `experimental` namespace is shared — SvelteKit reads its own flags and forwards the rest.
 *
 * > [!LEGACY]
 * > Prior to SvelteKit 3, config lived in a `svelte.config.js` file, which is no longer supported. The ability to configure SvelteKit via `vite.config.js` was added in version 2.62.
 *
 * @param {import('./public.js').Config} [config]
 * @returns {Promise<Plugin[]>}
 */
export async function sveltekit(config) {
	const cwd = process.cwd();

	// any options passed to the plugin that SvelteKit doesn't use itself are
	// forwarded to vite-plugin-svelte, which does its own validation
	const split = split_config(config ?? {});
	const svelte_config = validate_config(split.svelte_config);

	if (Array.isArray(svelte_config.preprocess)) {
		svelte_config.preprocess.push(warning_preprocessor);
	} else if (svelte_config.preprocess) {
		svelte_config.preprocess = [svelte_config.preprocess, warning_preprocessor];
	} else {
		svelte_config.preprocess = warning_preprocessor;
	}

	vite_plugin_svelte = await import_peer('@sveltejs/vite-plugin-svelte', cwd);

	/** @type {Partial<Options>} */
	const inline_vps_config = {
		preprocess: svelte_config.preprocess,
		// pass through any options that SvelteKit doesn't use itself, so that
		// the options SvelteKit manages always take precedence
		...split.vite_plugin_svelte_config,
		// we don't want vite-plugin-svelte to load the svelte.config.js file because
		// we expect options to be passed through the SvelteKit Vite plugin
		configFile: false
	};

	// vite-plugin-svelte inline config options need to be added conditionally
	// because passing undefined causes it to crash
	if (svelte_config.extensions) {
		inline_vps_config.extensions = svelte_config.extensions;
	}

	if (svelte_config.compilerOptions) {
		inline_vps_config.compilerOptions = svelte_config.compilerOptions;
	}

	return [...vite_plugin_svelte.svelte(inline_vps_config), ...kit({ svelte_config })];
}

/** @param {UserConfig | ResolvedConfig} vite_config */
function resolve_root(vite_config) {
	return posixify(vite_config.root ? path.resolve(vite_config.root) : process.cwd());
}

/**
 * Returns the SvelteKit Vite plugin. Vite executes Rolldown hooks as well as some of its own.
 * Background reading is available at:
 * - https://vite.dev/guide/api-plugin.html
 * - https://rolldown.rs/apis/plugin-api
 *
 * You can get an idea of the lifecycle by looking at the flow charts here:
 * - https://rolldown.rs/apis/plugin-api#build-hooks
 * - https://rolldown.rs/apis/plugin-api#output-generation-hooks
 *
 * @param {object} opts
 * @param {ValidatedConfig} opts.svelte_config
 * @return {Plugin[]}
 */
function kit({ svelte_config }) {
	/** @type {typeof import('vite')} */
	let vite;

	/**
	 * The posix-ified root of the project based on the Vite configuration.
	 * @type {string}
	 */
	let root;

	/** @type {ValidatedConfig} */
	let kit;
	/** @type {string} `kit.outDir` but posix-ified */
	let out_dir;
	/** @type {string} The base directory for the Vite builds */
	let out;

	/** @type {boolean} */
	let is_build;

	/** @type {ManifestData} */
	let manifest_data;

	/** @type {UserConfig} */
	let initial_config;

	/** @type {string | null} */
	let service_worker_entry_file;
	/** @type {Array<{ alias: string, path: string }>} */
	let normalized_aliases;

	const sourcemapIgnoreList = /** @param {string} relative_path */ (relative_path) =>
		relative_path.includes('node_modules') || relative_path.includes(kit.outDir);

	/** @type {string} the `__sveltekit_xxx` name, without `globalThis.` */
	let global_name;

	/** @type {string} name for `globalThis.__sveltekit_xxx` */
	let kit_global;

	/** @type {Plugin} */
	const plugin_resolve_root = {
		name: 'vite-plugin-sveltekit-resolve-root',
		// make sure it runs first
		enforce: 'pre',
		config: {
			order: 'pre',
			handler(config) {
				root = resolve_root(config);

				for (const file of ['svelte.config.js', 'svelte.config.ts']) {
					if (fs.existsSync(path.join(root, file))) {
						throw new Error(
							`${file} is no longer used. Please pass configuration via the \`sveltekit(...)\` plugin in your Vite config.`
						);
					}
				}
			}
		}
	};

	/** @type {Plugin} */
	const plugin_setup = {
		name: 'vite-plugin-sveltekit-setup',
		api: {
			options: svelte_config
		},
		resolveId: {
			filter: { id: removed_modules.map(({ pattern }) => pattern) },
			async handler(id, importer, options) {
				const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
				if (resolved) return resolved;

				const aliases = svelte_config.alias;
				for (const { name, pattern, message } of removed_modules) {
					if (!pattern.test(id)) continue;

					// If the user re-added an alias for this module (as the migration message
					// suggests), a failed resolution means a genuine missing file rather than
					// use of the removed module. Let Vite report the real "not found" error
					// instead of the misleading migration message.
					if (name in aliases || `${name}/*` in aliases) return;

					throw stackless(message);
				}
			}
		},

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		config: {
			order: 'pre',
			async handler(config, config_env) {
				initial_config = config;

				// if the initial command was `build`, we want to reuse that whenever
				// the plugin loads again
				process.env.SVELTEKIT_BUILD ??= s(config_env.command === 'build');
				is_build = process.env.SVELTEKIT_BUILD === 'true';

				kit = process_config(svelte_config, root);
				out_dir = posixify(kit.outDir);
				out = `${out_dir}/output`;

				global_name = get_global_name(kit.version.name, !is_build);
				kit_global = `globalThis.${global_name}`;

				service_worker_entry_file = resolve_entry(kit.files.serviceWorker);
				service_worker_entry_file &&= posixify(service_worker_entry_file);

				vite = await import_peer('vite', root);

				normalized_aliases = get_import_aliases(root, vite.normalizePath.bind(vite));

				// Add `#`-prefixed import keys to the enforced config so users are warned
				// if they try to set them in their Vite config's resolve.alias
				const enforced_alias = /** @type {Record<string, true>} */ (
					/** @type {any} */ (enforced_config.resolve).alias
				);
				for (const key of get_hash_import_keys(root)) {
					enforced_alias[key] = true;
				}

				const allow = new Set([
					kit.files.routes,
					kit.files.src,
					kit.outDir,
					path.resolve(root, kit.files.src),
					path.resolve(root, 'node_modules'),
					// ensures that the client entry is served even if it's located outside
					// the local node_modules, such as the pnpm global virtual store
					runtime_directory,
					path.resolve('node_modules'),
					// include the directory that contains the workspaces declaration
					// which usually also contains hoisted packages
					// see https://vite.dev/guide/api-javascript#searchforworkspaceroot
					path.resolve(vite.searchForWorkspaceRoot(process.cwd()), 'node_modules')
				]);

				// Add directories from `#`-prefixed package.json imports to the allow list
				for (const { path: alias_path } of normalized_aliases) {
					allow.add(alias_path);
				}

				// We can only add directories to the allow list, so we find out
				// if there's a client hooks file and pass its directory
				const client_hooks = resolve_entry(kit.files.hooks.client);
				if (client_hooks) allow.add(path.dirname(client_hooks));

				// dev and preview config can be shared
				/** @type {UserConfig} */
				const new_config = {
					appType: 'custom',
					environments: {
						ssr: {
							build: {
								sourcemap:
									config.environments?.ssr?.build?.sourcemap ?? config.build?.sourcemap ?? true
							}
						}
					},
					resolve: {
						alias: [
							{ find: '$app', replacement: `${runtime_directory}/app` },
							{ find: '$env', replacement: `${runtime_directory}/env` },
							{
								find: '<sveltekit:generated>',
								replacement: `${out_dir}/generated/${is_build ? 'build' : 'dev'}`
							},
							...get_config_aliases(kit, root)
						]
					},
					server: {
						cors: resolve_cors(config.server?.cors, 'server.cors', !is_build),
						fs: {
							allow: [...allow]
						},
						sourcemapIgnoreList,
						watch: {
							ignored: [
								// Ignore all siblings of config.outDir/generated
								`${out_dir}/!(generated)`
							]
						}
					},
					preview: {
						cors: resolve_cors(config.preview?.cors, 'preview.cors', !is_build)
					},
					optimizeDeps: {
						entries: [
							`${kit.files.routes}/**/+*.{svelte,js,ts}`,
							`!${kit.files.routes}/**/+*server.*`
						],
						exclude: [
							// Without this SvelteKit will be prebundled on the client, which means we end up with two versions of Redirect etc.
							// Also see https://github.com/sveltejs/kit/issues/5952#issuecomment-1218844057
							'@sveltejs/kit',
							// exclude kit features so that libraries using them work even when they are prebundled
							// this does not affect app code, just handling of imported libraries that use $app or $env
							'$app',
							'$env'
						],
						// avoid Vite dev server reloading the first time a page is requested
						include: ['@sveltejs/kit > devalue', '@sveltejs/kit > esm-env']
					},
					ssr: {
						noExternal: [
							// This ensures that esm-env is inlined into the server output with the
							// export conditions resolved correctly through Vite. This prevents adapters
							// that bundle later on from resolving the export conditions incorrectly
							// and for example include browser-only code in the server output
							// because they for example use rolldown.build with `platform: 'browser'`
							'esm-env',
							// This forces `$app/*` modules to be bundled, since they depend on
							// generated modules like `<sveltekit:generated>/env/config.js` (this isn't a valid bare
							// import, but it works with vite-node's externalization logic, which
							// uses basic concatenation)
							'@sveltejs/kit/src/runtime'
						]
					},
					publicDir: kit.files.assets
				};

				// externalize .remote.js files to stop dependency tracing during prebundling
				if (kit.experimental.remoteFunctions) {
					// @ts-expect-error optimizeDeps is already set above
					new_config.optimizeDeps.rolldownOptions ??= {};
					// @ts-expect-error
					new_config.optimizeDeps.rolldownOptions.plugins ??= [];
					// @ts-expect-error
					new_config.optimizeDeps.rolldownOptions.plugins.push(
						/** @type {Rolldown.Plugin} */ ({
							name: 'vite-plugin-sveltekit-setup:optimize-remote-functions',
							resolveId: {
								filter: { id: remote_module_pattern },
								async handler(id, importer) {
									const resolved = await this.resolve(id, importer, { skipSelf: true });
									if (!resolved) return { id, external: true };
									if (!is_remote_module(resolved.id)) return;
									// a servable /@fs url; 'absolute' stops rolldown relativizing it in the deps bundle
									return { id: to_fs(resolved.id), external: 'absolute' };
								}
							}
						})
					);
				}

				const define = {
					__SVELTEKIT_APP_DIR__: s(posixify(kit.appDir)),
					__SVELTEKIT_APP_VERSION__: s(kit.version.name),
					__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__: s(kit.output.bundleStrategy !== 'inline'),
					__SVELTEKIT_EMBEDDED__: s(kit.embedded),
					__SVELTEKIT_FORK_PRELOADS__: s(kit.experimental.forkPreloads),
					__SVELTEKIT_PATHS_ASSETS__: s(kit.paths.assets),
					__SVELTEKIT_PATHS_BASE__: s(kit.paths.base),
					__SVELTEKIT_PATHS_RELATIVE__: s(kit.paths.relative),
					__SVELTEKIT_CLIENT_ROUTING__: s(kit.router.resolution === 'client'),
					__SVELTEKIT_HASH_ROUTING__: s(kit.router.type === 'hash'),
					__SVELTEKIT_SERVER_TRACING_ENABLED__: s(kit.tracing.server),
					__SVELTEKIT_SUPPORTS_ASYNC__: s(
						svelte_config.compilerOptions?.experimental?.async ?? false
					),
					__SVELTEKIT_DEV__: s(!is_build),
					__SVELTEKIT_GLOBAL_NAME__: s(global_name),
					__SVELTEKIT_CSRF_CHECK_ORIGIN__: s(!kit.csrf.trustedOrigins.includes('*')),
					__SVELTEKIT_LINK_HEADER_PRELOAD__: s(kit.output.linkHeaderPreload),
					__SVELTEKIT_PATHS_ORIGIN__: s(kit.paths.origin) ?? 'undefined',
					__SVELTEKIT_SERVICE_WORKER__: s(kit.serviceWorker.register && !!service_worker_entry_file)
				};

				if (is_build) {
					new_config.define = {
						...define,
						__SVELTEKIT_ADAPTER_NAME__: s(kit.adapter?.name),
						__SVELTEKIT_APP_VERSION_FILE__: s(`${kit.appDir}/version.json`),
						__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: s(kit.version.pollInterval)
					};
				} else {
					new_config.define = {
						...define,
						__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: '0',
						__SVELTEKIT_PAYLOAD__: kit_global, // only relevant when bundleStrategy !== 'split'
						__SVELTEKIT_HAS_SERVER_LOAD__: 'true',
						__SVELTEKIT_HAS_UNIVERSAL_LOAD__: 'true'
					};

					// Any CommonJS dependencies of Kit (of which there are currently none) must always be externalized.
					// Without this, the tests will still pass but `pnpm dev` will fail in projects that link `@sveltejs/kit`.
					//
					// `@opentelemetry/api` must be externalized so that `instrumentation.server.js` and the
					// SvelteKit runtime share a single instance of the module (the global tracer/propagation
					// is set on that instance — two bundled copies would mean instrumentation hooks are
					// invisible to the runtime). Externalizing also prevents the bundler from colocating
					// `@opentelemetry/api` into a shared chunk that also contains application modules, which
					// would cause those modules to be evaluated before `Server.init()` sets env vars — see
					// https://github.com/sveltejs/kit/issues/16288
					/** @type {NonNullable<UserConfig['ssr']>} */ (new_config.ssr).external = [
						'@opentelemetry/api'
					];

					// we avoid setting base to paths.assets in dev so that we get the
					// trailing slash redirect to paths.base if it is set
					new_config.base = kit.paths.base || '/';

					// Vite dependency crawler needs an explicit JS entry point
					// even though server otherwise works without it
					new_config.build ??= {};
					new_config.build.rolldownOptions ??= {};
					new_config.build.rolldownOptions.input = `${runtime_directory}/client/entry.js`;
				}

				// Vite's `define` is a compile-time text replacement, but Vitest strips
				// user `define` from the server config and reinstalls the values only as
				// `globalThis` properties inside test workers, so anything
				// that runs outside of a test will freak out over
				// them not being defined
				if (process.env.VITEST === 'true') {
					for (const key in new_config.define) {
						const value = new_config.define[key];
						try {
							/** @type {Record<string, any>} */ (globalThis)[key] = JSON.parse(value);
						} catch {
							// `kit_global` isn't JSON, so don't try to parse it. We may one day
							// need to define it in Vitest somehow but for now, ignore it
						}
					}
				}

				warn_overridden_config(config, new_config);

				return new_config;
			}
		},

		/**
		 * Stores the final config.
		 */
		configResolved(config) {
			if (!is_build) {
				// Dependency scanning starts before configureServer creates the full manifest
				write_app_manifest(`${out_dir}/generated/dev`, undefined, false);
			}

			const unsupported_plugins = config.plugins.filter((plugin) => plugin.transformIndexHtml);
			if (unsupported_plugins.length) {
				const verbose = config.logLevel === 'info' || config.logLevel === undefined;
				const log = logger({ verbose });

				const list = unsupported_plugins
					.map((plugin) => `  - ${plugin.name || '(missing plugin name)'}`)
					.join('\n');

				log.warn(
					dedent`
						The following plugins may not work correctly because they use the \`transformIndexHtml\` hook which is not supported:

						${list}
					`
				);
			}
		},

		/**
		 * Adds the SvelteKit middleware to do SSR in dev mode.
		 * @see https://vitejs.dev/guide/api-plugin.html#configureserver
		 */
		async configureServer(server) {
			return await dev(
				vite,
				server,
				svelte_config,
				() => remote_metadata.remotes,
				root,
				(data) => {
					manifest_data = data;
				}
			);
		},

		/**
		 * Adds the SvelteKit middleware to do SSR in preview mode.
		 * @see https://vitejs.dev/guide/api-plugin.html#configurepreviewserver
		 */
		configurePreviewServer(server) {
			return preview(server, svelte_config);
		}
	};

	/** @type {ServerMetadata | null} build analysis results */
	let build_metadata = null;

	/** @type {Record<string, EnvVarConfig<any>> | null} */
	let explicit_env_config = null;

	/** @type {{ remotes: RemoteChunk[]; remote_original_by_hash: Map<string, string>}} */
	let remote_metadata = {
		remotes: [],
		remote_original_by_hash: new Map()
	};

	/** @type {(() => Promise<void>) | null} */
	let finalise = null;

	return /** @type {Plugin[]} */ (
		[
			svelte_config.adapter?.vite?.plugins?.pre,
			plugin_resolve_root,
			plugin_setup,
			plugin_remote_guard(svelte_config),
			plugin_remote(
				svelte_config,
				() => ({
					root,
					vite
				}),
				() => build_metadata,
				(metadata) => {
					remote_metadata = metadata;
				}
			),
			plugin_env_vars(svelte_config, (vars) => {
				explicit_env_config = vars;
			}),
			process.env.TEST !== 'true'
				? plugin_guard(
						svelte_config,
						() => ({
							vite,
							root,
							normalized_aliases,
							service_worker_entry_file
						}),
						// in dev, this doesn't exist yet, so we need to create it
						() => (manifest_data ??= create_manifest_data(svelte_config, root))
					)
				: undefined,
			plugin_service_worker_build(svelte_config, () => ({
				service_worker_entry_file,
				kit_global,
				initial_config,
				out
			})),
			plugin_service_worker_env_vars(() => service_worker_entry_file),
			plugin_compile(
				svelte_config,
				() => ({
					root,
					initial_config,
					global_name,
					kit_global,
					vite,
					service_worker_entry_file,
					sourcemapIgnoreList
				}),
				(metadata) => {
					build_metadata = metadata;
				},
				(data) => {
					manifest_data = data;
				},
				() => explicit_env_config,
				() => remote_metadata,
				(fn) => {
					finalise = fn;
				}
			),
			plugin_adapter(async () => await finalise?.()),
			svelte_config.adapter?.vite?.plugins?.post
		].filter(Boolean)
	);
}
