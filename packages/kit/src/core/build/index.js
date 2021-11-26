import fs from 'fs';
import path from 'path';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import glob from 'tiny-glob/sync.js';
import vite from 'vite';

import { rimraf } from '../../utils/filesystem.js';
import { deep_merge } from '../../utils/object.js';

import { print_config_conflicts } from '../config/index.js';
import { create_app } from '../create_app/index.js';
import create_manifest_data from '../create_manifest_data/index.js';
import { SVELTE_KIT } from '../constants.js';
import { copy_assets, posixify, resolve_entry } from '../utils.js';
import { create_build_data } from '../create_build_data/index.js';
import { s } from '../../utils/misc.js';

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

	const options = {
		cwd,
		config,
		build_dir,
		// TODO this is so that Vite's preloading works. Unfortunately, it fails
		// during `svelte-kit preview`, because we use a local asset path. If Vite
		// used relative paths, I _think_ this could get fixed. Issue here:
		// https://github.com/vitejs/vite/issues/2009
		assets_base: `${config.kit.paths.assets || config.kit.paths.base}/${config.kit.appDir}/`,
		manifest_data: create_manifest_data({
			config,
			output: build_dir,
			cwd
		}),
		output_dir,
		client_entry_file: `${SVELTE_KIT}/build/runtime/internal/start.js`,
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker)
	};

	const client_manifest = await build_client(options);
	const server_manifest = await build_server(options, runtime);

	const build_data = `export const build_data = ${create_build_data(
		options.manifest_data,
		options.client_entry_file,
		client_manifest,
		server_manifest
	)}`;
	fs.writeFileSync(`${output_dir}/server/preview-build-data.js`, build_data);

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
		static: options.manifest_data.assets.map((asset) => posixify(asset.file)),
		entries: options.manifest_data.routes
			.map((route) => (route.type === 'page' ? route.path : ''))
			.filter(Boolean)
	};
}

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest_data: import('types/internal').ManifestData
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
	manifest_data,
	build_dir,
	output_dir,
	client_entry_file
}) {
	create_app({
		manifest_data,
		output: build_dir,
		cwd
	});

	copy_assets(build_dir);

	process.env.VITE_SVELTEKIT_AMP = config.kit.amp ? 'true' : '';

	const client_out_dir = `${output_dir}/client/${config.kit.appDir}`;

	/** @type {Record<string, string>} */
	const input = {
		start: path.resolve(cwd, client_entry_file)
	};

	// This step is optional — Vite/Rollup will create the necessary chunks
	// for everything regardless — but it means that entry chunks reflect
	// their location in the source code, which is helpful for debugging
	manifest_data.components.forEach((file) => {
		const resolved = path.resolve(cwd, file);
		const relative = path.relative(config.kit.files.routes, resolved);

		const name = relative.startsWith('..')
			? path.basename(file)
			: posixify(path.join('pages', relative));
		input[name] = resolved;
	});

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

	/** @type {import('vite').Manifest} */
	const client_manifest = JSON.parse(fs.readFileSync(`${client_out_dir}/manifest.json`, 'utf-8'));

	return client_manifest;
}

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest_data: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   service_worker_entry_file: string | null;
 * }} options
 * @param {string} runtime
 */
