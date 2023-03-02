import fs from 'node:fs';
import path from 'node:path';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import colors from 'kleur';
import * as vite from 'vite';

import { mkdirp, posixify, read, resolve_entry, rimraf } from '../../utils/filesystem.js';
import { create_static_module, create_dynamic_module } from '../../core/env.js';
import * as sync from '../../core/sync/sync.js';
import { create_assets } from '../../core/sync/create_manifest_data/index.js';
import { runtime_directory, logger } from '../../core/utils.js';
import { load_config } from '../../core/config/index.js';
import { generate_manifest } from '../../core/generate_manifest/index.js';
import { build_server_nodes } from './build/build_server.js';
import { build_service_worker } from './build/build_service_worker.js';
import { assets_base, find_deps } from './build/utils.js';
import { dev } from './dev/index.js';
import { is_illegal, module_guard, normalize_id } from './graph_analysis/index.js';
import { preview } from './preview/index.js';
import { get_config_aliases, get_env } from './utils.js';
import { write_client_manifest } from '../../core/sync/write_client_manifest.js';
import prerender from '../../core/postbuild/prerender.js';
import analyse from '../../core/postbuild/analyse.js';
import { s } from '../../utils/misc.js';
import { hash } from '../../runtime/hash.js';
import { dedent } from '../../core/sync/utils.js';

export { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const cwd = process.cwd();

/** @type {import('./types').EnforcedConfig} */
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
	},
	root: true
};

const options_regex = /(export\s+const\s+(prerender|csr|ssr|trailingSlash))\s*=/s;

/** @type {Set<string>} */
const warned = new Set();

