import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';

import * as devalue from 'devalue';
import { exactRegex, prefixRegex } from 'rolldown/filter';
import {
	buildErrorMessage,
	createFetchableDevEnvironment,
	createServerHotChannel,
	createServerModuleRunner,
	loadEnv
} from 'vite';

import { copy, mkdirp, read, resolve_entry, rimraf } from '../../utils/filesystem.js';
import { create_static_module, create_dynamic_module } from '../../core/env.js';
import * as sync from '../../core/sync/sync.js';
import { create_assets } from '../../core/sync/create_manifest_data/index.js';
import { runtime_directory, logger, get_runtime_base, get_mime_lookup } from '../../core/utils.js';
import { generate_manifest } from '../../core/generate_manifest/index.js';
import { build_server_nodes } from './build/build_server.js';
import { assets_base, find_deps, resolve_symlinks } from './build/utils.js';
import { dev, invalidate_module, get_matchers, get_inline_css } from './dev/index.js';
import { preview } from './preview/index.js';
import {
	error_for_missing_config,
	get_config_aliases,
	get_env,
	normalize_id,
	stackless,
	strip_virtual_prefix
} from './utils.js';
import { write_client_manifest } from '../../core/sync/write_client_manifest.js';
import prerender from '../../core/postbuild/prerender.js';
import analyse from '../../core/postbuild/analyse.js';
import { s } from '../../utils/misc.js';
import { hash } from '../../utils/hash.js';
import { dedent } from '../../core/sync/utils.js';
import {
	app_server,
	env_dynamic_private,
	env_dynamic_public,
	env_static_private,
	env_static_public,
	service_worker,
	sveltekit_server,
	sveltekit_remotes,
	sveltekit_server_assets,
	sveltekit_ssr_manifest
} from './module_ids.js';
import { to_fs } from './filesystem.js';
import { import_peer } from '../../utils/import.js';
import { compact } from '../../utils/array.js';
import { posixify } from '../../utils/os.js';
import { should_ignore, has_children } from './static_analysis/utils.js';
import { load_config } from '../../core/config/index.js';

const cwd = process.cwd();

/** @type {string} */
let root;

/** @type {import('types').DevEnvironment | null} */
let dev_environment = null;

/** @type {import('./types.js').EnforcedConfig} */
const enforced_config = {
	appType: true,
	base: true,
	build: {
		cssCodeSplit: true,
		emptyOutDir: true,
		lib: {
			entry: true,
			name: true,
			formats: true
		},
		manifest: true,
		outDir: true,
		rolldownOptions: {
			input: true,
			output: {
				format: true,
				entryFileNames: true,
				chunkFileNames: true,
				assetFileNames: true
			},
			preserveEntrySignatures: true
		},
		ssr: true
	},
	publicDir: true,
	resolve: {
		alias: {
			$app: true,
			$lib: true,
			'$service-worker': true
		}
	}
};

const options_regex = /(export\s+const\s+(prerender|csr|ssr|trailingSlash))\s*=/s;

/** @type {Set<string>} */
const warned = new Set();

