import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';

import { exactRegex, prefixRegex } from 'rolldown/filter';

import { copy, mkdirp, posixify, read, resolve_entry, rimraf } from '../../utils/filesystem.js';
import { create_static_module, create_dynamic_module } from '../../core/env.js';
import * as sync from '../../core/sync/sync.js';
import { create_assets } from '../../core/sync/create_manifest_data/index.js';
import { runtime_directory, logger } from '../../core/utils.js';
import { generate_manifest } from '../../core/generate_manifest/index.js';
import { build_server_nodes } from './build/build_server.js';
import { build_service_worker } from './build/build_service_worker.js';
import { assets_base, find_deps, resolve_symlinks } from './build/utils.js';
import { dev } from './dev/index.js';
import { preview } from './preview/index.js';
import {
	error_for_missing_config,
	get_config_aliases,
	get_env,
	normalize_id,
	stackless
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
	sveltekit_environment,
	sveltekit_server
} from './module_ids.js';
import { import_peer } from '../../utils/import.js';
import { compact } from '../../utils/array.js';
import { should_ignore, has_children } from './static_analysis/utils.js';
import { load_config } from '../../core/config/index.js';

const cwd = process.cwd();

/** @type {string} */
let root;

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
		rollupOptions: {
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

/** @type {import('@sveltejs/vite-plugin-svelte')} */
let vite_plugin_svelte;

/**
 * Returns the SvelteKit Vite plugins.
 * @returns {Promise<import('vite').Plugin[]>}
 */
export async function sveltekit() {
	// the config options will be set only after the Vite `config` hook runs
	// because we need to find `svelte.config.js` relative to `vite.config.root`
	const svelte_config = /** @type {import('types').ValidatedConfig} */ ({});

	/** @type {import('@sveltejs/vite-plugin-svelte').Options} */
	const vite_plugin_svelte_options = {
		// we don't want vite-plugin-svelte to load the config file itself because
		// it will try to validate it without knowing that kit options are valid
		configFile: false
	};

	/** @type {import('@sveltejs/vite-plugin-svelte')} */
	vite_plugin_svelte = await import_peer('@sveltejs/vite-plugin-svelte', cwd);

	return [
		plugin_svelte_config({ vite_plugin_svelte_options, svelte_config }),
		...vite_plugin_svelte.svelte(vite_plugin_svelte_options),
		...kit({ svelte_config })
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

// These variables live outside the `kit()` function because it is re-invoked by each Vite build

let secondary_build_started = false;

/** @type {import('types').ManifestData} */
let manifest_data;

/** @type {import('types').ServerMetadata | undefined} only set at build time once analysis is finished */
let build_metadata = undefined;

/**
 * Returns the SvelteKit Vite plugin. Vite executes Rollup hooks as well as some of its own.
 * Background reading is available at:
 * - https://vitejs.dev/guide/api-plugin.html
 * - https://rollupjs.org/guide/en/#plugin-development
 *
 * You can get an idea of the lifecycle by looking at the flow charts here:
 * - https://rollupjs.org/guide/en/#build-hooks
 * - https://rollupjs.org/guide/en/#output-generation-hooks
 *
 * @param {{ svelte_config: import('types').ValidatedConfig }} options
 * @return {import('vite').Plugin[]}
 */
function kit({ svelte_config }) {
	/** @type {import('vite')} */
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

	/** @type {() => Promise<void>} */
	let finalise;

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

	/** @type {import('vite').Plugin} */
	const plugin_setup = {
		name: 'vite-plugin-sveltekit-setup',
		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		async config(config, config_env) {
			initial_config = config;
			vite_config_env = config_env;
			is_build = config_env.command === 'build';

			({ kit } = svelte_config);
			out = `${kit.outDir}/output`;

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

			const generated = path.posix.join(kit.outDir, 'generated');

			// dev and preview config can be shared
			/** @type {import('vite').UserConfig} */
			const new_config = {
				resolve: {
					alias: [
						{ find: '__SERVER__', replacement: `${generated}/server` },
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
					],
					rolldownOptions: kit.experimental.remoteFunctions
						? {
								plugins: [
									{
										name: 'vite-plugin-sveltekit-setup:optimize-remote-functions',
										load: {
											filter: {
												// treat .remote.js files as empty for the purposes of prebundling
												id: new RegExp(
													`.remote(${kit.moduleExtensions.join('|')})$`.replaceAll('.', '\\.')
												)
											},
											handler() {
												return '';
											}
										}
									}
								]
							}
						: undefined
				},
				ssr: {
					noExternal: [
						// This ensures that esm-env is inlined into the server output with the
						// export conditions resolved correctly through Vite. This prevents adapters
						// that bundle later on from resolving the export conditions incorrectly
						// and for example include browser-only code in the server output
						// because they for example use esbuild.build with `platform: 'browser'`
						'esm-env',
						// This forces `$app/*` modules to be bundled, since they depend on
						// virtual modules like `__sveltekit/environment` (this isn't a valid bare
						// import, but it works with vite-node's externalization logic, which
						// uses basic concatenation)
						'@sveltejs/kit/src/runtime'
					]
				}
			};

			const define = {
				__SVELTEKIT_APP_DIR__: s(kit.appDir),
				__SVELTEKIT_EMBEDDED__: s(kit.embedded),
				__SVELTEKIT_EXPERIMENTAL__REMOTE_FUNCTIONS__: s(kit.experimental.remoteFunctions),
				__SVELTEKIT_FORK_PRELOADS__: s(kit.experimental.forkPreloads),
				__SVELTEKIT_PATHS_ASSETS__: s(kit.paths.assets),
				__SVELTEKIT_PATHS_BASE__: s(kit.paths.base),
				__SVELTEKIT_PATHS_RELATIVE__: s(kit.paths.relative),
				__SVELTEKIT_CLIENT_ROUTING__: s(kit.router.resolution === 'client'),
				__SVELTEKIT_HASH_ROUTING__: s(kit.router.type === 'hash'),
				__SVELTEKIT_SERVER_TRACING_ENABLED__: s(kit.experimental.tracing.server)
			};

			if (is_build) {
				if (!new_config.build) new_config.build = {};
				new_config.build.ssr = !secondary_build_started;

				new_config.define = {
					...define,
					__SVELTEKIT_ADAPTER_NAME__: s(kit.adapter?.name),
					__SVELTEKIT_APP_VERSION_FILE__: s(`${kit.appDir}/version.json`),
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: s(kit.version.pollInterval),
					__SVELTEKIT_PAYLOAD__: new_config.build.ssr
						? '{}'
						: `globalThis.__sveltekit_${version_hash}`
				};

				if (!secondary_build_started) {
					manifest_data = sync.all(svelte_config, config_env.mode, root).manifest_data;
					// During the initial server build we don't know yet
					new_config.define.__SVELTEKIT_HAS_SERVER_LOAD__ = 'true';
					new_config.define.__SVELTEKIT_HAS_UNIVERSAL_LOAD__ = 'true';
				} else {
					const nodes = Object.values(
						/** @type {import('types').ServerMetadata} */ (build_metadata).nodes
					);

					// Through the finished analysis we can now check if any node has server or universal load functions
					const has_server_load = nodes.some((node) => node.has_server_load);
					const has_universal_load = nodes.some((node) => node.has_universal_load);

					new_config.define.__SVELTEKIT_HAS_SERVER_LOAD__ = s(has_server_load);
					new_config.define.__SVELTEKIT_HAS_UNIVERSAL_LOAD__ = s(has_universal_load);
				}
			} else {
				new_config.define = {
					...define,
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: '0',
					__SVELTEKIT_PAYLOAD__: 'globalThis.__sveltekit_dev',
					__SVELTEKIT_HAS_SERVER_LOAD__: 'true',
					__SVELTEKIT_HAS_UNIVERSAL_LOAD__: 'true'
				};

				// @ts-ignore this prevents a reference error if `client.js` is imported on the server
				globalThis.__sveltekit_dev = {};

				// These Kit dependencies are packaged as CommonJS, which means they must always be externalized.
				// Without this, the tests will still pass but `pnpm dev` will fail in projects that link `@sveltejs/kit`.
				/** @type {NonNullable<import('vite').UserConfig['ssr']>} */ (new_config.ssr).external = [
					'cookie'
				];
			}

			warn_overridden_config(config, new_config);

			return new_config;
		},

		/**
		 * Stores the final config.
		 */
		configResolved(config) {
			vite_config = config;
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_virtual_modules = {
		name: 'vite-plugin-sveltekit-virtual-modules',

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
					exactRegex(sveltekit_environment),
					exactRegex(sveltekit_server)
				]
			},
			handler(id, options) {
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
						const browser = !options?.ssr;
						// populate `$env/dynamic/public` from `window`
						if (browser) {
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

					case sveltekit_environment: {
						const { version } = svelte_config.kit;

						return dedent`
						export const version = ${s(version.name)};
						export let building = false;
						export let prerendering = false;

						export function set_building() {
							building = true;
						}

						export function set_prerendering() {
							prerendering = true;
						}
					`;
					}

					case sveltekit_server: {
						return dedent`
						export let read_implementation = null;

						export let manifest = null;

						export function set_read_implementation(fn) {
							read_implementation = fn;
						}

						export function set_manifest(_) {
							manifest = _;
						}
					`;
					}
				}
			}
		}
	};

	const skip_plugin_guard = process.env.TEST === 'true';
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

		resolveId: skip_plugin_guard
			? undefined
			: {
					// TODO: use composable filter API here when supported:
					// https://github.com/vitejs/rolldown-vite/issues/605
					// filter: ([
					// 	exclude(importerId(/index\.html$/)),
					// 	include(importerId(/.+/))
					// ]),
					async handler(id, importer, options) {
						if (importer && !importer.endsWith('index.html')) {
							const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });

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

		load: skip_plugin_guard
			? undefined
			: {
					filter: {
						id: [
							exactRegex(env_static_private),
							exactRegex(env_dynamic_private),
							exactRegex(app_server),
							/\/server\//,
							new RegExp(`${server_only_pattern.source}$`)
						]
					},
					handler(id, options) {
						// TODO: replace with https://vite.dev/guide/api-environment-plugins#per-environment-plugins
						if (options?.ssr === true) {
							return;
						}

						// skip .server.js files outside the cwd or in node_modules, as the filename might not mean 'server-only module' in this context
						// should be equivalent to: (id.startsWith(normalized_cwd) && !id.startsWith(normalized_node_modules) && server_only_pattern.test(path.basename(id))
						// TODO: address https://github.com/sveltejs/kit/issues/12529
						// if we decide to do it then remove the CWD portion
						if (
							id !== env_static_private &&
							id !== env_dynamic_private &&
							id !== app_server &&
							!id.startsWith(`${normalized_lib}/server`) &&
							server_only_pattern.test(id) &&
							(!id.startsWith(normalized_cwd) || id.startsWith(normalized_node_modules))
						) {
							return;
						}

						// in dev, this doesn't exist, so we need to create it
						manifest_data ??= sync.all(svelte_config, vite_config_env.mode, root).manifest_data;

						/** @type {Set<string>} */
						const entrypoints = new Set();
						for (const node of manifest_data.nodes) {
							if (node.component) entrypoints.add(node.component);
							if (node.universal) entrypoints.add(node.universal);
						}

						if (manifest_data.hooks.client) entrypoints.add(manifest_data.hooks.client);
						if (manifest_data.hooks.universal) entrypoints.add(manifest_data.hooks.universal);

						const normalized = normalize_id(id, normalized_lib, normalized_cwd);
						const chain = [normalized];

						let current = normalized;
						let includes_remote_file = false;

						while (true) {
							const importers = import_map.get(current);
							if (!importers) break;

							const candidates = Array.from(importers).filter(
								(importer) => !chain.includes(importer)
							);
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

	/** @type {import('vite').ViteDevServer} */
	let dev_server;

	/** @type {Array<{ hash: string, file: string }>} */
	const remotes = [];

	/** @type {Map<string, string>} Maps remote hash -> original module id */
	const remote_original_by_hash = new Map();

	/** @type {Set<string>} Track which remote hashes have already been emitted */
	const emitted_remote_hashes = new Set();

	/** @type {import('vite').Plugin} */
	const plugin_remote = {
		name: 'vite-plugin-sveltekit-remote',

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

		configureServer(_dev_server) {
			if (!kit.experimental.remoteFunctions) {
				return;
			}

			dev_server = _dev_server;
		},

		async transform(code, id, opts) {
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

			if (opts?.ssr) {
				// we need to add an `await Promise.resolve()` because if the user imports this function
				// on the client AND in a load function when loading the client module we will trigger
				// an ssrLoadModule during dev. During a link preload, the module can be mistakenly
				// loaded and transformed twice and the first time all its exports would be undefined
				// triggering a dev server error. By adding a microtask we ensure that the module is fully loaded

				// Extra newlines to prevent syntax errors around missing semicolons or comments
				code +=
					'\n\n' +
					dedent`
					import * as $$_self_$$ from './${path.basename(id)}';
					import { init_remote_functions as $$_init_$$ } from '@sveltejs/kit/internal';

					${dev_server ? 'await Promise.resolve()' : ''}

					$$_init_$$($$_self_$$, ${s(file)}, ${s(remote.hash)});

					for (const [name, fn] of Object.entries($$_self_$$)) {
						fn.__.id = ${s(remote.hash)} + '/' + name;
						fn.__.name = name;
					}
				`;

				// Emit a dedicated entry chunk for this remote in SSR builds (prod only)
				if (!dev_server) {
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

			/** @type {Map<string, import('types').RemoteInfo['type']>} */
			const map = new Map();

			// in dev, load the server module here (which will result in this hook
			// being called again with `opts.ssr === true` if the module isn't
			// already loaded) so we can determine what it exports
			if (dev_server) {
				const module = await dev_server.ssrLoadModule(id);

				for (const [name, value] of Object.entries(module)) {
					const type = value?.__?.type;
					if (type) {
						map.set(name, type);
					}
				}
			}

			// in prod, we already built and analysed the server code before
			// building the client code, so `remote_exports` is populated
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

			if (dev_server) {
				result += `\nimport.meta.hot?.accept();\n`;
			}

			return {
				code: result
			};
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_compile = {
		name: 'vite-plugin-sveltekit-compile',

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		config(config) {
			/** @type {import('vite').UserConfig} */
			let new_config;

			const kit_paths_base = kit.paths.base || '/';

			if (is_build) {
				const ssr = /** @type {boolean} */ (config.build?.ssr);
				const prefix = `${kit.appDir}/immutable`;

				/** @type {Record<string, string>} */
				const input = {};

				if (ssr) {
					input.index = `${runtime_directory}/server/index.js`;
					input.internal = `${kit.outDir}/generated/server/internal.js`;
					input['remote-entry'] = `${runtime_directory}/app/server/remote/index.js`;

					// add entry points for every endpoint...
					manifest_data.routes.forEach((route) => {
						if (route.endpoint) {
							const resolved = path.resolve(root, route.endpoint.file);
							const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));
							const name = posixify(path.join('entries/endpoints', relative.replace(/\.js$/, '')));
							input[name] = resolved;
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
								input[name] = resolved;
							}
						}
					});

					// ...and every matcher
					Object.entries(manifest_data.matchers).forEach(([key, file]) => {
						const name = posixify(path.join('entries/matchers', key));
						input[name] = path.resolve(root, file);
					});

					// ...and the hooks files
					if (manifest_data.hooks.server) {
						input['entries/hooks.server'] = path.resolve(root, manifest_data.hooks.server);
					}
					if (manifest_data.hooks.universal) {
						input['entries/hooks.universal'] = path.resolve(root, manifest_data.hooks.universal);
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
						input['instrumentation.server'] = server_instrumentation;
					}
				} else if (svelte_config.kit.output.bundleStrategy !== 'split') {
					input['bundle'] = `${runtime_directory}/client/bundle.js`;
				} else {
					input['entry/start'] = `${runtime_directory}/client/entry.js`;
					input['entry/app'] = `${kit.outDir}/generated/client-optimized/app.js`;
					manifest_data.nodes.forEach((node, i) => {
						if (node.component || node.universal) {
							input[`nodes/${i}`] = `${kit.outDir}/generated/client-optimized/nodes/${i}.js`;
						}
					});
				}

				// We could always use a relative asset base path here, but it's better for performance not to.
				// E.g. Vite generates `new URL('/asset.png', import.meta).href` for a relative path vs just '/asset.png'.
				// That's larger and takes longer to run and also causes an HTML diff between SSR and client
				// causing us to do a more expensive hydration check.
				const client_base =
					kit.paths.relative !== false || kit.paths.assets ? './' : kit_paths_base;

				const inline = !ssr && svelte_config.kit.output.bundleStrategy === 'inline';
				const split = ssr || svelte_config.kit.output.bundleStrategy === 'split';

				new_config = {
					base: ssr ? assets_base(kit) : client_base,
					build: {
						copyPublicDir: !ssr,
						cssCodeSplit: svelte_config.kit.output.bundleStrategy !== 'inline',
						cssMinify: initial_config.build?.minify == null ? true : !!initial_config.build.minify,
						manifest: true,
						outDir: `${out}/${ssr ? 'server' : 'client'}`,
						rollupOptions: {
							input: inline ? input['bundle'] : input,
							output: {
								format: inline ? 'iife' : 'esm',
								name: `__sveltekit_${version_hash}.app`,
								entryFileNames: ssr ? '[name].js' : `${prefix}/[name].[hash].js`,
								chunkFileNames: ssr ? 'chunks/[name].js' : `${prefix}/chunks/[hash].js`,
								assetFileNames: `${prefix}/assets/[name].[hash][extname]`,
								hoistTransitiveImports: false,
								sourcemapIgnoreList,
								codeSplitting: split
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
						ssrEmitAssets: true,
						target: ssr ? 'node20.12' : undefined
					},
					publicDir: kit.files.assets,
					worker: {
						rollupOptions: {
							output: {
								entryFileNames: `${prefix}/workers/[name]-[hash].js`,
								chunkFileNames: `${prefix}/workers/chunks/[hash].js`,
								assetFileNames: `${prefix}/workers/assets/[name]-[hash][extname]`,
								hoistTransitiveImports: false
							}
						}
					}
				};
			} else {
				new_config = {
					appType: 'custom',
					base: kit_paths_base,
					build: {
						rollupOptions: {
							// Vite dependency crawler needs an explicit JS entry point
							// eventhough server otherwise works without it
							input: `${runtime_directory}/client/entry.js`
						}
					},
					publicDir: kit.files.assets
				};
			}

			warn_overridden_config(config, new_config);

			return new_config;
		},

		/**
		 * Adds the SvelteKit middleware to do SSR in dev mode.
		 * @see https://vitejs.dev/guide/api-plugin.html#configureserver
		 */
		async configureServer(vite) {
			return await dev(vite, vite_config, svelte_config, () => remotes, root);
		},

		/**
		 * Adds the SvelteKit middleware to do SSR in preview mode.
		 * @see https://vitejs.dev/guide/api-plugin.html#configurepreviewserver
		 */
		configurePreviewServer(vite) {
			return preview(vite, vite_config, svelte_config);
		},

		/**
		 * Clears the output directories.
		 */
		buildStart() {
			if (secondary_build_started) return;

			if (is_build) {
				if (!vite_config.build.watch) {
					rimraf(out);
				}
				mkdirp(out);
			}
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
			if (vite_config.build.ssr) return;

			this.emitFile({
				type: 'asset',
				fileName: `${kit.appDir}/version.json`,
				source: s({ version: kit.version.name })
			});
		},

		/**
		 * Vite builds a single bundle. We need three bundles: client, server, and service worker.
		 * The user's package.json scripts will invoke the Vite CLI to execute the server build. We
		 * then use this hook to kick off builds for the client and service worker.
		 */
		writeBundle: {
			sequential: true,
			async handler(_options) {
				if (secondary_build_started) return; // only run this once

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

				secondary_build_started = true;

				let client_chunks;

				try {
					const bundle = /** @type {import('vite').Rollup.RollupOutput} */ (
						await vite.build({
							configFile: vite_config.configFile,
							// CLI args
							mode: vite_config_env.mode,
							logLevel: vite_config.logLevel,
							clearScreen: vite_config.clearScreen,
							build: {
								minify: initial_config.build?.minify,
								assetsInlineLimit: vite_config.build.assetsInlineLimit,
								sourcemap: vite_config.build.sourcemap
							},
							optimizeDeps: {
								force: vite_config.optimizeDeps.force
							}
						})
					);

					client_chunks = bundle.output;
				} catch (e) {
					const error =
						e instanceof Error ? e : new Error(/** @type {any} */ (e).message ?? e ?? '<unknown>');

					// without this, errors that occur during the secondary build
					// will be logged twice
					throw stackless(error.stack ?? error.message);
				}

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
				const client_manifest = JSON.parse(read(`${out}/client/.vite/manifest.json`));

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
						const style = /** @type {import('vite').Rollup.OutputAsset} */ (
							client_chunks.find(
								(chunk) =>
									chunk.type === 'asset' &&
									chunk.names.length === 1 &&
									chunk.names[0] === 'style.css'
							)
						);

						build_data.client.inline = {
							script: read(`${out}/client/${start.file}`),
							style: /** @type {string | undefined} */ (style?.source)
						};
					}
				}

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
				const { prerendered, prerender_map } = await prerender({
					hash: kit.router.type === 'hash',
					out,
					manifest_path,
					metadata,
					verbose,
					env: { ...env.private, ...env.public },
					root
				});

				// generate a new manifest that doesn't include prerendered pages
				fs.writeFileSync(
					`${out}/server/manifest.js`,
					`export const manifest = ${generate_manifest({
						build_data,
						prerendered: prerendered.paths,
						relative_path: '.',
						routes: manifest_data.routes.filter((route) => prerender_map.get(route.id) !== true),
						remotes,
						root
					})};\n`
				);

				if (service_worker_entry_file) {
					if (kit.paths.assets) {
						throw new Error('Cannot use service worker alongside config.kit.paths.assets');
					}

					log.info('Building service worker');

					await build_service_worker(
						out,
						kit,
						{
							...vite_config,
							build: {
								...vite_config.build,
								minify: initial_config.build?.minify ?? true
							}
						},
						manifest_data,
						service_worker_entry_file,
						prerendered,
						client_manifest
					);
				}

				// we need to defer this to closeBundle, so that adapters copy files
				// created by other Vite plugins
				finalise = async () => {
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
							prerender_map,
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

					secondary_build_started = false;
				};
			}
		},

		/**
		 * Runs the adapter.
		 */
		closeBundle: {
			sequential: true,
			async handler() {
				if (!vite_config.build.ssr) return;
				await finalise?.();
			}
		}
	};

	return [plugin_setup, plugin_remote, plugin_virtual_modules, plugin_guard, plugin_compile].filter(
		(p) => !!p
	);
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
 */
const create_service_worker_module = (config) => dedent`
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
