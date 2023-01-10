import { fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import colors from 'kleur';
import * as vite from 'vite';

import { mkdirp, posixify, resolve_entry, rimraf } from '../../utils/filesystem.js';
import { SVELTE_KIT_ASSETS } from '../../constants.js';
import { create_static_module, create_dynamic_module } from '../../core/env.js';
import * as sync from '../../core/sync/sync.js';
import { create_assets } from '../../core/sync/create_manifest_data/index.js';
import { runtime_base, runtime_directory, runtime_prefix, logger } from '../../core/utils.js';
import { load_config } from '../../core/config/index.js';
import { generate_manifest } from '../../core/generate_manifest/index.js';
import { build_server } from './build/build_server.js';
import { build_service_worker } from './build/build_service_worker.js';
import { find_deps, get_build_setup_config, get_build_compile_config } from './build/utils.js';
import { dev } from './dev/index.js';
import { is_illegal, module_guard, normalize_id } from './graph_analysis/index.js';
import { preview } from './preview/index.js';
import { get_config_aliases, get_app_aliases, get_env } from './utils.js';

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

/** @return {Promise<import('vite').Plugin[]>} */
export async function sveltekit() {
	const svelte_config = await load_config();

	/** @type {import('@sveltejs/vite-plugin-svelte').Options} */
	const vite_plugin_svelte_options = {
		configFile: false,
		extensions: svelte_config.extensions,
		preprocess: svelte_config.preprocess,
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
	/** @type {import('vite').ResolvedConfig} */
	let vite_config;

	/** @type {import('vite').ConfigEnv} */
	let vite_config_env;

	/** @type {import('types').ManifestData} */
	let manifest_data;

	/** @type {boolean} */
	let is_build;

	/** @type {import('types').Logger} */
	let log;

	/** @type {import('types').Prerendered} */
	let prerendered;

	/** @type {import('types').PrerenderMap} */
	let prerender_map;

	/** @type {import('types').BuildData} */
	let build_data;

	/** @type {{ public: Record<string, string>; private: Record<string, string> }} */
	let env;

	/**
	 * @type {{
	 *   build_dir: string;
	 *   output_dir: string;
	 *   client_out_dir: string;
	 * }}
	 */
	let paths;

	let completed_build = false;

	function vite_client_build_config() {
		/** @type {Record<string, string>} */
		const input = {
			// Put unchanging assets in immutable directory. We don't set that in the
			// outDir so that other plugins can add mutable assets to the bundle
			start: `${runtime_directory}/client/start.js`
		};

		manifest_data.nodes.forEach((node) => {
			if (node.component) {
				const resolved = path.resolve(cwd, node.component);
				const relative = decodeURIComponent(
					path.relative(svelte_config.kit.files.routes, resolved)
				);

				const name = relative.startsWith('..')
					? path.basename(node.component)
					: posixify(path.join('pages', relative));
				input[`components/${name}`] = resolved;
			}

			if (node.universal) {
				const resolved = path.resolve(cwd, node.universal);
				const relative = decodeURIComponent(
					path.relative(svelte_config.kit.files.routes, resolved)
				);

				const name = relative.startsWith('..')
					? path.basename(node.universal)
					: posixify(path.join('pages', relative));
				input[`modules/${name}`] = resolved;
			}
		});

		return get_build_compile_config({
			config: svelte_config,
			input,
			ssr: false,
			outDir: `${paths.client_out_dir}`
		});
	}

	/**
	 * @param {import('rollup').OutputAsset[]} assets
	 * @param {import('rollup').OutputChunk[]} chunks
	 */
	function client_build_info(assets, chunks) {
		/** @type {import('vite').Manifest} */
		const vite_manifest = JSON.parse(
			fs.readFileSync(`${paths.client_out_dir}/${vite_config.build.manifest}`, 'utf-8')
		);

		const entry_id = posixify(path.relative(cwd, `${runtime_directory}/client/start.js`));

		return {
			assets,
			chunks,
			entry: find_deps(vite_manifest, entry_id, false),
			vite_manifest
		};
	}

	/** @type {import('vite').Plugin} */
	const plugin_setup = {
		name: 'vite-plugin-sveltekit-setup',

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		async config(config, config_env) {
			vite_config_env = config_env;

			env = get_env(svelte_config.kit.env, vite_config_env.mode);

			// The config is created in build_server for SSR mode and passed inline
			if (config.build?.ssr) return;

			is_build = config_env.command === 'build';

			paths = {
				build_dir: `${svelte_config.kit.outDir}/build`,
				output_dir: `${svelte_config.kit.outDir}/output`,
				client_out_dir: `${svelte_config.kit.outDir}/output/client`
			};

			if (is_build) {
				manifest_data = (await sync.all(svelte_config, config_env.mode)).manifest_data;

				const new_config = get_build_setup_config({ config: svelte_config, ssr: false });

				const warning = warn_overridden_config(config, new_config);
				if (warning) console.error(warning + '\n');

				return new_config;
			}

			const allow = new Set([
				svelte_config.kit.files.lib,
				svelte_config.kit.files.routes,
				svelte_config.kit.outDir,
				path.resolve(cwd, 'src'), // TODO this isn't correct if user changed all his files to sth else than src (like in test/options)
				path.resolve(cwd, 'node_modules'),
				path.resolve(vite.searchForWorkspaceRoot(cwd), 'node_modules')
			]);
			// We can only add directories to the allow list, so we find out
			// if there's a client hooks file and pass its directory
			const client_hooks = resolve_entry(svelte_config.kit.files.hooks.client);
			if (client_hooks) {
				allow.add(path.dirname(client_hooks));
			}

			// dev and preview config can be shared
			/** @type {import('vite').UserConfig} */
			const result = {
				define: {
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: '0',
					__SVELTEKIT_EMBEDDED__: svelte_config.kit.embedded ? 'true' : 'false'
				},
				resolve: {
					alias: [...get_app_aliases(svelte_config.kit), ...get_config_aliases(svelte_config.kit)]
				},
				root: cwd,
				server: {
					fs: {
						allow: [...allow]
					},
					watch: {
						ignored: [
							// Ignore all siblings of config.kit.outDir/generated
							`${posixify(svelte_config.kit.outDir)}/!(generated)`
						]
					}
				},
				ssr: {
					// Without this, Vite will treat `@sveltejs/kit` as noExternal if it's
					// a linked dependency, and that causes modules to be imported twice
					// under different IDs, which breaks a bunch of stuff
					// https://github.com/vitejs/vite/pull/9296
					external: ['@sveltejs/kit']
				},
				optimizeDeps: {
					exclude: [
						'@sveltejs/kit',
						// exclude kit features so that libraries using them work even when they are prebundled
						// this does not affect app code, just handling of imported libraries that use $app or $env
						'$app',
						'$env'
					]
				}
			};

			const warning = warn_overridden_config(config, result);
			if (warning) console.error(warning);

			return result;
		},

		async resolveId(id) {
			// treat $env/static/[public|private] as virtual
			if (id.startsWith('$env/') || id === '$service-worker') return `\0${id}`;
		},

		async load(id, options) {
			if (options?.ssr === false && process.env.TEST !== 'true') {
				const normalized_cwd = vite.normalizePath(cwd);
				const normalized_lib = vite.normalizePath(svelte_config.kit.files.lib);
				if (
					is_illegal(id, {
						cwd: normalized_cwd,
						node_modules: vite.normalizePath(path.join(cwd, 'node_modules')),
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
					return create_dynamic_module(
						'public',
						vite_config_env.command === 'serve' ? env.public : undefined
					);
				case '\0$service-worker':
					return create_service_worker_module(svelte_config);
			}
		},

		/**
		 * Stores the final config.
		 */
		configResolved(config) {
			vite_config = config;

			// This is a hack to prevent Vite from nuking useful logs,
			// pending https://github.com/vitejs/vite/issues/9378
			config.logger.warn('');
		},

		/**
		 * Clears the output directories.
		 */
		buildStart() {
			if (vite_config.build.ssr) return;

			// Reset for new build. Goes here because `build --watch` calls buildStart but not config
			completed_build = false;

			if (is_build) {
				if (!vite_config.build.watch) {
					rimraf(paths.build_dir);
					rimraf(paths.output_dir);
				}
				mkdirp(paths.build_dir);
				mkdirp(paths.output_dir);
			}
		},

		generateBundle() {
			if (vite_config.build.ssr) return;

			this.emitFile({
				type: 'asset',
				fileName: `${svelte_config.kit.appDir}/version.json`,
				source: JSON.stringify({ version: svelte_config.kit.version.name })
			});
		},

		/**
		 * @see https://vitejs.dev/guide/api-plugin.html#configureserver
		 */
		async configureServer(vite) {
			// set `import { version } from '$app/environment'`
			(await vite.ssrLoadModule(`${runtime_prefix}/env.js`)).set_version(
				svelte_config.kit.version.name
			);

			// set `import { base, assets } from '$app/paths'`
			const { base, assets } = svelte_config.kit.paths;

			(await vite.ssrLoadModule(`${runtime_base}/paths.js`)).set_paths({
				base,
				assets: assets ? SVELTE_KIT_ASSETS : base
			});
		}
	};

	/** @type {import('vite').Plugin} */
	const plugin_compile = {
		name: 'vite-plugin-sveltekit-compile',

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		async config(config, config_env) {
			// The config is created in build_server for SSR mode and passed inline
			if (config.build?.ssr) return;

			if (config_env.command === 'build') {
				const new_config = vite_client_build_config();

				const warning = warn_overridden_config(config, new_config);
				if (warning) console.error(warning + '\n');

				return new_config;
			}

			// dev and preview config can be shared
			/** @type {import('vite').UserConfig} */
			const result = {
				appType: 'custom',
				base: svelte_config.kit.paths.base,
				build: {
					rollupOptions: {
						// Vite dependency crawler needs an explicit JS entry point
						// eventhough server otherwise works without it
						input: `${runtime_directory}/client/start.js`
					}
				},
				publicDir: svelte_config.kit.files.assets
			};

			const warning = warn_overridden_config(config, result);
			if (warning) console.error(warning);

			return result;
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
		 * Vite builds a single bundle. We need three bundles: client, server, and service worker.
		 * The user's package.json scripts will invoke the Vite CLI to execute the client build. We
		 * then use this hook to kick off builds for the server and service worker.
		 */
		writeBundle: {
			sequential: true,
			async handler(_options, bundle) {
				if (vite_config.build.ssr) return;

				const guard = module_guard(this, {
					cwd: vite.normalizePath(process.cwd()),
					lib: vite.normalizePath(svelte_config.kit.files.lib)
				});

				manifest_data.nodes.forEach((_node, i) => {
					const id = vite.normalizePath(
						path.resolve(svelte_config.kit.outDir, `generated/nodes/${i}.js`)
					);

					guard.check(id);
				});

				const verbose = vite_config.logLevel === 'info';
				log = logger({
					verbose
				});

				const { assets, chunks } = collect_output(bundle);
				log.info(
					`Client build completed. Wrote ${chunks.length} chunks and ${assets.length} assets`
				);

				log.info('Building server');

				const options = {
					cwd,
					config: svelte_config,
					vite_config,
					vite_config_env,
					build_dir: paths.build_dir, // TODO just pass `paths`
					manifest_data,
					output_dir: paths.output_dir,
					service_worker_entry_file: resolve_entry(svelte_config.kit.files.serviceWorker)
				};
				const client = client_build_info(assets, chunks);
				const server = await build_server(options, client);

				/** @type {import('types').BuildData} */
				build_data = {
					app_dir: svelte_config.kit.appDir,
					app_path: `${svelte_config.kit.paths.base.slice(1)}${
						svelte_config.kit.paths.base ? '/' : ''
					}${svelte_config.kit.appDir}`,
					manifest_data,
					service_worker: options.service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
					client,
					server
				};

				const manifest_path = `${paths.output_dir}/server/manifest-full.js`;
				fs.writeFileSync(
					manifest_path,
					`export const manifest = ${generate_manifest({
						build_data,
						relative_path: '.',
						routes: manifest_data.routes
					})};\n`
				);

				log.info('Prerendering');
				await new Promise((fulfil, reject) => {
					const results_path = `${svelte_config.kit.outDir}/generated/prerendered.json`;

					// do prerendering in a subprocess so any dangling stuff gets killed upon completion
					const script = fileURLToPath(
						new URL('../../core/prerender/prerender.js', import.meta.url)
					);

					const child = fork(
						script,
						[
							vite_config.build.outDir,
							manifest_path,
							results_path,
							'' + verbose,
							JSON.stringify({ ...env.private, ...env.public })
						],
						{
							stdio: 'inherit'
						}
					);

					child.on('exit', (code) => {
						if (code) {
							reject(new Error(`Prerendering failed with code ${code}`));
						} else {
							const results = JSON.parse(fs.readFileSync(results_path, 'utf8'), (key, value) => {
								if (key === 'pages' || key === 'assets' || key === 'redirects') {
									return new Map(value);
								}
								return value;
							});

							prerendered = results.prerendered;
							prerender_map = new Map(results.prerender_map);

							fulfil(undefined);
						}
					});
				});

				// generate a new manifest that doesn't include prerendered pages
				fs.writeFileSync(
					`${paths.output_dir}/server/manifest.js`,
					`export const manifest = ${generate_manifest({
						build_data,
						relative_path: '.',
						routes: manifest_data.routes.filter((route) => prerender_map.get(route.id) !== true)
					})};\n`
				);

				if (options.service_worker_entry_file) {
					if (svelte_config.kit.paths.assets) {
						throw new Error('Cannot use service worker alongside config.kit.paths.assets');
					}

					log.info('Building service worker');

					await build_service_worker(options, prerendered, client.vite_manifest);
				}

				console.log(
					`\nRun ${colors.bold().cyan('npm run preview')} to preview your production build locally.`
				);

				completed_build = true;
			}
		},

		/**
		 * Runs the adapter.
		 */
		closeBundle: {
			sequential: true,
			async handler() {
				// vite calls closeBundle when dev-server restarts, ignore that,
				// and only adapt when build successfully completes.
				const is_restart = !completed_build;
				if (vite_config.build.ssr || is_restart) {
					return;
				}

				if (svelte_config.kit.adapter) {
					const { adapt } = await import('../../core/adapt/index.js');
					await adapt(svelte_config, build_data, prerendered, prerender_map, { log });
				} else {
					console.log(colors.bold().yellow('\nNo adapter specified'));

					const link = colors.bold().cyan('https://kit.svelte.dev/docs/adapters');
					console.log(
						`See ${link} to learn how to configure your app to run on the platform of your choosing`
					);
				}

				// avoid making the manifest available to users
				fs.unlinkSync(`${paths.output_dir}/client/${vite_config.build.manifest}`);
				fs.unlinkSync(`${paths.output_dir}/server/${vite_config.build.manifest}`);
			}
		}
	};

	return [plugin_setup, plugin_compile];
}

/** @param {import('rollup').OutputBundle} bundle */
function collect_output(bundle) {
	/** @type {import('rollup').OutputChunk[]} */
	const chunks = [];
	/** @type {import('rollup').OutputAsset[]} */
	const assets = [];
	for (const value of Object.values(bundle)) {
		// collect asset and output chunks
		if (value.type === 'asset') {
			assets.push(value);
		} else {
			chunks.push(value);
		}
	}
	return { assets, chunks };
}

/**
 * @param {Record<string, any>} config
 * @param {Record<string, any>} resolved_config
 */
function warn_overridden_config(config, resolved_config) {
	const overridden = find_overridden_config(config, resolved_config, enforced_config, '', []);

	if (overridden.length > 0) {
		return (
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
const create_service_worker_module = (config) => `
if (typeof self === 'undefined' || self instanceof ServiceWorkerGlobalScope === false) {
	throw new Error('This module can only be imported inside a service worker');
}

export const build = [];
export const files = [
	${create_assets(config)
		.filter((asset) => config.kit.serviceWorker.files(asset.file))
		.map((asset) => `${JSON.stringify(`${config.kit.paths.base}/${asset.file}`)}`)
		.join(',\n\t\t\t\t')}
];
export const prerendered = [];
export const version = ${JSON.stringify(config.kit.version.name)};
`;
