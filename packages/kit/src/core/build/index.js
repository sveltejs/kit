import fs from 'fs';
import path from 'path';
import { rimraf } from '../../utils/filesystem.js';
import create_manifest_data from '../../core/create_manifest_data/index.js';
import { copy_assets, get_svelte_packages, posixify, resolve_entry } from '../utils.js';
import { deep_merge, print_config_conflicts } from '../config/index.js';
import { create_app } from '../../core/create_app/index.js';
import vite from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import glob from 'tiny-glob/sync.js';
import { SVELTE_KIT } from '../constants.js';

/** @param {any} value */
const s = (value) => JSON.stringify(value);

/** @typedef {Record<string, {
 *   file: string;
 *   css: string[];
 *   imports: string[];
 * }>} ClientManifest */

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {{
 *   cwd?: string;
 *   runtime?: string;
 * }} [opts]
 * @returns {Promise<import('types/internal').BuildData>}
 */
export async function build(config, { cwd = process.cwd(), runtime = '@sveltejs/kit/ssr' } = {}) {
	const build_dir = path.resolve(cwd, `${SVELTE_KIT}/build`);

	rimraf(build_dir);

	const output_dir = path.resolve(cwd, `${SVELTE_KIT}/output`);
	const svelte_packages = get_svelte_packages(cwd);

	const options = {
		cwd,
		config,
		build_dir,
		// TODO this is so that Vite's preloading works. Unfortunately, it fails
		// during `svelte-kit preview`, because we use a local asset path. If Vite
		// used relative paths, I _think_ this could get fixed. Issue here:
		// https://github.com/vitejs/vite/issues/2009
		assets_base: `${config.kit.paths.assets || config.kit.paths.base}/${config.kit.appDir}/`,
		manifest: create_manifest_data({
			config,
			output: build_dir,
			cwd
		}),
		output_dir,
		client_entry_file: `${SVELTE_KIT}/build/runtime/internal/start.js`,
		service_worker_register:
			config.kit.serviceWorker.register === undefined ? true : config.kit.serviceWorker.register,
		service_worker_scope: config.kit.serviceWorker.scope || '/',
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker),
		svelte_packages
	};

	const client_manifest = await build_client(options);
	await build_server(options, client_manifest, runtime);

	if (options.service_worker_entry_file) {
		if (config.kit.paths.assets) {
			throw new Error('Cannot use service worker alongside config.kit.paths.assets');
		}

		await build_service_worker(options, client_manifest);
	}

	const client = glob('**', { cwd: `${output_dir}/client`, filesOnly: true }).map(posixify);
	const server = glob('**', { cwd: `${output_dir}/server`, filesOnly: true }).map(posixify);

	return {
		client,
		server,
		static: options.manifest.assets.map((asset) => posixify(asset.file)),
		entries: options.manifest.routes
			.map((route) => (route.type === 'page' ? route.path : ''))
			.filter(Boolean)
	};
}

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string | null;
 * }} options
 */