async function build_server(
	{ cwd, assets_base, config, manifest_data, build_dir, output_dir, service_worker_entry_file },
	runtime
) {
	let hooks_file = resolve_entry(config.kit.files.hooks);
	if (!hooks_file || !fs.existsSync(hooks_file)) {
		hooks_file = path.resolve(cwd, `${SVELTE_KIT}/build/hooks.js`);
		fs.writeFileSync(hooks_file, '');
	}

	const app_file = `${build_dir}/app.js`; // TODO rename

	/** @type {Record<string, string>} */
	const input = {
		// TODO
		app: app_file
	};

	manifest_data.routes.forEach((route) => {
		if (route.type === 'endpoint') {
			const resolved = path.resolve(cwd, route.file);
			const relative = path.relative(config.kit.files.routes, resolved);
			const name = posixify(path.join('endpoints', relative));
			input[name] = resolved;
		}
	});

	manifest_data.components.forEach((file) => {
		const resolved = path.resolve(cwd, file);
		const relative = path.relative(config.kit.files.routes, resolved);

		const name = relative.startsWith('..')
			? posixify(path.join('components', path.basename(file)))
			: posixify(path.join('components/pages', relative));
		input[name] = resolved;
	});

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = path.relative(build_dir, path.resolve(cwd, file));
		return relative_file[0] === '.' ? relative_file : `./${relative_file}`;
	};

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

			// allow paths to be overridden in svelte-kit preview
			// and in prerendering
			export function init(settings) {
				set_paths(settings.paths || { paths: ${s(config.kit.paths)} });
				set_prerendering(settings.prerendering || false);

				const hooks = get_hooks(user_hooks);

				const prefix = path => assets + '/${config.kit.appDir}/' + path;

				options = {
					amp: ${config.kit.amp},
					dev: false,
					entry: {
						file: prefix(settings.build_data.manifest.entry.file),
						css: settings.build_data.manifest.entry.css.map(prefix),
						js: settings.build_data.manifest.entry.js.map(prefix)
					},
					fetched: undefined,
					floc: ${config.kit.floc},
					get_stack: error => String(error), // for security
					handle_error: (error, request) => {
						hooks.handleError({ error, request });
						error.stack = options.get_stack(error);
					},
					hooks,
					hydrate: ${s(config.kit.hydrate)},
					load_component: async id => {
						const { module, entry, css, js } = await settings.build_data.components[id]();
						return {
							module,
							entry: prefix(entry),
							css: css.map(prefix),
							js: js.map(prefix),
							styles: [] // TODO
						}
					},
					manifest: settings.build_data.manifest,
					paths: settings.paths,
					prerender: ${config.kit.prerender.enabled},
					read: settings.read,
					root,
					service_worker: ${service_worker_entry_file ? "'/service-worker.js'" : 'null'},
					router: ${s(config.kit.router)},
					ssr: ${s(config.kit.ssr)},
					target: ${s(config.kit.target)},
					template,
					trailing_slash: ${s(config.kit.trailingSlash)}
				};
			}

			// input has already been decoded by decodeURI
			// now handle the rest that decodeURIComponent would do
			const d = s => s
				.replace(/%23/g, '#')
				.replace(/%3[Bb]/g, ';')
				.replace(/%2[Cc]/g, ',')
				.replace(/%2[Ff]/g, '/')
				.replace(/%3[Ff]/g, '?')
				.replace(/%3[Aa]/g, ':')
				.replace(/%40/g, '@')
				.replace(/%26/g, '&')
				.replace(/%3[Dd]/g, '=')
				.replace(/%2[Bb]/g, '+')
				.replace(/%24/g, '$');

			// this looks redundant, but the indirection allows us to access
			// named imports without triggering Rollup's missing import detection
			const get_hooks = hooks => ({
				getSession: hooks.getSession || (() => ({})),
				handle: hooks.handle || (({ request, resolve }) => resolve(request)),
				handleError: hooks.handleError || (({ error }) => console.error(error.stack)),
				externalFetch: hooks.externalFetch || fetch
			});

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
		build: {
			target: 'es2020'
		},
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
			ssr: true,
			outDir: `${output_dir}/server`,
			manifest: true,
			polyfillDynamicImport: false,
			rollupOptions: {
				input,
				output: {
					format: 'esm',
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]'
				},
				preserveEntrySignatures: 'strict'
			}
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
		}
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_server');

	await vite.build(merged_config);

	/** @type {import('vite').Manifest} */
	const server_manifest = JSON.parse(
		fs.readFileSync(`${output_dir}/server/manifest.json`, 'utf-8')
	);

	return server_manifest;
}

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest_data: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string | null;
 * }} options
 * @param {import('vite').Manifest} client_manifest
 */
async function build_service_worker(
	{ cwd, assets_base, config, manifest_data, build_dir, output_dir, service_worker_entry_file },
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
				${manifest_data.assets
					.map((asset) => `${s(`${config.kit.paths.base}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];
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
		resolve: {
			alias: {
				'$service-worker': path.resolve(`${build_dir}/runtime/service-worker`),
				$lib: config.kit.files.lib
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
