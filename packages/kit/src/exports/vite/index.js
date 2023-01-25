import { fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import colors from 'kleur';
import * as vite from 'vite';

import { mkdirp, posixify, resolve_entry, rimraf } from '../../utils/filesystem.js';
import { create_static_module, create_dynamic_module } from '../../core/env.js';
import * as sync from '../../core/sync/sync.js';
import { create_assets } from '../../core/sync/create_manifest_data/index.js';
import { runtime_directory, logger } from '../../core/utils.js';
import { load_config } from '../../core/config/index.js';
import { generate_manifest } from '../../core/generate_manifest/index.js';
import { build_server } from './build/build_server.js';
import { build_service_worker } from './build/build_service_worker.js';
import { assets_base, find_deps } from './build/utils.js';
import { dev } from './dev/index.js';
import { is_illegal, module_guard, normalize_id } from './graph_analysis/index.js';
import { preview } from './preview/index.js';
import { get_config_aliases, get_env } from './utils.js';

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

	let completed_build = false;

	/** @type {import('vite').Plugin} */
	const plugin_setup = {
		name: 'vite-plugin-sveltekit-setup',

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		async config(config, config_env) {
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

			// dev and preview config can be shared
			/** @type {import('vite').UserConfig} */
			const new_config = {
				resolve: {
					alias: [
						{ find: '__GENERATED__', replacement: path.posix.join(kit.outDir, 'generated') },
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
					}
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

			if (is_build) {
				new_config.define = {
					__SVELTEKIT_ADAPTER_NAME__: JSON.stringify(kit.adapter?.name),
					__SVELTEKIT_APP_VERSION_FILE__: JSON.stringify(`${kit.appDir}/version.json`),
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: JSON.stringify(kit.version.pollInterval),
					__SVELTEKIT_DEV__: 'false',
					__SVELTEKIT_EMBEDDED__: kit.embedded ? 'true' : 'false'
				};

				new_config.ssr = {
					noExternal: [
						// TODO document why this is necessary
						'@sveltejs/kit',
						// This ensures that esm-env is inlined into the server output with the
						// export conditions resolved correctly through Vite. This prevents adapters
						// that bundle later on to resolve the export conditions incorrectly
						// and for example include browser-only code in the server output
						// because they for example use esbuild.build with `platform: 'browser'`
						'esm-env'
					]
				};
			} else {
				new_config.define = {
					__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: '0',
					__SVELTEKIT_DEV__: 'true',
					__SVELTEKIT_EMBEDDED__: kit.embedded ? 'true' : 'false'
				};

				new_config.ssr = {
					// Without this, Vite will treat `@sveltejs/kit` as noExternal if it's
					// a linked dependency, and that causes modules to be imported twice
					// under different IDs, which breaks a bunch of stuff
					// https://github.com/vitejs/vite/pull/9296
					external: ['@sveltejs/kit', 'cookie', 'set-cookie-parser']
				};
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
			if (id.startsWith('$env/') || id === '$service-worker') return `\0${id}`;
		},

		async load(id, options) {
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
					return create_dynamic_module(
						'public',
						vite_config_env.command === 'serve' ? env.public : undefined
					);
				case '\0$service-worker':
					return create_service_worker_module(svelte_config);
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
		async config(config, config_env) {
			/** @type {import('vite').UserConfig} */
			let new_config;

			if (is_build) {
				manifest_data = (await sync.all(svelte_config, config_env.mode)).manifest_data;

				const ssr = config.build?.ssr ?? false;
				const prefix = `${kit.appDir}/immutable`;

				/** @type {Record<string, string>} */
				const input = {};

				if (ssr) {
					input.index = `${runtime_directory}/server/index.js`;
					input.internal = `${kit.outDir}/generated/server-internal.js`;

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
					/** @type {Record<string, string>} */
					input.start = `${runtime_directory}/client/start.js`;

					manifest_data.nodes.forEach((node) => {
						if (node.component) {
							const resolved = path.resolve(node.component);
							const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));

							const name = relative.startsWith('..')
								? path.basename(node.component)
								: posixify(path.join('pages', relative));
							input[`components/${name}`] = resolved;
						}

						if (node.universal) {
							const resolved = path.resolve(node.universal);
							const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));

							const name = relative.startsWith('..')
								? path.basename(node.universal)
								: posixify(path.join('pages', relative));
							input[`modules/${name}`] = resolved;
						}
					});
				}

				new_config = {
					base: ssr ? assets_base(kit) : './',
					build: {
						cssCodeSplit: true,
						outDir: `${out}/${ssr ? 'server' : 'client'}`,
						rollupOptions: {
							input,
							output: {
								format: 'esm',
								entryFileNames: ssr ? '[name].js' : `${prefix}/[name]-[hash].js`,
								chunkFileNames: ssr ? 'chunks/[name].js' : `${prefix}/chunks/[name]-[hash].js`,
								assetFileNames: `${prefix}/assets/[name]-[hash][extname]`,
								hoistTransitiveImports: false
							},
							preserveEntrySignatures: 'strict'
						},
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
			if (vite_config.build.ssr) return;

			// Reset for new build. Goes here because `build --watch` calls buildStart but not config
			completed_build = false;

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
				source: JSON.stringify({ version: kit.version.name })
			});
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
					lib: vite.normalizePath(kit.files.lib)
				});

				manifest_data.nodes.forEach((_node, i) => {
					const id = vite.normalizePath(path.resolve(kit.outDir, `generated/nodes/${i}.js`));

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
					config: svelte_config,
					vite_config,
					vite_config_env,
					manifest_data,
					output_dir: out
				};

				/** @type {import('vite').Manifest} */
				const vite_manifest = JSON.parse(
					fs.readFileSync(`${out}/client/${vite_config.build.manifest}`, 'utf-8')
				);

				const client = {
					assets,
					chunks,
					entry: find_deps(
						vite_manifest,
						posixify(path.relative('.', `${runtime_directory}/client/start.js`)),
						false
					),
					vite_manifest
				};

				const server = await build_server(options, client);

				const service_worker_entry_file = resolve_entry(kit.files.serviceWorker);

				/** @type {import('types').BuildData} */
				build_data = {
					app_dir: kit.appDir,
					app_path: `${kit.paths.base.slice(1)}${kit.paths.base ? '/' : ''}${kit.appDir}`,
					manifest_data,
					service_worker: !!service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
					client,
					server
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

				log.info('Prerendering');
				await new Promise((fulfil, reject) => {
					const results_path = `${kit.outDir}/generated/prerendered.json`;

					// do prerendering in a subprocess so any dangling stuff gets killed upon completion
					const script = fileURLToPath(new URL('../../core/postbuild/index.js', import.meta.url));

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
						options,
						service_worker_entry_file,
						prerendered,
						client.vite_manifest
					);
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

				if (kit.adapter) {
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
				fs.unlinkSync(`${out}/client/${vite_config.build.manifest}`);
				fs.unlinkSync(`${out}/server/${vite_config.build.manifest}`);
			}
		}
	};

	return [plugin_setup, plugin_virtual_modules, plugin_compile];
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