async function build_client({
	cwd,
	assets_base,
	config,
	manifest,
	build_dir,
	output_dir,
	client_entry_file,
	service_worker_entry_file
}) {
	create_app({
		manifest_data: manifest,
		output: build_dir,
		cwd
	});

	copy_assets(build_dir);

	process.env.VITE_SVELTEKIT_AMP = config.kit.amp ? 'true' : '';

	const client_out_dir = `${output_dir}/client/${config.kit.appDir}`;
	const client_manifest_file = `${client_out_dir}/manifest.json`;

	/** @type {Record<string, string>} */
	const input = {
		start: path.resolve(cwd, client_entry_file)
	};

	// This step is optional — Vite/Rollup will create the necessary chunks
	// for everything regardless — but it means that entry chunks reflect
	// their location in the source code, which is helpful for debugging
	manifest.components.forEach((file) => {
		const resolved = path.resolve(cwd, file);
		const relative = path.relative(config.kit.files.routes, resolved);

		const name = relative.startsWith('..')
			? path.basename(file)
			: posixify(path.join('pages', relative));
		input[name] = resolved;
	});

	/** @type {any} */
	const vite_config = config.kit.vite();

	const default_config = {
		server: {
			fs: {
				strict: true
			}
		}
	};

	// don't warn on overriding defaults
	const [modified_vite_config] = deep_merge(default_config, vite_config);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(modified_vite_config, {
		configFile: false,
		root: cwd,
		base: assets_base,
		build: {
			cssCodeSplit: true,
			manifest: true,
			outDir: client_out_dir,
			polyfillDynamicImport: false,
			rollupOptions: {
				input,
				output: {
					entryFileNames: '[name]-[hash].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]'
				},
				preserveEntrySignatures: 'strict'
			}
		},
		resolve: {
			alias: {
				$app: path.resolve(`${build_dir}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		plugins: [
			svelte({
				extensions: config.extensions,
				emitCss: !config.kit.amp,
				compilerOptions: {
					hydratable: !!config.kit.hydrate
				}
			})
		]
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_client');

	await vite.build(merged_config);

	/** @type {ClientManifest} */
	const client_manifest = JSON.parse(fs.readFileSync(client_manifest_file, 'utf-8'));
	fs.renameSync(client_manifest_file, `${output_dir}/manifest.json`); // inspectable but not shipped

	return client_manifest;
}

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_register: boolean;
 *   service_worker_scope: string;
 *   service_worker_entry_file: string | null;
 *   svelte_packages: string[];
 * }} options
 * @param {ClientManifest} client_manifest
 * @param {string} runtime
 */
async function build_server(
	{
		cwd,
		assets_base,
		config,
		manifest,
		build_dir,
		output_dir,
		client_entry_file,
		service_worker_register,
		service_worker_scope,
		service_worker_entry_file,
		svelte_packages
	},
	client_manifest,
	runtime
) {
	let hooks_file = resolve_entry(config.kit.files.hooks);
	if (!hooks_file || !fs.existsSync(hooks_file)) {
		hooks_file = path.resolve(cwd, `${SVELTE_KIT}/build/hooks.js`);
		fs.writeFileSync(hooks_file, '');
	}

	const app_file = `${build_dir}/app.js`;

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = path.relative(build_dir, path.resolve(cwd, file));
		return relative_file[0] === '.' ? relative_file : `./${relative_file}`;
	};

	const prefix = `/${config.kit.appDir}/`;

	/**
	 * @param {string} file
	 * @param {Set<string>} js_deps
	 * @param {Set<string>} css_deps
	 */
	function find_deps(file, js_deps, css_deps) {
		const chunk = client_manifest[file];

		if (js_deps.has(chunk.file)) return;
		js_deps.add(chunk.file);

		if (chunk.css) {
			chunk.css.forEach((file) => css_deps.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => find_deps(file, js_deps, css_deps));
		}
	}

	/** @type {Record<string, { entry: string, css: string[], js: string[], styles: string[] }>} */
	const metadata_lookup = {};

	manifest.components.forEach((file) => {
		const js_deps = new Set();
		const css_deps = new Set();

		find_deps(file, js_deps, css_deps);

		const js = Array.from(js_deps);
		const css = Array.from(css_deps);

		const styles = config.kit.amp
			? Array.from(css_deps).map((url) => {
					const resolved = `${output_dir}/client/${config.kit.appDir}/${url}`;
					return fs.readFileSync(resolved, 'utf-8');
			  })
			: [];

		metadata_lookup[file] = {
			entry: client_manifest[file].file,
			css,
			js,
			styles
		};
	});

	/** @type {Set<string>} */
	const entry_js = new Set();
	/** @type {Set<string>} */
	const entry_css = new Set();

	find_deps(client_entry_file, entry_js, entry_css);

	// prettier-ignore
	fs.writeFileSync(
		app_file,
		`
			import { respond } from '${runtime}';
			import root from './generated/root.svelte';
			import { set_paths, assets } from './runtime/paths.js';
			import { set_prerendering } from './runtime/env.js';
			import * as user_hooks from ${s(app_relative(hooks_file))};

			const template = ({ head, body }) => ${s(fs.readFileSync(config.kit.files.template, 'utf-8'))
				.replace('%svelte.head%', '" + head + "')
				.replace('%svelte.body%', '" + body + "')};

			let options = null;

			const default_settings = { paths: ${s(config.kit.paths)} };

			// allow paths to be overridden in svelte-kit preview
			// and in prerendering
			export function init(settings = default_settings) {
				set_paths(settings.paths);
				set_prerendering(settings.prerendering || false);

				const hooks = get_hooks(user_hooks);

				options = {
					amp: ${config.kit.amp},
					dev: false,
					entry: {
						file: assets + ${s(prefix + client_manifest[client_entry_file].file)},
						css: [${Array.from(entry_css).map(dep => 'assets + ' + s(prefix + dep))}],
						js: [${Array.from(entry_js).map(dep => 'assets + ' + s(prefix + dep))}]
					},
					fetched: undefined,
					floc: ${config.kit.floc},
					get_component_path: id => assets + ${s(prefix)} + entry_lookup[id],
					get_stack: error => String(error), // for security
					handle_error: (error, request) => {
						hooks.handleError({ error, request });
						error.stack = options.get_stack(error);
					},
					hooks,
					hydrate: ${s(config.kit.hydrate)},
					initiator: undefined,
					load_component,
					manifest,
					paths: settings.paths,
					prerender: ${config.kit.prerender.enabled},
					read: settings.read,
					root,
					service_worker_register: ${service_worker_register},
					service_worker_scope: ${service_worker_scope ? `'${service_worker_scope}'` : '/'},
					service_worker: ${service_worker_entry_file ? "'/service-worker.js'" : 'null'},
					router: ${s(config.kit.router)},
					ssr: ${s(config.kit.ssr)},
					target: ${s(config.kit.target)},
					template,
					trailing_slash: ${s(config.kit.trailingSlash)}
				};
			}

			const d = decodeURIComponent;
			const empty = () => ({});

			const manifest = {
				assets: ${s(manifest.assets)},
				layout: ${s(manifest.layout)},
				error: ${s(manifest.error)},
				routes: [
					${manifest.routes
				.map((route) => {
					if (route.type === 'page') {
						const params = get_params(route.params);

						return `{
									type: 'page',
									pattern: ${route.pattern},
									params: ${params},
									a: [${route.a.map(file => file && s(file)).join(', ')}],
									b: [${route.b.map(file => file && s(file)).join(', ')}]
								}`;
					} else {
						const params = get_params(route.params);
						const load = `() => import(${s(app_relative(route.file))})`;

						return `{
									type: 'endpoint',
									pattern: ${route.pattern},
									params: ${params},
									load: ${load}
								}`;
					}
				})
				.join(',\n\t\t\t\t\t')}
				]
			};

			// this looks redundant, but the indirection allows us to access
			// named imports without triggering Rollup's missing import detection
			const get_hooks = hooks => ({
				getSession: hooks.getSession || (() => ({})),
				handle: hooks.handle || (({ request, resolve }) => resolve(request)),
				handleError: hooks.handleError || (({ error }) => console.error(error.stack)),
				externalFetch: hooks.externalFetch || fetch
			});

			const module_lookup = {
				${manifest.components.map(file => `${s(file)}: () => import(${s(app_relative(file))})`)}
			};

			const metadata_lookup = ${s(metadata_lookup)};

			async function load_component(file) {
				const { entry, css, js, styles } = metadata_lookup[file];
				return {
					module: await module_lookup[file](),
					entry: assets + ${s(prefix)} + entry,
					css: css.map(dep => assets + ${s(prefix)} + dep),
					js: js.map(dep => assets + ${s(prefix)} + dep),
					styles
				};
			}

			export function render(request, {
				prerender
			} = {}) {
				const host = ${config.kit.host ? s(config.kit.host) : `request.headers[${s(config.kit.hostHeader || 'host')}]`};
				return respond({ ...request, host }, options, { prerender });
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	/** @type {import('vite').UserConfig} */
	const vite_config = config.kit.vite();

	const default_config = {
		server: {
			fs: {
				strict: true
			}
		}
	};

	// don't warn on overriding defaults
	const [modified_vite_config] = deep_merge(default_config, vite_config);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(modified_vite_config, {
		configFile: false,
		root: cwd,
		base: assets_base,
		build: {
			target: 'es2018',
			ssr: true,
			outDir: `${output_dir}/server`,
			polyfillDynamicImport: false,
			rollupOptions: {
				input: {
					app: app_file
				},
				output: {
					format: 'esm',
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]',
					inlineDynamicImports: true
				},
				preserveEntrySignatures: 'strict'
			}
		},
		optimizeDeps: {
			// exclude Svelte packages because optimizer skips .svelte files leading to half-bundled
			// broken packages https://github.com/vitejs/vite/issues/3910
			exclude: [
				...((vite_config.optimizeDeps && vite_config.optimizeDeps.exclude) || []),
				...svelte_packages
			]
		},
		plugins: [
			svelte({
				extensions: config.extensions,
				compilerOptions: {
					hydratable: !!config.kit.hydrate
				}
			})
		],
		resolve: {
			alias: {
				$app: path.resolve(`${build_dir}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		ssr: {
			// note to self: this _might_ need to be ['svelte', '@sveltejs/kit', ...get_no_external()]
			// but I'm honestly not sure. roll with this for now and see if it's ok
			// @ts-expect-error - ssr is considered in alpha, so not yet exposed by Vite
			noExternal: [...((vite_config.ssr && vite_config.ssr.noExternal) || []), ...svelte_packages]
		}
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_server');

	await vite.build(merged_config);
}

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string | null;
 *   svelte_packages: string[];
 * }} options
 * @param {ClientManifest} client_manifest
 */
async function build_service_worker(
	{
		cwd,
		assets_base,
		config,
		manifest,
		build_dir,
		output_dir,
		service_worker_entry_file,
		svelte_packages
	},
	client_manifest
) {
	// TODO add any assets referenced in template .html file, e.g. favicon?
	const app_files = new Set();
	for (const key in client_manifest) {
		const { file, css } = client_manifest[key];
		app_files.add(file);
		if (css) {
			css.forEach((file) => {
				app_files.add(file);
			});
		}
	}

	fs.writeFileSync(
		`${build_dir}/runtime/service-worker.js`,
		`
			export const timestamp = ${Date.now()};

			export const build = [
				${Array.from(app_files)
					.map((file) => `${s(`${config.kit.paths.base}/${config.kit.appDir}/${file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const files = [
				${manifest.assets
					.map((asset) => `${s(`${config.kit.paths.base}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	/** @type {any} */
	const vite_config = config.kit.vite();

	const default_config = {
		server: {
			fs: {
				strict: true
			}
		}
	};

	// don't warn on overriding defaults
	const [modified_vite_config] = deep_merge(default_config, vite_config);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(modified_vite_config, {
		configFile: false,
		root: cwd,
		base: assets_base,
		build: {
			lib: {
				entry: service_worker_entry_file,
				name: 'app',
				formats: ['es']
			},
			rollupOptions: {
				output: {
					entryFileNames: 'service-worker.js'
				}
			},
			outDir: `${output_dir}/client`,
			emptyOutDir: false
		},
		optimizeDeps: {
			entries: [],
			// exclude Svelte packages because optimizer skips .svelte files leading to half-bundled
			// broken packages https://github.com/vitejs/vite/issues/3910
			exclude: [
				...((vite_config.optimizeDeps && vite_config.optimizeDeps.exclude) || []),
				...svelte_packages
			]
		},
		resolve: {
			alias: {
				'$service-worker': path.resolve(`${build_dir}/runtime/service-worker`)
			}
		}
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_service_worker');

	await vite.build(merged_config);
}

/** @param {string[]} array */
function get_params(array) {
	// given an array of params like `['x', 'y', 'z']` for
	// src/routes/[x]/[y]/[z]/svelte, create a function
	// that turns a RexExpMatchArray into ({ x, y, z })
	return array.length
		? '(m) => ({ ' +
				array
					.map((param, i) => {
						return param.startsWith('...')
							? `${param.slice(3)}: d(m[${i + 1}] || '')`
							: `${param}: d(m[${i + 1}])`;
					})
					.join(', ') +
				'})'
		: 'empty';
}