/** @type {import('@sveltejs/vite-plugin-svelte').PreprocessorGroup} */
const warning_preprocessor = {
	script: ({ content, filename }) => {
		if (!filename) return;

		const basename = path.basename(filename);
		if (basename.startsWith('+page.') || basename.startsWith('+layout.')) {
			const match = content.match(options_regex);
			if (match) {
				const fixed = basename.replace('.svelte', '(.server).js/ts');

				const message =
					`\n${colors.bold().red(path.relative('.', filename))}\n` +
					`\`${match[1]}\` will be ignored — move it to ${fixed} instead. See https://kit.svelte.dev/docs/page-options for more information.`;

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
		if (basename.startsWith('+layout.') && !content.includes('<slot')) {
			const message =
				`\n${colors.bold().red(path.relative('.', filename))}\n` +
				`\`<slot />\` missing — inner content will not be rendered`;

			if (!warned.has(message)) {
				console.log(message);
				warned.add(message);
			}
		}
	}
};

/** @return {Promise<import('vite').Plugin[]>} */
export async function sveltekit() {
	const svelte_config = await load_config();

	/** @type {import('@sveltejs/vite-plugin-svelte').Options['preprocess']} */
	let preprocess = svelte_config.preprocess;
	if (Array.isArray(preprocess)) {
		preprocess = [...preprocess, warning_preprocessor];
	} else if (preprocess) {
		preprocess = [preprocess, warning_preprocessor];
	} else {
		preprocess = warning_preprocessor;
	}

	/** @type {import('@sveltejs/vite-plugin-svelte').Options} */
	const vite_plugin_svelte_options = {
		configFile: false,
		extensions: svelte_config.extensions,
		preprocess,
		onwarn: svelte_config.onwarn,
		compilerOptions: {
			// @ts-expect-error SvelteKit requires hydratable true by default
			hydratable: true,
			...svelte_config.compilerOptions
		},
		...svelte_config.vitePlugin
	};

	return [...svelte(vite_plugin_svelte_options), ...kit({ svelte_config })];
}

// These variables live outside the `kit()` function because it is re-invoked by each Vite build

let secondary_build_started = false;

/** @type {import('types').ManifestData} */
let manifest_data;

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
	const { kit } = svelte_config;
	const out = `${kit.outDir}/output`;

	const version_hash = hash(kit.version.name);

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

	const service_worker_entry_file = resolve_entry(kit.files.serviceWorker);

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

			env = get_env(kit.env, vite_config_env.mode);

			const allow = new Set([
				kit.files.lib,
				kit.files.routes,
				kit.outDir,
				path.resolve('src'), // TODO this isn't correct if user changed all his files to sth else than src (like in test/options)
				path.resolve('node_modules'),
				path.resolve(vite.searchForWorkspaceRoot(cwd), 'node_modules')
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
						...get_config_aliases(kit)
					]
				},
				root: cwd,
				server: {
					fs: {
						allow: [...allow]
					},
					watch: {
						ignored: [
							// Ignore all siblings of config.kit.outDir/generated
							`${posixify(kit.outDir)}/!(generated)`
						]
					},
					cors: { preflightContinue: true }
				},
				preview: {
					cors: { preflightContinue: true }
				},
				optimizeDeps: {
					exclude: [
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
						// because they for example use esbuild.build with `platform: 'browser'`
						'esm-env',
						// We need this for two reasons:
						// 1. Without this, `@sveltejs/kit` imports are kept as-is in the server output,
						//    and that causes modules and therefore classes like `Redirect` to be imported twice
						//    under different IDs, which breaks a bunch of stuff because of failing instanceof checks.
						// 2. Vitest bypasses Vite when loading external modules, so we bundle
						//    when it is detected to keep our virtual modules working.
						//    See https://github.com/sveltejs/kit/pull/9172
						//    and https://vitest.dev/config/#deps-registernodeloader
						'@sveltejs/kit'
					]
				}
			};

			if (is_build) {
				if (!new_config.build) new_config.build = {};
				new_config.build.ssr = !secondary_build_started;

				new_config.define = {
					__SVELTEKIT_ADAPTER_NAME__: s(kit.adapter?.name),
					__SVELTEKIT_APP_VERSION_FILE__: s(`${kit.appDir}/version.json`),
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: s(kit.version.pollInterval),
					__SVELTEKIT_DEV__: 'false',
					__SVELTEKIT_EMBEDDED__: kit.embedded ? 'true' : 'false'
				};

				if (!secondary_build_started) {
					manifest_data = (await sync.all(svelte_config, config_env.mode)).manifest_data;
				}
			} else {
				new_config.define = {
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: '0',
					__SVELTEKIT_DEV__: 'true',
					__SVELTEKIT_EMBEDDED__: kit.embedded ? 'true' : 'false'
				};

				// These Kit dependencies are packaged as CommonJS, which means they must always be externalized.
				// Without this, the tests will still pass but `pnpm dev` will fail in projects that link `@sveltejs/kit`.
				/** @type {NonNullable<import('vite').UserConfig['ssr']>} */ (new_config.ssr).external = [
					'cookie',
					'set-cookie-parser'
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

			// This is a hack to prevent Vite from nuking useful logs,
			// pending https://github.com/vitejs/vite/issues/9378
			config.logger.warn('');
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_virtual_modules = {
		name: 'vite-plugin-sveltekit-virtual-modules',

		async resolveId(id) {
			// treat $env/static/[public|private] as virtual
			if (id.startsWith('$env/') || id.startsWith('__sveltekit/') || id === '$service-worker') {
				return `\0${id}`;
			}
		},

		async load(id, options) {
			const browser = !options?.ssr;
			const global = `globalThis.__sveltekit_${version_hash}`;

			if (options?.ssr === false && process.env.TEST !== 'true') {
				const normalized_cwd = vite.normalizePath(cwd);
				const normalized_lib = vite.normalizePath(kit.files.lib);
				if (
					is_illegal(id, {
						cwd: normalized_cwd,
						node_modules: vite.normalizePath(path.resolve('node_modules')),
						server: vite.normalizePath(path.join(normalized_lib, 'server'))
					})
				) {
					const relative = normalize_id(id, normalized_lib, normalized_cwd);
					throw new Error(`Cannot import ${relative} into client-side code`);
				}
			}

			switch (id) {
				case '\0$env/static/private':
					return create_static_module('$env/static/private', env.private);

				case '\0$env/static/public':
					return create_static_module('$env/static/public', env.public);

				case '\0$env/dynamic/private':
					return create_dynamic_module(
						'private',
						vite_config_env.command === 'serve' ? env.private : undefined
					);

				case '\0$env/dynamic/public':
					// populate `$env/dynamic/public` from `window`
					if (browser) {
						return `export const env = ${global}.env;`;
					}

					return create_dynamic_module(
						'public',
						vite_config_env.command === 'serve' ? env.public : undefined
					);

				case '\0$service-worker':
					return create_service_worker_module(svelte_config);

				// for internal use only. it's published as $app/paths externally
				// we use this alias so that we won't collide with user aliases
				case '\0__sveltekit/paths':
					const { assets, base } = svelte_config.kit.paths;

					// use the values defined in `global`, but fall back to hard-coded values
					// for the sake of things like Vitest which may import this module
					// outside the context of a page
					if (browser) {
						return dedent`
							export const base = ${global}?.base ?? ${s(base)};
							export const assets = ${global}?.assets ?? ${assets ? s(assets) : 'base'};
						`;
					}

					return dedent`
						export let base = ${s(base)};
						export let assets = ${assets ? s(assets) : 'base'};

						export const relative = ${svelte_config.kit.paths.relative};

						const initial = { base, assets };

						export function override(paths) {
							base = paths.base;
							assets = paths.assets;
						}

						export function reset() {
							base = initial.base;
							assets = initial.assets;
						}

						/** @param {string} path */
						export function set_assets(path) {
							assets = initial.assets = path;
						}
					`;

				case '\0__sveltekit/environment':
					const { version } = svelte_config.kit;

					return dedent`
						export const version = ${s(version.name)};
						export let building = false;

						export function set_building() {
							building = true;
						}
					`;
			}
		}
	};

	/**
	 * Ensures that client-side code can't accidentally import server-side code,
	 * whether in `*.server.js` files, `$lib/server`, or `$env/[static|dynamic]/private`
	 * @type {import('vite').Plugin}
	 */
	const plugin_guard = {
		name: 'vite-plugin-sveltekit-guard',

		writeBundle: {
			sequential: true,
			async handler(_options) {
				if (vite_config.build.ssr) return;

				const guard = module_guard(this, {
					cwd: vite.normalizePath(process.cwd()),
					lib: vite.normalizePath(kit.files.lib)
				});

				manifest_data.nodes.forEach((_node, i) => {
					const id = vite.normalizePath(
						path.resolve(kit.outDir, `generated/client-optimized/nodes/${i}.js`)
					);

					guard.check(id);
				});
			}
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_compile = {
		name: 'vite-plugin-sveltekit-compile',

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		async config(config) {
			/** @type {import('vite').UserConfig} */
			let new_config;

			if (is_build) {
				const ssr = /** @type {boolean} */ (config.build?.ssr);
				const prefix = `${kit.appDir}/immutable`;

				/** @type {Record<string, string>} */
				const input = {};

				if (ssr) {
					input.index = `${runtime_directory}/server/index.js`;
					input.internal = `${kit.outDir}/generated/server/internal.js`;

					// add entry points for every endpoint...
					manifest_data.routes.forEach((route) => {
						if (route.endpoint) {
							const resolved = path.resolve(route.endpoint.file);
							const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));
							const name = posixify(path.join('entries/endpoints', relative.replace(/\.js$/, '')));
							input[name] = resolved;
						}
					});

					// ...and every component used by pages...
					manifest_data.nodes.forEach((node) => {
						for (const file of [node.component, node.universal, node.server]) {
							if (file) {
								const resolved = path.resolve(file);
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
						input[name] = path.resolve(file);
					});
				} else {
					input['entry/start'] = `${runtime_directory}/client/start.js`;
					input['entry/app'] = `${kit.outDir}/generated/client-optimized/app.js`;

					/**
					 * @param {string | undefined} file
					 */
					function add_input(file) {
						if (!file) return;

						const resolved = path.resolve(file);
						const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));

						const name = relative.startsWith('..')
							? path.basename(file).replace(/^\+/, '')
							: relative.replace(/(\\|\/)\+/g, '-').replace(/[\\/]/g, '-');

						input[`entry/${name}`] = resolved;
					}

					for (const node of manifest_data.nodes) {
						add_input(node.component);
						add_input(node.universal);
					}
				}

				// see the kit.output.preloadStrategy option for details on why we have multiple options here
				const ext = kit.output.preloadStrategy === 'preload-mjs' ? 'mjs' : 'js';

				new_config = {
					base: ssr ? assets_base(kit) : './',
					build: {
						cssCodeSplit: true,
						outDir: `${out}/${ssr ? 'server' : 'client'}`,
						rollupOptions: {
							input,
							output: {
								format: 'esm',
								entryFileNames: ssr ? '[name].js' : `${prefix}/[name].[hash].${ext}`,
								chunkFileNames: ssr ? 'chunks/[name].js' : `${prefix}/chunks/[name].[hash].${ext}`,
								assetFileNames: `${prefix}/assets/[name].[hash][extname]`,
								hoistTransitiveImports: false
							},
							preserveEntrySignatures: 'strict'
						},
						ssrEmitAssets: true,
						target: ssr ? 'node16.14' : undefined,
						// don't use the default name to avoid collisions with 'static/manifest.json'
						manifest: 'vite-manifest.json'
					},
					publicDir: ssr ? false : kit.files.assets,
					worker: {
						rollupOptions: {
							output: {
								entryFileNames: `${prefix}/workers/[name]-[hash].js`,
								chunkFileNames: `${prefix}/workers/chunks/[name]-[hash].js`,
								assetFileNames: `${prefix}/workers/assets/[name]-[hash][extname]`,
								hoistTransitiveImports: false
							}
						}
					}
				};
			} else {
				new_config = {
					appType: 'custom',
					base: kit.paths.base,
					build: {
						rollupOptions: {
							// Vite dependency crawler needs an explicit JS entry point
							// eventhough server otherwise works without it
							input: `${runtime_directory}/client/start.js`
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
			return await dev(vite, vite_config, svelte_config);
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
				const server_manifest = JSON.parse(read(`${out}/server/${vite_config.build.manifest}`));

				/** @type {import('types').BuildData} */
				const build_data = {
					app_dir: kit.appDir,
					app_path: `${kit.paths.base.slice(1)}${kit.paths.base ? '/' : ''}${kit.appDir}`,
					manifest_data,
					service_worker: !!service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
					client: null,
					server_manifest
				};

				const manifest_path = `${out}/server/manifest-full.js`;
				fs.writeFileSync(
					manifest_path,
					`export const manifest = ${generate_manifest({
						build_data,
						relative_path: '.',
						routes: manifest_data.routes
					})};\n`
				);

				// first, build server nodes without the client manifest so we can analyse it
				log.info('Analysing routes');

				build_server_nodes(out, kit, manifest_data, server_manifest, null, null);

				const metadata = await analyse({
					manifest_path,
					env: { ...env.private, ...env.public }
				});

				log.info('Building app');

				// create client build
				write_client_manifest(
					kit,
					manifest_data,
					`${kit.outDir}/generated/client-optimized`,
					metadata.nodes
				);

				secondary_build_started = true;

				const { output } = /** @type {import('rollup').RollupOutput} */ (
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

				/** @type {import('vite').Manifest} */
				const client_manifest = JSON.parse(read(`${out}/client/${vite_config.build.manifest}`));

				build_data.client = {
					start: find_deps(
						client_manifest,
						posixify(path.relative('.', `${runtime_directory}/client/start.js`)),
						false
					),
					app: find_deps(
						client_manifest,
						posixify(path.relative('.', `${kit.outDir}/generated/client-optimized/app.js`)),
						false
					)
				};

				const css = output.filter(
					/** @type {(value: any) => value is import('rollup').OutputAsset} */
					(value) => value.type === 'asset' && value.fileName.endsWith('.css')
				);

				// regenerate manifest now that we have client entry...
				fs.writeFileSync(
					manifest_path,
					`export const manifest = ${generate_manifest({
						build_data,
						relative_path: '.',
						routes: manifest_data.routes
					})};\n`
				);

				// regenerate nodes with the client manifest...
				build_server_nodes(out, kit, manifest_data, server_manifest, client_manifest, css);

				// ...and prerender
				const { prerendered, prerender_map } = await prerender({
					out,
					manifest_path,
					metadata,
					verbose,
					env: { ...env.private, ...env.public }
				});

				// generate a new manifest that doesn't include prerendered pages
				fs.writeFileSync(
					`${out}/server/manifest.js`,
					`export const manifest = ${generate_manifest({
						build_data,
						relative_path: '.',
						routes: manifest_data.routes.filter((route) => prerender_map.get(route.id) !== true)
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
						vite_config,
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
						`\nRun ${colors
							.bold()
							.cyan('npm run preview')} to preview your production build locally.`
					);

					// avoid making the manifest available to users
					fs.unlinkSync(`${out}/client/${vite_config.build.manifest}`);
					fs.unlinkSync(`${out}/server/${vite_config.build.manifest}`);

					if (kit.adapter) {
						const { adapt } = await import('../../core/adapt/index.js');
						await adapt(svelte_config, build_data, metadata, prerendered, prerender_map, log);
					} else {
						console.log(colors.bold().yellow('\nNo adapter specified'));

						const link = colors.bold().cyan('https://kit.svelte.dev/docs/adapters');
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

	return [plugin_setup, plugin_virtual_modules, plugin_guard, plugin_compile];
}

/**
 * @param {Record<string, any>} config
 * @param {Record<string, any>} resolved_config
 */
function warn_overridden_config(config, resolved_config) {
	const overridden = find_overridden_config(config, resolved_config, enforced_config, '', []);

	if (overridden.length > 0) {
		console.error(
			colors.bold().red('The following Vite config options will be overridden by SvelteKit:') +
				overridden.map((key) => `\n  - ${key}`).join('')
		);
	}
}

/**
 * @param {Record<string, any>} config
 * @param {Record<string, any>} resolved_config
 * @param {import('./types').EnforcedConfig} enforced_config
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