/** @type {import('svelte/compiler').PreprocessorGroup} */
const warning_preprocessor = {
	script: ({ content, filename }) => {
		if (!filename) return;

		const basename = path.basename(filename);
		if (basename.startsWith('+page.') || basename.startsWith('+layout.')) {
			const match = content.match(options_regex);
			if (match && match.index !== undefined && !should_ignore(content, match.index)) {
				const fixed = basename.replace('.svelte', '(.server).js/ts');

				const message =
					`\n${styleText(['bold', 'red'], path.relative(root, filename))}\n` +
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
				`\n${styleText(['bold', 'red'], path.relative(root, filename))}\n` +
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
 * Returns the SvelteKit Vite plugins.
 * @param {{
 *   adapter?: import('@sveltejs/kit').Adapter;
 * }=} options
 * @returns {Promise<import('vite').PluginOption[]>}
 */
export async function sveltekit(options = {}) {
	// the config options will be set only after the Vite `config` hook runs
	// because we need to find `svelte.config.js` relative to `vite.config.root`
	const svelte_config = /** @type {import('types').ValidatedConfig} */ ({});

	/** @type {import('@sveltejs/vite-plugin-svelte').Options} */
	const vite_plugin_svelte_options = {
		// we don't want vite-plugin-svelte to load the config file itself because
		// it will try to validate it without knowing that kit options are valid
		configFile: false
	};

	vite_plugin_svelte = await import_peer('@sveltejs/vite-plugin-svelte', cwd);

	return [
		plugin_svelte_config({ vite_plugin_svelte_options, svelte_config }),
		vite_plugin_svelte.svelte(vite_plugin_svelte_options),
		kit({ svelte_config, adapter_in_vite_config: !!options.adapter }),
		options.adapter?.vite?.plugins
	];
}

/** @param {import('vite').UserConfig | import('vite').ResolvedConfig} vite_config */
function resolve_root(vite_config) {
	return posixify(vite_config.root ? path.resolve(vite_config.root) : cwd);
}

/**
 * Resolves the Svelte config using the `vite.config.root` setting before any
 * of our other plugins try to access the config objects
 * @param {{
 *   vite_plugin_svelte_options: import('@sveltejs/vite-plugin-svelte').Options;
 * 	 svelte_config: import('types').ValidatedConfig;
 * }} options
 * @return {import('vite').Plugin}
 */
function plugin_svelte_config({ vite_plugin_svelte_options, svelte_config }) {
	return {
		name: 'vite-plugin-sveltekit-resolve-svelte-config',
		// make sure it runs first
		enforce: 'pre',
		config: {
			order: 'pre',
			async handler(config) {
				root = resolve_root(config);

				const user_svelte_config = await load_config({ cwd: root });

				/** @type {import('@sveltejs/vite-plugin-svelte').Options['preprocess']} */
				let preprocess = user_svelte_config.preprocess;
				if (Array.isArray(preprocess)) {
					preprocess = [...preprocess, warning_preprocessor];
				} else if (preprocess) {
					preprocess = [preprocess, warning_preprocessor];
				} else {
					preprocess = warning_preprocessor;
				}

				vite_plugin_svelte_options.extensions = user_svelte_config.extensions;
				vite_plugin_svelte_options.preprocess = preprocess;
				vite_plugin_svelte_options.onwarn = user_svelte_config.onwarn;
				vite_plugin_svelte_options.compilerOptions = { ...user_svelte_config.compilerOptions };
				Object.assign(vite_plugin_svelte_options, user_svelte_config.vitePlugin);

				Object.assign(svelte_config, user_svelte_config);
			}
		},
		// TODO: do we even need to set `root` based on the final Vite config?
		configResolved: {
			order: 'pre',
			handler(config) {
				root = resolve_root(config);
			}
		}
	};
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function revive_functions(value) {
	if (value instanceof Function) {
		return value.toString();
	}
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
 * @param {{
 * 	svelte_config: import('types').ValidatedConfig;
 * 	adapter_in_vite_config: boolean
 * }} options
 * @return {import('vite').PluginOption[]}
 */
function kit({ svelte_config, adapter_in_vite_config }) {
	/** @type {typeof import('vite')} */
	let vite;

	/** @type {import('types').ValidatedKitConfig} */
	let kit;
	/** @type {string} */
	let out;

	/** @type {string} */
	let version_hash;

	/** @type {import('vite').ResolvedConfig} */
	let vite_config;

	/** @type {import('vite').ConfigEnv} */
	let vite_config_env;

	/** @type {boolean} */
	let is_build;

	/** @type {{ public: Record<string, string>; private: Record<string, string> }} */
	let env;

	/** @type {import('types').ManifestData} */
	let manifest_data;

	/** @type {import('types').ServerMetadata | undefined} only set at build time once analysis is finished */
	let build_metadata = undefined;

	/** @type {import('vite').UserConfig} */
	let initial_config;

	/** @type {string | null} */
	let service_worker_entry_file;
	/** @type {import('node:path').ParsedPath} */
	let parsed_service_worker;

	/** @type {string} */
	let normalized_cwd;
	/** @type {string} */
	let normalized_lib;
	/** @type {string} */
	let normalized_node_modules;
	/**
	 * A map showing which features (such as `$app/server:read`) are defined
	 * in which chunks, so that we can later determine which routes use which features
	 * @type {Record<string, string[]>}
	 */
	const tracked_features = {};

	const sourcemapIgnoreList = /** @param {string} relative_path */ (relative_path) =>
		relative_path.includes('node_modules') || relative_path.includes(kit.outDir);

	/**
	 * Only available if the adapter didn't provide its own environment
	 * @type {import('vite/module-runner').ModuleRunner | null}
	 */
	let runner = null;

	function get_module_runner() {
		if (!runner) {
			throw new Error('The module runner should have been created during the configureServer hook');
		}
		return runner;
	}

	/** @type {import('vite').Plugin} */
	const plugin_setup = {
		name: 'vite-plugin-sveltekit-setup',

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		config: {
			order: 'pre',
			async handler(config, config_env) {
				initial_config = config;
				vite_config_env = config_env;
				is_build = config_env.command === 'build';

				({ kit } = svelte_config);
				out = `${kit.outDir}/output`;

				if (kit.adapter?.vite?.plugins && !adapter_in_vite_config) {
					throw new Error(
						`${kit.adapter.name} requires the adapter to be passed through the \`sveltekit\` Vite plugin in the \`vite.config.js\` file. For example:\n\n` +
							`+++import adapter from '${kit.adapter.name}';+++\n\nexport default defineConfig({\n  plugins: [sveltekit( +++{ adapter }+++ )]\n});`
					);
				}

				version_hash = hash(kit.version.name);

				env = get_env(kit.env, vite_config_env.mode);

				service_worker_entry_file = resolve_entry(kit.files.serviceWorker);
				parsed_service_worker = path.parse(kit.files.serviceWorker);

				vite = await import_peer('vite', root);

				normalized_cwd = vite.normalizePath(root);
				normalized_lib = vite.normalizePath(kit.files.lib);
				normalized_node_modules = vite.normalizePath(path.resolve(root, 'node_modules'));

				const allow = new Set([
					kit.files.lib,
					kit.files.routes,
					kit.outDir,
					path.resolve(root, kit.files.src),
					path.resolve(root, 'node_modules'),
					path.resolve(cwd, 'node_modules')
				]);

				// We can only add directories to the allow list, so we find out
				// if there's a client hooks file and pass its directory
				const client_hooks = resolve_entry(kit.files.hooks.client);
				if (client_hooks) allow.add(path.dirname(client_hooks));

				// dev and preview config can be shared
				/** @type {import('vite').UserConfig} */
				const new_config = {
					resolve: {
						alias: [
							{ find: '$app', replacement: `${runtime_directory}/app` },
							...get_config_aliases(kit, root)
						]
					},
					server: {
						cors: { preflightContinue: true },
						fs: {
							allow: [...allow]
						},
						sourcemapIgnoreList,
						watch: {
							ignored: [
								// Ignore all siblings of config.kit.outDir/generated
								`${posixify(kit.outDir)}/!(generated)`
							]
						}
					},
					preview: {
						cors: { preflightContinue: true }
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
						]
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
							// virtual modules like `__sveltekit/environment` (this isn't a valid bare
							// import, but it works with vite-node's externalization logic, which
							// uses basic concatenation)
							'@sveltejs/kit/src/runtime'
						]
					},
					future: {
						removePluginHookHandleHotUpdate: 'warn',
						removePluginHookSsrArgument: 'warn',
						removeServerHot: 'warn',
						removeServerModuleGraph: 'warn',
						removeServerPluginContainer: 'warn',
						removeServerReloadModule: 'warn',
						removeServerTransformRequest: 'warn',
						removeServerWarmupRequest: 'warn',
						removeSsrLoadModule: 'warn'
					}
				};

				if (kit.experimental.remoteFunctions) {
					// treat .remote.js files as empty for the purposes of prebundling
					const remote_id_filter = new RegExp(
						`.remote(${kit.moduleExtensions.join('|')})$`.replaceAll('.', '\\.')
					);
					// @ts-expect-error optimizeDeps is already set above
					new_config.optimizeDeps.rolldownOptions ??= {};
					// @ts-expect-error
					new_config.optimizeDeps.rolldownOptions.plugins ??= [];
					// @ts-expect-error
					new_config.optimizeDeps.rolldownOptions.plugins.push({
						name: 'vite-plugin-sveltekit-setup:optimize-remote-functions',
						load: {
							filter: { id: remote_id_filter },
							handler() {
								return '';
							}
						}
					});
				}

				const define = {
					__SVELTEKIT_APP_DIR__: s(kit.appDir),
					__SVELTEKIT_EMBEDDED__: s(kit.embedded),
					__SVELTEKIT_FORK_PRELOADS__: s(kit.experimental.forkPreloads),
					__SVELTEKIT_PATHS_ASSETS__: s(kit.paths.assets),
					__SVELTEKIT_PATHS_BASE__: s(kit.paths.base),
					__SVELTEKIT_PATHS_RELATIVE__: s(kit.paths.relative),
					__SVELTEKIT_CLIENT_ROUTING__: s(kit.router.resolution === 'client'),
					__SVELTEKIT_HASH_ROUTING__: s(kit.router.type === 'hash'),
					__SVELTEKIT_SERVER_TRACING_ENABLED__: s(kit.experimental.tracing.server),
					__SVELTEKIT_EXPERIMENTAL_USE_TRANSFORM_ERROR__: s(kit.experimental.handleRenderingErrors)
				};

				if (is_build) {
					if (!new_config.build) new_config.build = {};

					new_config.define = {
						...define,
						__SVELTEKIT_ADAPTER_NAME__: s(kit.adapter?.name),
						__SVELTEKIT_APP_VERSION_FILE__: s(`${kit.appDir}/version.json`),
						__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: s(kit.version.pollInterval)
					};

					manifest_data = sync.all(svelte_config, config_env.mode, root).manifest_data;
				} else {
					new_config.define = {
						...define,
						__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: '0',
						__SVELTEKIT_PAYLOAD__: 'globalThis.__sveltekit_dev',
						__SVELTEKIT_HAS_SERVER_LOAD__: 'true',
						__SVELTEKIT_HAS_UNIVERSAL_LOAD__: 'true',
						__SVELTEKIT_ROOT__: s(root)
					};

					new_config.environments = {
						ssr: {
							dev: {
								createEnvironment(name, config) {
									return createFetchableDevEnvironment(name, config, {
										hot: true,
										transport: createServerHotChannel(),
										async handleRequest(request) {
											try {
												const module_runner = get_module_runner();

												const resolved_instrumentation = resolve_entry(
													path.join(svelte_config.kit.files.src, 'instrumentation.server')
												);
												if (resolved_instrumentation) {
													await module_runner.import(resolved_instrumentation);
												}

												/**
												 * @type {{
												 *   respond: (request: Request, remote_address: string | undefined, kit: import('types').ValidatedKitConfig) => Promise<Response>
												 * }}
												 */
												const { respond } = await module_runner.import(
													import.meta.resolve('./dev/server.js')
												);
												return await respond(request, dev_environment?.remote_address, kit);
											} catch (error) {
												console.error(error);
												throw error;
											}
										}
									});
								}
							}
						}
					};
				}

				warn_overridden_config(config, new_config);

				return new_config;
			}
		},

		/**
		 * Stores the final config.
		 */
		configResolved(config) {
			vite_config = config;
		}
	};

	/** @type {Record<string, number>} */
	let server_assets = {};

	/**
	 * Allows us to access the filesystem from an environment that doesn't have `node:fs`
	 * @type {import('vite').Plugin}
	 */
	const plugin_server_filesystem = {
		name: 'vite-plugin-sveltekit-server-filesystem',
		apply: 'serve',
		applyToEnvironment(environment) {
			return environment.name !== 'client' && environment.name !== 'serviceWorker';
		},
		configureServer() {
			server_assets = {};
		},
		load: {
			order: 'pre',
			handler(id) {
				if (!dev_environment) return;

				const { searchParams, search } = new URL(id, `file://`);
				const pathname = id.replace(search, '');

				if (
					(searchParams.has('url') || vite_config.assetsInclude(pathname)) &&
					fs.existsSync(pathname)
				) {
					const filepath = pathname.startsWith(root)
						? posixify(path.relative(root, pathname))
						: to_fs(pathname);
					const size = fs.statSync(pathname).size;

					// update it immediately
					dev_environment.vite.environments.ssr.hot.send(`sveltekit:server-assets`, {
						[filepath]: size
					});

					// persist changes in case of server reload
					server_assets[filepath] = size;
					invalidate_module(dev_environment.vite, sveltekit_server_assets);
				}
			}
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_virtual_modules = {
		name: 'vite-plugin-sveltekit-virtual-modules',

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		resolveId(id, importer) {
			if (id === '__sveltekit/manifest') {
				return `${kit.outDir}/generated/client-optimized/app.js`;
			}

			// If importing from a service-worker, only allow $service-worker & $env/static/public, but none of the other virtual modules.
			// This check won't catch transitive imports, but it will warn when the import comes from a service-worker directly.
			// Transitive imports will be caught during the build.
			// TODO move this logic to plugin_guard. add a filter to this resolveId when doing so
			if (importer) {
				const parsed_importer = path.parse(importer);

				const importer_is_service_worker =
					parsed_importer.dir === parsed_service_worker.dir &&
					parsed_importer.name === parsed_service_worker.name;

				if (importer_is_service_worker && id !== '$service-worker' && id !== '$env/static/public') {
					throw new Error(
						`Cannot import ${normalize_id(
							id,
							normalized_lib,
							normalized_cwd
						)} into service-worker code. Only the modules $service-worker and $env/static/public are available in service workers.`
					);
				}
			}

			// treat $env/static/[public|private] as virtual
			if (id.startsWith('$env/') || id === '$service-worker') {
				// ids with :$ don't work with reverse proxies like nginx
				return `\0virtual:${id.substring(1)}`;
			}

			if (id === '__sveltekit/remote') {
				return `${runtime_directory}/client/remote-functions/index.js`;
			}

			if (id.startsWith('__sveltekit/')) {
				return `\0virtual:${id}`;
			}
		},
		load: {
			filter: {
				id: [
					exactRegex(env_static_private),
					exactRegex(env_static_public),
					exactRegex(env_dynamic_private),
					exactRegex(env_dynamic_public),
					exactRegex(service_worker),
					exactRegex(sveltekit_server),
					exactRegex(sveltekit_ssr_manifest),
					exactRegex(sveltekit_server_assets),
					exactRegex(sveltekit_remotes)
				]
			},
			handler(id) {
				switch (id) {
					case env_static_private:
						return create_static_module('$env/static/private', env.private);

					case env_static_public:
						return create_static_module('$env/static/public', env.public);

					case env_dynamic_private:
						return create_dynamic_module(
							'private',
							vite_config_env.command === 'serve' ? env.private : undefined,
							root
						);

					case env_dynamic_public: {
						// populate `$env/dynamic/public` from `window`
						if (this.environment.config.consumer === 'client') {
							const global = is_build
								? `globalThis.__sveltekit_${version_hash}`
								: 'globalThis.__sveltekit_dev';
							return `export const env = ${global}.env;`;
						}

						return create_dynamic_module(
							'public',
							vite_config_env.command === 'serve' ? env.public : undefined,
							root
						);
					}

					case service_worker:
						return create_service_worker_module(svelte_config);

					case sveltekit_server_assets: {
						if (vite_config_env.command === 'build') return;

						return dedent`
							export const server_assets = {
								${Object.entries(server_assets)
									.map(([filepath, size]) => `${s(filepath)}: ${size}`)
									.join(',\n')}
							};

							import.meta.hot?.on('sveltekit:server-assets', (data) => {
								Object.assign(server_assets, data);
							});
						`;
					}

					case sveltekit_remotes: {
						if (!dev_environment) return;

						return dedent`
							export const remotes = ${s(remotes)};

							import.meta.hot?.on('sveltekit:remotes', (data) => {
								remotes.push(data);
							});
						`;
					}

					case sveltekit_ssr_manifest: {
						if (!dev_environment) return;

						const { manifest_data, env } = dev_environment;

						return dedent`
							import { server_assets } from '__sveltekit/server-assets';
							import { remotes } from '__sveltekit/remotes';
							import { to_fs } from '${get_runtime_base(root)}/../exports/vite/filesystem.js';

							export const base_path = ${s(kit.paths.base)};
							export const prerendered = new Set();
							export const env = ${s(env)};

							const nodes = ${devalue.uneval(manifest_data.nodes, revive_functions)};

							export const manifest = {
								appDir: ${s(kit.appDir)},
								appPath: ${s(kit.appDir)},
								assets: new Set(${s(manifest_data.assets.map((asset) => asset.file))}),
								mimeTypes: ${s(get_mime_lookup(manifest_data))},
								_: {
									client: {
										start: '${get_runtime_base(root)}/client/entry.js',
										app: '${to_fs(kit.outDir)}/generated/client/app.js',
										imports: [],
										stylesheets: [],
										fonts: [],
										uses_env_dynamic_public: true,
										nodes:
											${
												kit.router.resolution === 'client'
													? undefined
													: s(
															manifest_data.nodes.map((node, i) => {
																if (node.component || node.universal) {
																	return `${kit.paths.base}${to_fs(kit.outDir)}/generated/client/nodes/${i}.js`;
																}
															})
														)
											},
										// \`css\` is not necessary in dev, as the JS file from \`nodes\` will reference the CSS file
										routes:
											${
												kit.router.resolution === 'client'
													? undefined
													: devalue.uneval(
															compact(
																manifest_data.routes.map((route) => {
																	if (!route.page) return;

																	return {
																		id: route.id,
																		pattern: route.pattern,
																		params: route.params,
																		layouts: route.page.layouts.map((l) =>
																			l !== undefined
																				? [!!manifest_data.nodes[l].server, l]
																				: undefined
																		),
																		errors: route.page.errors,
																		leaf: [
																			!!manifest_data.nodes[route.page.leaf].server,
																			route.page.leaf
																		]
																	};
																})
															)
														)
											}
									},
									server_assets,
									nodes: [${manifest_data.nodes
										.map((node, index) => {
											return dedent`
												async () => {
													const node = nodes[${index}];

													const result = {};
													result.index = ${index};
													result.universal_id = node.universal;
													result.server_id = node.server;

													// these are unused in dev, but it's easier to include them
													result.imports = [];
													result.stylesheets = [];
													result.fonts = [];

													const urls = [];

													${
														node.component
															? dedent`
																	result.component = async () => {
																		const { module, url } = await resolve(${s(path.resolve(root, node.component))});
																		urls.push(url);
																		return module.default;
																	}
																`
															: ''
													}

													${
														node.universal
															? dedent`
																	if (node.page_options?.ssr === false) {
																		result.universal = node.page_options;
																	} else {
																		// TODO: explain why the file was loaded on the server if we fail to load it
																		const { module, url } = await resolve(${s(path.resolve(root, node.universal))});
																		urls.push(url);
																		result.universal = module;
																	}
																`
															: ''
													}

													${
														node.server
															? dedent`
																	const { module } = await resolve(${s(path.resolve(root, node.server))});
																	result.server = module;
																`
															: ''
													}

													// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
													// components/stylesheets loaded via import() during \`load\` are included

													const event = 'sveltekit:inline-styles-node-${index}-response';
													result.inline_styles = async () => {
														if (!import.meta.hot) return;

														const { promise, resolve } = Promise.withResolvers();

														const listener = (data) => {
															import.meta.hot.off(event, listener);
															resolve(data);
														};

														import.meta.hot.on(event, listener);
														import.meta.hot.send('sveltekit:inline-styles-request', { urls, node: result.index });

														return promise;
													}

													return result;
												}
											`;
										})
										.join(',\n')}],
									prerendered_routes: new Set(),
									get remotes() {
										return Object.fromEntries(
											remotes.map((remote) => [
												remote.hash,
												() => import(/* @vite-ignore */(\`${root}/\${remote.file}\`)).then(
													(module) => ({ default: module })
												)
											])
										);
									},
									routes: [${compact(
										manifest_data.routes.map((route) => {
											if (!route.page && !route.endpoint) return null;

											const endpoint = route.endpoint;

											return dedent`
												{
													id: ${s(route.id)},
													pattern: ${devalue.uneval(route.pattern)},
													params: ${devalue.uneval(route.params)},
													page: ${devalue.uneval(route.page)},
													endpoint: ${
														endpoint
															? dedent`
																async () => {
																	const url = ${s(path.resolve(root, endpoint.file))};
																	const { module } = await resolve(url);
																	return module;
																}
															`
															: null
													},
													endpoint_id: ${s(endpoint?.file)}
												}
											`;
										})
									).join(',\n')}],
									matchers: async () => {
										if (!import.meta.hot) return;

										const event = 'sveltekit:matchers-response';
										const { promise, resolve } = Promise.withResolvers();

										const listener = (data) => {
											import.meta.hot.off(event, listener);
											resolve(data);
										};

										import.meta.hot.on(event, listener);
										import.meta.hot.send('sveltekit:matchers-request');

										return promise;
									}
								}
							};

							/**
							 * @param {string} url
							 */
							async function loud_ssr_load_module(url) {
								try {
									return await import(/* @vite-ignore */ url);
								} catch (err) {
									import.meta.hot?.send('sveltekit:ssr-load-module', {
										...err,
										// these properties are non-enumerable and will not be
										// serialized unless we explicitly include them
										message: err.message,
										stack: err.stack
									});

									throw err;
								}
							}

							/** @param {string} id */
							async function resolve(id) {
								const url = id.startsWith('..') ? to_fs(id) : \`file:///\${id}\`;
								const module = await loud_ssr_load_module(url);
								return { module, url };
							}
						`;
					}

					case sveltekit_server: {
						if (!dev_environment) return;

						const runtime_base = get_runtime_base(root);
						const adapter = svelte_config.kit.adapter;

						return dedent`
							import { AsyncLocalStorage } from 'node:async_hooks';
							import { set_assets } from '${runtime_base}/app/paths/internal/server.js';
							// TODO: do we need to import Server before set_assets? see https://github.com/sveltejs/kit/commit/26d1958b9ee08541d719b77c6853a56142808ebc#diff-24f4a64dcf3021ab46c64bd6eddd314d4c630bde4557cc2e714f9c1f8b57ad06R441
							import { Server as InternalServer } from '${runtime_base}/server/index.js';
							import { check_feature } from '${runtime_base}/../utils/features.js';
							import { SCHEME } from '${runtime_base}/../utils/url.js';

							const async_local_storage = new AsyncLocalStorage();

							const adapter = ${adapter ? devalue.uneval({ name: adapter.name, supports: adapter.supports }, revive_functions) : null};

							globalThis.__SVELTEKIT_TRACK__ = (label) => {
								const context = async_local_storage.getStore();
								if (!context || context.prerender === true) return;

								check_feature(context.event.route.id, context.config, label, adapter);
							};

							const fetch = globalThis.fetch;
							globalThis.fetch = (info, init) => {
								if (typeof info === 'string' && !SCHEME.test(info)) {
									throw new Error(
										\`Cannot use relative URL (\${info}) with global fetch — use \\\`event.fetch\\\` instead: https://svelte.dev/docs/kit/web-standards#fetch-apis\`
									);
								}

								return fetch(info, init);
							};

							set_assets(${s(dev_environment.assets)});

							export class Server extends InternalServer {
								async respond(request, options) {
									options.before_handle = async (event, config, prerender, handle) => {
										// we need to use .run because .enterWith() is not supported in Cloudflare Workers
										// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
										return await async_local_storage.run({ event, config, prerender }, handle);
									};
									return super.respond(request, options);
								}
							}
						`;
					}
				}
			}
		}
	};

	/** @type {Map<string, Set<string>>} */
	const import_map = new Map();
	const server_only_pattern = /.*\.server\..+/;

	/**
	 * Ensures that client-side code can't accidentally import server-side code,
	 * whether in `*.server.js` files, `$app/server`, `$lib/server`, or `$env/[static|dynamic]/private`
	 * @type {import('vite').Plugin}
	 */
	const plugin_guard = {
		name: 'vite-plugin-sveltekit-guard',

		// Run this plugin before built-in resolution, so that relative imports
		// are added to the module graph
		enforce: 'pre',

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		resolveId: {
			// TODO: use composable filter API here when supported:
			// https://github.com/vitejs/rolldown-vite/issues/605
			// filter: ([
			// 	exclude(importerId(/index\.html$/)),
			// 	include(importerId(/.+/))
			// ]),
			async handler(id, importer, options) {
				if (importer && !importer.endsWith('index.html')) {
					const resolved = await this.resolve(id, importer, {
						custom: options.custom,
						isEntry: options.isEntry,
						kind: options.kind,
						skipSelf: true
					});

					if (resolved) {
						const normalized = normalize_id(resolved.id, normalized_lib, normalized_cwd);

						let importers = import_map.get(normalized);

						if (!importers) {
							importers = new Set();
							import_map.set(normalized, importers);
						}

						importers.add(normalize_id(importer, normalized_lib, normalized_cwd));
					}
				}
			}
		},

		load: {
			filter: {
				id: [
					exactRegex(env_static_private),
					exactRegex(env_dynamic_private),
					exactRegex(app_server),
					/\/server\//,
					new RegExp(`${server_only_pattern.source}$`)
				]
			},
			handler(id) {
				if (this.environment.config.consumer !== 'client') return;

				// skip .server.js files outside the cwd or in node_modules, as the filename might not mean 'server-only module' in this context
				const is_internal =
					id.startsWith(normalized_cwd) && !id.startsWith(normalized_node_modules);

				const normalized = normalize_id(id, normalized_lib, normalized_cwd);

				const is_server_only =
					normalized === '$env/static/private' ||
					normalized === '$env/dynamic/private' ||
					normalized === '$app/server' ||
					normalized.startsWith('$lib/server/') ||
					(is_internal && server_only_pattern.test(path.basename(id)));

				// skip .server.js files outside the cwd or in node_modules, as the filename might not mean 'server-only module' in this context
				// TODO: address https://github.com/sveltejs/kit/issues/12529
				if (!is_server_only) {
					return;
				}

				/** @type {Set<string>} */
				const entrypoints = new Set();
				for (const node of manifest_data.nodes) {
					if (node.component) entrypoints.add(node.component);
					if (node.universal) entrypoints.add(node.universal);
				}

				if (manifest_data.hooks.client) entrypoints.add(manifest_data.hooks.client);
				if (manifest_data.hooks.universal) entrypoints.add(manifest_data.hooks.universal);

				const chain = [normalized];

				let current = normalized;
				let includes_remote_file = false;

				while (true) {
					const importers = import_map.get(current);
					if (!importers) break;

					const candidates = Array.from(importers).filter((importer) => !chain.includes(importer));
					if (candidates.length === 0) break;

					chain.push((current = candidates[0]));

					includes_remote_file ||= svelte_config.kit.moduleExtensions.some((ext) => {
						return current.endsWith(`.remote${ext}`);
					});

					if (entrypoints.has(current)) {
						const pyramid = chain
							.reverse()
							.map((id, i) => {
								return `${' '.repeat(i + 1)}${id}`;
							})
							.join(' imports\n');

						if (includes_remote_file) {
							error_for_missing_config(
								'remote functions',
								'kit.experimental.remoteFunctions',
								'true'
							);
						}

						let message = `Cannot import ${normalized} into code that runs in the browser, as this could leak sensitive information.`;
						message += `\n\n${pyramid}`;
						message += `\n\nIf you're only using the import as a type, change it to \`import type\`.`;

						throw stackless(message);
					}
				}

				throw new Error('An impossible situation occurred');
			}
		}
	};

	/** @type {Array<{ hash: string, file: string }>} */
	let remotes = [];

	/** @type {Map<string, string>} Maps remote hash -> original module id */
	const remote_original_by_hash = new Map();

	/** @type {Set<string>} Track which remote hashes have already been emitted */
	const emitted_remote_hashes = new Set();

	/** @type {import('vite').Plugin} */
	const plugin_remote = {
		name: 'vite-plugin-sveltekit-remote',

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		// prevent other plugins from resolving our remote virtual module
		resolveId: {
			filter: {
				id: prefixRegex('\0sveltekit-remote:')
			},
			handler(id) {
				return id;
			}
		},

		load: {
			filter: {
				id: prefixRegex('\0sveltekit-remote:')
			},
			handler(id) {
				if (!kit.experimental.remoteFunctions) {
					return null;
				}

				// On-the-fly generated entry point for remote file just forwards the original module
				// We're not using manualChunks because it can cause problems with circular dependencies
				// (e.g. https://github.com/sveltejs/kit/issues/14679) and module ordering in general
				// (e.g. https://github.com/sveltejs/kit/issues/14590).
				const hash_id = id.slice('\0sveltekit-remote:'.length);
				const original = remote_original_by_hash.get(hash_id);
				if (!original) throw new Error(`Expected to find metadata for remote file ${id}`);
				return `import * as m from ${s(original)};\nexport default m;`;
			}
		},

		async transform(code, id) {
			if (!kit.experimental.remoteFunctions) {
				return;
			}

			const normalized = normalize_id(id, normalized_lib, normalized_cwd);
			if (!svelte_config.kit.moduleExtensions.some((ext) => normalized.endsWith(`.remote${ext}`))) {
				return;
			}

			const file = posixify(path.relative(root, id));
			const remote = {
				hash: hash(file),
				file
			};

			remotes.push(remote);
			if (dev_environment) {
				dev_environment.vite.environments.ssr.hot.send(`sveltekit:remotes`, remote);
				invalidate_module(dev_environment.vite, sveltekit_remotes);
			}

			if (this.environment.config.consumer !== 'client') {
				// we need to add an `await Promise.resolve()` because if the user imports this function
				// on the client AND in a load function when loading the client module we will trigger
				// a ssrLoadModule during dev. During a link preload, the module can be mistakenly
				// loaded and transformed twice and the first time all its exports would be undefined
				// triggering a dev server error. By adding a microtask we ensure that the module is fully loaded

				// Extra newlines to prevent syntax errors around missing semicolons or comments
				code +=
					'\n\n' +
					dedent`
					import * as $$_self_$$ from './${path.basename(id)}';
					import { init_remote_functions as $$_init_$$ } from '@sveltejs/kit/internal';

					${dev_environment?.vite ? 'await Promise.resolve()' : ''}

					$$_init_$$($$_self_$$, ${s(file)}, ${s(remote.hash)});

					for (const [name, fn] of Object.entries($$_self_$$)) {
						fn.__.id = ${s(remote.hash)} + '/' + name;
						fn.__.name = name;
					}
					${
						dev_environment?.vite
							? dedent`
									if (import.meta.hot) {
										const exports = new Map();
										for (const name in $$_self_$$) {
											exports.set(name, { type: $$_self_$$[name].__.type });
										}
										const data = Object.fromEntries(exports);
										const event = 'sveltekit:remote-${remote.hash}-response';

										// we need to send the data immediately in case of preloads
										import.meta.hot.send(event, data);

										// otherwise, we send it when requested
										import.meta.hot.on('sveltekit:remote-${remote.hash}-request', async () => {
											import.meta.hot.send(event, data);
										});
									}
								`
							: ''
					}
				`;

				// Emit a dedicated entry chunk for this remote in SSR builds (prod only)
				if (!dev_environment?.vite) {
					remote_original_by_hash.set(remote.hash, id);
					if (!emitted_remote_hashes.has(remote.hash)) {
						this.emitFile({
							type: 'chunk',
							id: `\0sveltekit-remote:${remote.hash}`,
							name: `remote-${remote.hash}`
						});
						emitted_remote_hashes.add(remote.hash);
					}
				}

				return code;
			}

			// For the client, read the exports and create a new module that only contains fetch functions with the correct metadata

			/** @type {Map<string, import('types').RemoteInternals['type']>} */
			const map = new Map();

			// in dev, load the server module here (which will result in this hook
			// being called again with `opts.ssr === true` if the module isn't
			// already loaded) so we can determine what it exports
			if (dev_environment?.vite) {
				const { promise, resolve } = Promise.withResolvers();

				const event = `sveltekit:remote-${remote.hash}-response`;
				dev_environment.vite.environments.ssr.hot.on(event, resolve);

				await dev_environment.vite.environments.ssr.transformRequest(id);

				dev_environment.vite.environments.ssr.hot.send(`sveltekit:remote-${remote.hash}-request`);
				const exports = await promise;
				dev_environment.vite.environments.ssr.hot.off(event, resolve);

				for (const [name, value] of Object.entries(exports)) {
					const type = value.type;
					if (type) {
						map.set(name, type);
					}
				}
			}

			// in prod, we already built and analysed the server code before
			// building the client code, so `remotes` is populated
			else if (build_metadata?.remotes) {
				const exports = build_metadata?.remotes.get(remote.hash);
				if (!exports) throw new Error('Expected to find metadata for remote file ' + id);

				for (const [name, value] of exports) {
					map.set(name, value.type);
				}
			}

			let namespace = '__remote';
			let uid = 1;
			while (map.has(namespace)) namespace = `__remote${uid++}`;

			const exports = Array.from(map).map(([name, type]) => {
				return `export const ${name} = ${namespace}.${type}('${remote.hash}/${name}');`;
			});

			let result = `import * as ${namespace} from '__sveltekit/remote';\n\n${exports.join('\n')}\n`;

			if (dev_environment?.vite) {
				result += `\nimport.meta.hot?.accept();\n`;
			}

			return {
				code: result
			};
		}
	};

	/** @type {import('vite').Manifest} */
	let client_manifest;
	/** @type {import('types').Prerendered} */
	let prerendered;

	/** @type {Set<string>} client output and static files */
	let build;
	/** @type {string} */
	let service_worker_code;

	/**
	 * Creates the service worker virtual modules
	 * @type {import('vite').Plugin}
	 */
	const plugin_service_worker = {
		name: 'vite-plugin-sveltekit-service-worker',

		applyToEnvironment(environment) {
			return environment.name === 'serviceWorker';
		},

		resolveId(id) {
			if (id.startsWith('$env/') || id.startsWith('$app/') || id === '$service-worker') {
				// ids with :$ don't work with reverse proxies like nginx
				return `\0virtual:${id.substring(1)}`;
			}
		},

		load(id) {
			if (!build) {
				build = new Set();
				for (const key in client_manifest) {
					const { file, css = [], assets = [] } = client_manifest[key];
					build.add(file);
					css.forEach((file) => build.add(file));
					assets.forEach((file) => build.add(file));
				}

				// in a service worker, `location` is the location of the service worker itself,
				// which is guaranteed to be `<base>/service-worker.js`
				const base = "location.pathname.split('/').slice(0, -1).join('/')";

				service_worker_code = dedent`
					export const base = /*@__PURE__*/ ${base};

					export const build = [
						${Array.from(build)
							.map((file) => `base + ${s(`/${file}`)}`)
							.join(',\n')}
					];

					export const files = [
						${manifest_data.assets
							.filter((asset) => kit.serviceWorker.files(asset.file))
							.map((asset) => `base + ${s(`/${asset.file}`)}`)
							.join(',\n')}
					];

					export const prerendered = [
						${prerendered.paths.map((path) => `base + ${s(path.replace(kit.paths.base, ''))}`).join(',\n')}
					];

					export const version = ${s(kit.version.name)};
				`;
			}

			if (!id.startsWith('\0virtual:')) return;

			if (id === service_worker) {
				return service_worker_code;
			}

			if (id === env_static_public) {
				return create_static_module('$env/static/public', env.public);
			}

			const normalized_cwd = vite.normalizePath(vite_config.root);
			const normalized_lib = vite.normalizePath(kit.files.lib);
			const relative = normalize_id(id, normalized_lib, normalized_cwd);
			const stripped = strip_virtual_prefix(relative);
			throw new Error(
				`Cannot import ${stripped} into service-worker code. Only the modules $service-worker and $env/static/public are available in service workers.`
			);
		}
	};

	/** @type {() => Promise<void>} */
	let handle_matchers;
	/** @type {(payload: { urls: string[]; node: number; }) => Promise<void>} */
	let handle_inline_styles;
	/** @type {(error: Error) => void} */
	let handle_ssr_load_module;

	/** @type {import('vite').Plugin} */
	const plugin_compile = {
		name: 'vite-plugin-sveltekit-compile',

		// TODO: add `order: pre` to avoid false-positive warnings of overridden config options set by Vitest
		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		config: {
			// avoids overwriting the base setting that's also set by Vitest
			order: 'pre',
			handler(config) {
				/** @type {import('vite').UserConfig} */
				let new_config;

				if (is_build) {
					const prefix = `${kit.appDir}/immutable`;

					/** @type {Record<string, string>} */
					const server_input = {
						index: `${runtime_directory}/server/index.js`,
						internal: `${kit.outDir}/generated/server/internal.js`,
						['remote-entry']: `${runtime_directory}/app/server/remote/index.js`
					};

					// add entry points for every endpoint...
					manifest_data.routes.forEach((route) => {
						if (route.endpoint) {
							const resolved = path.resolve(root, route.endpoint.file);
							const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));
							const name = posixify(path.join('entries/endpoints', relative.replace(/\.js$/, '')));
							server_input[name] = resolved;
						}
					});

					// ...and every component used by pages...
					manifest_data.nodes.forEach((node) => {
						for (const file of [node.component, node.universal, node.server]) {
							if (file) {
								const resolved = path.resolve(root, file);
								const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));

								const name = relative.startsWith('..')
									? posixify(path.join('entries/fallbacks', path.basename(file)))
									: posixify(path.join('entries/pages', relative.replace(/\.js$/, '')));
								server_input[name] = resolved;
							}
						}
					});

					// ...and every matcher
					Object.entries(manifest_data.matchers).forEach(([key, file]) => {
						const name = posixify(path.join('entries/matchers', key));
						server_input[name] = path.resolve(root, file);
					});

					// ...and the hooks files
					if (manifest_data.hooks.server) {
						server_input['entries/hooks.server'] = path.resolve(root, manifest_data.hooks.server);
					}
					if (manifest_data.hooks.universal) {
						server_input['entries/hooks.universal'] = path.resolve(
							root,
							manifest_data.hooks.universal
						);
					}

					// ...and the server instrumentation file
					const server_instrumentation = resolve_entry(
						path.join(kit.files.src, 'instrumentation.server')
					);
					if (server_instrumentation) {
						const { adapter } = kit;
						if (adapter && !adapter.supports?.instrumentation?.()) {
							throw new Error(`${server_instrumentation} is unsupported in ${adapter.name}.`);
						}
						if (!kit.experimental.instrumentation.server) {
							error_for_missing_config(
								'`instrumentation.server.js`',
								'kit.experimental.instrumentation.server',
								'true'
							);
						}
						server_input['instrumentation.server'] = server_instrumentation;
					}

					/** @type {Record<string, string>} */
					const client_input = {};

					if (svelte_config.kit.output.bundleStrategy !== 'split') {
						client_input['bundle'] = `${runtime_directory}/client/bundle.js`;
					} else {
						client_input['entry/start'] = `${runtime_directory}/client/entry.js`;
						client_input['entry/app'] = `${kit.outDir}/generated/client-optimized/app.js`;
						manifest_data.nodes.forEach((node, i) => {
							if (node.component || node.universal) {
								client_input[`nodes/${i}`] =
									`${kit.outDir}/generated/client-optimized/nodes/${i}.js`;
							}
						});
					}

					const inline = svelte_config.kit.output.bundleStrategy === 'inline';

					const config_base = assets_base(kit);

					/** @type {string} */
					const base = kit.paths.assets || kit.paths.base || '/';
					const root_to_assets = prefix + '/assets/';
					const assets_to_root =
						prefix
							.split('/')
							.map(() => '..')
							.join('/') + '/../';

					new_config = {
						appType: 'custom',
						base: config_base,
						build: {
							cssCodeSplit: !inline,
							cssMinify:
								initial_config.build?.minify == null ? true : !!initial_config.build.minify,
							manifest: true,
							rolldownOptions: {
								output: {
									name: `__sveltekit_${version_hash}.app`,
									assetFileNames: `${prefix}/assets/[name].[hash][extname]`,
									hoistTransitiveImports: false,
									sourcemapIgnoreList
								},
								preserveEntrySignatures: 'strict',
								onwarn(warning, handler) {
									if (
										warning.code === 'IMPORT_IS_UNDEFINED' &&
										warning.id === `${kit.outDir}/generated/client-optimized/app.js`
									) {
										// ignore e.g. undefined `handleError` hook when
										// referencing `client_hooks.handleError`
										return;
									}

									handler(warning);
								}
							},
							emptyOutDir: false,
							ssrEmitAssets: true
						},
						builder: {
							sharedConfigBuild: true,
							sharedPlugins: true
						},
						environments: {
							ssr: {
								build: {
									copyPublicDir: false,
									outDir: `${out}/server`,
									target: 'node22',
									rolldownOptions: {
										input: server_input,
										output: {
											entryFileNames: '[name].js',
											chunkFileNames: 'chunks/[name].js'
										}
									}
								},
								// these are stubs that will be replaced after the initial server build
								define: {
									__SVELTEKIT_HAS_SERVER_LOAD__: 'true',
									__SVELTEKIT_HAS_UNIVERSAL_LOAD__: 'true',
									__SVELTEKIT_PAYLOAD__: '{}'
								}
							},
							client: {
								build: {
									outDir: `${out}/client`,
									rolldownOptions: {
										input: inline ? client_input['bundle'] : client_input,
										output: {
											format: inline ? 'iife' : 'esm',
											entryFileNames: `${prefix}/[name].[hash].js`,
											chunkFileNames: `${prefix}/chunks/[hash].js`,
											codeSplitting: svelte_config.kit.output.bundleStrategy === 'split'
										},
										// This silences Rolldown warnings about not supporting `import.meta`
										// for the `iife` output format. We don't care because it's
										// only used in development and will be treeshaken away
										transform: inline
											? {
													define: {
														'import.meta': '{}'
													}
												}
											: undefined
									}
								},
								define: {
									__SVELTEKIT_PAYLOAD__: `globalThis.__sveltekit_${version_hash}`
								}
							}
						},
						experimental: {
							// we can't change the base path per environment so we're setting the
							// base prefix for files here ourselves
							renderBuiltUrl:
								// if the Vite base is relative, we need to ensure paths used during SSR are absolute
								config_base === './'
									? (filename, { ssr }) => {
											if (ssr) return base + filename;
										}
									: // but if the Vite base is absolute, we just need to ensure
										// client paths are relative rather than absolute
										(filename, { ssr, hostType }) => {
											if (ssr) return;

											if (hostType === 'js') {
												// We could always use a relative asset base path here, but it's better for performance not to.
												// E.g. Vite generates `new URL('/asset.png', import.meta).href` for a relative path vs just '/asset.png'.
												// That's larger and takes longer to run and also causes an HTML diff between SSR and client
												// causing us to do a more expensive hydration check.
												return {
													relative: kit.paths.relative !== false || !!kit.paths.assets
												};
											}

											// _app/immutable/assets files
											if (filename.startsWith(root_to_assets)) {
												return `./${filename.slice(root_to_assets.length)}`;
											}

											// static dir files
											return assets_to_root + filename;
										}
						},
						publicDir: kit.files.assets
					};

					if (service_worker_entry_file) {
						/** @type {Record<string, import('vite').EnvironmentOptions>} */ (
							new_config.environments
						).serviceWorker = {
							build: {
								modulePreload: false,
								rolldownOptions: {
									input: {
										'service-worker': service_worker_entry_file
									},
									output: {
										entryFileNames: 'service-worker.js',
										assetFileNames: `${kit.appDir}/immutable/assets/[name].[hash][extname]`,
										codeSplitting: false
									}
								},
								outDir: `${out}/client`,
								minify: initial_config.build?.minify
							},
							consumer: 'client'
						};
					}
				} else {
					new_config = {
						appType: 'custom',
						// we avoid setting base to paths.assets in dev so that we get the
						// trailing slash redirect to paths.base if it is set
						base: kit.paths.base || '/',
						build: {
							rolldownOptions: {
								// Vite dependency crawler needs an explicit JS entry point
								// even though server otherwise works without it
								input: `${runtime_directory}/client/entry.js`
							}
						},
						publicDir: kit.files.assets
					};
				}

				warn_overridden_config(config, new_config);

				return new_config;
			}
		},

		/**
		 * Adds the SvelteKit middleware to do SSR in dev mode.
		 * @see https://vitejs.dev/guide/api-plugin.html#configureserver
		 */
		async configureServer(vite) {
			await runner?.close();
			vite.environments.ssr.hot.off('sveltekit:matchers-request', handle_matchers);
			vite.environments.ssr.hot.off('sveltekit:inline-styles-request', handle_inline_styles);
			vite.environments.ssr.hot.off('sveltekit:ssr-load-module', handle_ssr_load_module);

			manifest_data = sync.all(svelte_config, vite_config_env.mode, root).manifest_data;

			// other properties will be populated during the `dev` function
			const info = (dev_environment = /** @type {import('types').DevEnvironment} */ ({
				vite,
				env: loadEnv(vite_config.mode, svelte_config.kit.env.dir, ''),
				manifest_data
			}));

			const module_runner = (runner = createServerModuleRunner(vite.environments.ssr));

			handle_matchers ??= async () => {
				vite.environments.ssr.hot.send(
					'sveltekit:matchers-response',
					await get_matchers(info.manifest_data, module_runner, root)
				);
			};
			vite.environments.ssr.hot.on('sveltekit:matchers-request', handle_matchers);

			handle_inline_styles ??= async ({ urls, node }) => {
				vite.environments.ssr.hot.send(
					`sveltekit:inline-styles-node-${node}-response`,
					await get_inline_css(vite, module_runner, urls)
				);
			};
			vite.environments.ssr.hot.on('sveltekit:inline-styles-request', handle_inline_styles);

			handle_ssr_load_module ??= (err) => {
				const msg = buildErrorMessage(err, [
					styleText('red', `Internal server error: ${err.message}`)
				]);

				if (!vite.config.logger.hasErrorLogged(err)) {
					vite.config.logger.error(msg, { error: err });
				}

				vite.ws.send({
					type: 'error',
					err: {
						...err,
						// these properties are non-enumerable and will
						// not be serialized unless we explicitly include them
						message: err.message,
						stack: err.stack ?? ''
					}
				});
			};
			vite.environments.ssr.hot.on('sveltekit:ssr-load-module', handle_ssr_load_module);

			return dev(vite, vite_config, svelte_config, root, dev_environment);
		},

		/**
		 * Adds the SvelteKit middleware to do SSR in preview mode.
		 * @see https://vitejs.dev/guide/api-plugin.html#configurepreviewserver
		 */
		configurePreviewServer(vite) {
			return preview(vite, vite_config, svelte_config);
		},

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		renderChunk(code, chunk) {
			if (code.includes('__SVELTEKIT_TRACK__')) {
				return {
					// Rolldown changes our single quotes to double quotes so we need it in the regex too
					code: code.replace(/__SVELTEKIT_TRACK__\(['"](.+?)['"]\)/g, (_, label) => {
						(tracked_features[chunk.name + '.js'] ??= []).push(label);
						// put extra whitespace at the end of the comment to preserve the source size and avoid interfering with source maps
						return `/* track ${label}            */`;
					}),
					map: null // TODO we may need to generate a sourcemap in future
				};
			}
		},

		generateBundle() {
			if (this.environment.config.consumer !== 'client') return;

			this.emitFile({
				type: 'asset',
				fileName: `${kit.appDir}/version.json`,
				source: s({ version: kit.version.name })
			});
		},

		async buildApp(builder) {
			// clears the output directories
			if (!builder.config.build.watch) {
				rimraf(out);
			}
			mkdirp(out);

			await builder.build(builder.environments.ssr);

			const verbose = vite_config.logLevel === 'info';
			const log = logger({ verbose });

			/** @type {import('vite').Manifest} */
			const server_manifest = JSON.parse(read(`${out}/server/.vite/manifest.json`));

			/** @type {import('types').BuildData} */
			const build_data = {
				app_dir: kit.appDir,
				app_path: `${kit.paths.base.slice(1)}${kit.paths.base ? '/' : ''}${kit.appDir}`,
				manifest_data,
				out_dir: out,
				service_worker: service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
				client: null,
				server_manifest
			};

			const manifest_path = `${out}/server/manifest-full.js`;
			fs.writeFileSync(
				manifest_path,
				`export const manifest = ${generate_manifest({
					build_data,
					prerendered: [],
					relative_path: '.',
					routes: manifest_data.routes,
					remotes,
					root
				})};\n`
			);

			log.info('Analysing routes');

			const { metadata } = await analyse({
				hash: kit.router.type === 'hash',
				manifest_path,
				manifest_data,
				server_manifest,
				tracked_features,
				env: { ...env.private, ...env.public },
				out,
				output_config: svelte_config.output,
				remotes,
				root
			});

			build_metadata = metadata;

			log.info('Building app');

			// create client build
			write_client_manifest(
				kit,
				manifest_data,
				`${kit.outDir}/generated/client-optimized`,
				metadata.nodes
			);

			const nodes = Object.values(
				/** @type {import('types').ServerMetadata} */ (build_metadata).nodes
			);

			// Through the finished analysis we can now check if any node has server or universal load functions
			const has_server_load = nodes.some((node) => node.has_server_load);
			const has_universal_load = nodes.some((node) => node.has_universal_load);

			if (builder.environments.client.config.define) {
				builder.environments.client.config.define.__SVELTEKIT_HAS_SERVER_LOAD__ =
					s(has_server_load);
				builder.environments.client.config.define.__SVELTEKIT_HAS_UNIVERSAL_LOAD__ =
					s(has_universal_load);
			}

			const { output: client_chunks } = /** @type {import('vite').Rolldown.RolldownOutput} */ (
				await builder.build(builder.environments.client)
			);

			// We use `build.ssrEmitAssets` so that asset URLs created from
			// imports in server-only modules correspond to files in the build,
			// but we don't want to copy over CSS imports as these are already
			// accounted for in the client bundle. In most cases it would be
			// a no-op, but for SSR builds `url(...)` paths are handled
			// differently (relative for client, absolute for server)
			// resulting in different hashes, and thus duplication
			const ssr_stylesheets = new Set(
				Object.values(server_manifest)
					.map((chunk) => chunk.css ?? [])
					.flat()
			);

			const assets_path = `${kit.appDir}/immutable/assets`;
			const server_assets = `${out}/server/${assets_path}`;
			const client_assets = `${out}/client/${assets_path}`;

			if (fs.existsSync(server_assets)) {
				for (const file of fs.readdirSync(server_assets)) {
					const src = `${server_assets}/${file}`;
					const dest = `${client_assets}/${file}`;

					if (fs.existsSync(dest) || ssr_stylesheets.has(`${assets_path}/${file}`)) {
						continue;
					}

					if (file.endsWith('.css')) {
						// make absolute paths in CSS relative, for portability
						const content = fs
							.readFileSync(src, 'utf-8')
							.replaceAll(`${kit.paths.base}/${assets_path}`, '.');

						fs.writeFileSync(src, content);
					}

					copy(src, dest);
				}
			}

			/** @type {import('vite').Manifest} */
			client_manifest = JSON.parse(read(`${out}/client/.vite/manifest.json`));

			/**
			 * @param {string} entry
			 * @param {boolean} [add_dynamic_css]
			 */
			const deps_of = (entry, add_dynamic_css = false) =>
				find_deps(client_manifest, posixify(path.relative(root, entry)), add_dynamic_css, root);

			if (svelte_config.kit.output.bundleStrategy === 'split') {
				const start = deps_of(`${runtime_directory}/client/entry.js`);
				const app = deps_of(`${kit.outDir}/generated/client-optimized/app.js`);

				build_data.client = {
					start: start.file,
					app: app.file,
					imports: [...start.imports, ...app.imports],
					stylesheets: [...start.stylesheets, ...app.stylesheets],
					fonts: [...start.fonts, ...app.fonts],
					uses_env_dynamic_public: client_chunks.some(
						(chunk) => chunk.type === 'chunk' && chunk.modules[env_dynamic_public]
					)
				};

				// In case of server-side route resolution, we create a purpose-built route manifest that is
				// similar to that on the client, with as much information computed upfront so that we
				// don't need to include any code of the actual routes in the server bundle.
				if (svelte_config.kit.router.resolution === 'server') {
					const nodes = manifest_data.nodes.map((node, i) => {
						if (node.component || node.universal) {
							const entry = `${kit.outDir}/generated/client-optimized/nodes/${i}.js`;
							const deps = deps_of(entry, true);
							const file = resolve_symlinks(
								client_manifest,
								`${kit.outDir}/generated/client-optimized/nodes/${i}.js`,
								root
							).chunk.file;

							return { file, css: deps.stylesheets };
						}
					});
					build_data.client.nodes = nodes.map((node) => node?.file);
					build_data.client.css = nodes.map((node) => node?.css);

					build_data.client.routes = compact(
						manifest_data.routes.map((route) => {
							if (!route.page) return;

							return {
								id: route.id,
								pattern: route.pattern,
								params: route.params,
								layouts: route.page.layouts.map((l) =>
									l !== undefined ? [metadata.nodes[l].has_server_load, l] : undefined
								),
								errors: route.page.errors,
								leaf: [metadata.nodes[route.page.leaf].has_server_load, route.page.leaf]
							};
						})
					);
				}
			} else {
				const start = deps_of(`${runtime_directory}/client/bundle.js`);

				build_data.client = {
					start: start.file,
					imports: start.imports,
					stylesheets: start.stylesheets,
					fonts: start.fonts,
					uses_env_dynamic_public: client_chunks.some(
						(chunk) => chunk.type === 'chunk' && chunk.modules[env_dynamic_public]
					)
				};

				if (svelte_config.kit.output.bundleStrategy === 'inline') {
					const style = /** @type {import('vite').Rolldown.OutputAsset} */ (
						client_chunks.find(
							(chunk) =>
								chunk.type === 'asset' && chunk.names.length === 1 && chunk.names[0] === 'style.css'
						)
					);

					build_data.client.inline = {
						script: read(`${out}/client/${start.file}`),
						style: /** @type {string | undefined} */ (style?.source)
					};
				}
			}

			// deduplicate remotes because the same hash may be pushed from both the client and server builds
			remotes = Array.from(new Set(remotes));

			// regenerate manifest now that we have client entry...
			fs.writeFileSync(
				manifest_path,
				`export const manifest = ${generate_manifest({
					build_data,
					prerendered: [],
					relative_path: '.',
					routes: manifest_data.routes,
					remotes,
					root
				})};\n`
			);

			// regenerate nodes with the client manifest...
			build_server_nodes(
				out,
				kit,
				manifest_data,
				server_manifest,
				client_manifest,
				assets_path,
				client_chunks,
				svelte_config.kit.output,
				root
			);

			// ...and prerender
			const prerender_results = await prerender({
				hash: kit.router.type === 'hash',
				out,
				manifest_path,
				metadata,
				verbose,
				env: { ...env.private, ...env.public },
				root
			});
			prerendered = prerender_results.prerendered;

			// generate a new manifest that doesn't include prerendered pages
			fs.writeFileSync(
				`${out}/server/manifest.js`,
				`export const manifest = ${generate_manifest({
					build_data,
					prerendered: prerendered.paths,
					relative_path: '.',
					routes: manifest_data.routes.filter(
						(route) => prerender_results.prerender_map.get(route.id) !== true
					),
					remotes,
					root
				})};\n`
			);

			if (service_worker_entry_file) {
				if (kit.paths.assets) {
					throw new Error('Cannot use service worker alongside config.kit.paths.assets');
				}

				log.info('Building service worker');

				builder.environments.serviceWorker.config.define =
					builder.environments.client.config.define;
				builder.environments.serviceWorker.config.resolve.alias = [
					...get_config_aliases(kit, vite_config.root)
				];
				builder.environments.serviceWorker.config.experimental.renderBuiltUrl = (filename) => {
					return {
						runtime: `new URL(${JSON.stringify(filename)}, location.href).pathname`
					};
				};

				await builder.build(builder.environments.serviceWorker);
			}

			console.log(
				`\nRun ${styleText(['bold', 'cyan'], 'npm run preview')} to preview your production build locally.`
			);

			if (kit.adapter) {
				const { adapt } = await import('../../core/adapt/index.js');
				await adapt(
					svelte_config,
					build_data,
					metadata,
					prerendered,
					prerender_results.prerender_map,
					log,
					remotes,
					vite_config
				);
			} else {
				console.log(styleText(['bold', 'yellow'], '\nNo adapter specified'));

				const link = styleText(['bold', 'cyan'], 'https://svelte.dev/docs/kit/adapters');
				console.log(
					`See ${link} to learn how to configure your app to run on the platform of your choosing`
				);
			}
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_generated = {
		name: 'vite-plugin-sveltekit-resolve-generated',
		resolveId: {
			order: 'pre',
			filter: {
				id: /\/generated\.js$/
			},
			handler(_, importer) {
				const generated = path.posix.join(kit.outDir, 'generated');
				if (importer?.startsWith(runtime_directory)) {
					return `${generated}/server/internal.js`;
				}
			}
		}
	};

	return [
		plugin_setup,
		plugin_generated,
		plugin_remote,
		plugin_server_filesystem,
		plugin_virtual_modules,
		process.env.TEST !== 'true' ? plugin_guard : undefined,
		plugin_service_worker,
		plugin_compile
	].filter((p) => !!p);
}

/**
 * @param {Record<string, any>} config
 * @param {Record<string, any>} resolved_config
 */
function warn_overridden_config(config, resolved_config) {
	const overridden = find_overridden_config(config, resolved_config, enforced_config, '', []);

	if (overridden.length > 0) {
		console.error(
			styleText(
				['bold', 'red'],
				'The following Vite config options will be overridden by SvelteKit:'
			) + overridden.map((key) => `\n  - ${key}`).join('')
		);
	}
}

/**
 * @param {Record<string, any>} config
 * @param {Record<string, any>} resolved_config
 * @param {import('./types.js').EnforcedConfig} enforced_config
 * @param {string} path
 * @param {string[]} out used locally to compute the return value
 */
function find_overridden_config(config, resolved_config, enforced_config, path, out) {
	if (config == null || resolved_config == null) {
		return out;
	}

	for (const key in enforced_config) {
		if (typeof config === 'object' && key in config && key in resolved_config) {
			const enforced = enforced_config[key];

			if (enforced === true) {
				if (config[key] !== resolved_config[key]) {
					out.push(path + key);
				}
			} else {
				find_overridden_config(config[key], resolved_config[key], enforced, path + key + '.', out);
			}
		}
	}
	return out;
}

/**
 * @param {import('types').ValidatedConfig} config
 * @returns {string}
 */
function create_service_worker_module(config) {
	return dedent`
		if (typeof self === 'undefined' || self instanceof ServiceWorkerGlobalScope === false) {
			throw new Error('This module can only be imported inside a service worker');
		}

		export const build = [];
		export const files = [
			${create_assets(config)
				.filter((asset) => config.kit.serviceWorker.files(asset.file))
				.map((asset) => `${s(`${config.kit.paths.base}/${asset.file}`)}`)
				.join(',\n')}
		];
		export const prerendered = [];
		export const version = ${s(config.kit.version.name)};
	`;
}
