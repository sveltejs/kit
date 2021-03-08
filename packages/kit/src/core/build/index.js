import fs from 'fs';
import path from 'path';
import { rimraf } from '@sveltejs/app-utils/files';
import create_manifest_data from '../../core/create_manifest_data/index.js';
import { copy_assets } from '../utils.js';
import { create_app } from '../../core/create_app/index.js';
import vite from 'vite';
import svelte from '@svitejs/vite-plugin-svelte';

/** @param {any} value */
const s = (value) => JSON.stringify(value);

/** @typedef {Record<string, {
 *   file: string;
 *   css: string[];
 *   imports: string[];
 * }>} ClientManifest */

/**
 * @param {import('../../types').ValidatedConfig} config
 * @param {{
 *   cwd?: string;
 *   runtime?: string;
 * }} [opts]
 */
export async function build(config, { cwd = process.cwd(), runtime = '@sveltejs/kit/ssr' } = {}) {
	const build_dir = path.resolve(cwd, '.svelte/build');

	rimraf(build_dir);

	const options = {
		cwd,
		config,
		build_dir,
		base:
			config.kit.paths.assets === '/.'
				? `/${config.kit.appDir}/`
				: `${config.kit.paths.assets}/${config.kit.appDir}/`,
		manifest: create_manifest_data({
			config,
			output: build_dir,
			cwd
		}),
		output_dir: path.resolve(cwd, '.svelte/output'),
		client_entry_file: '.svelte/build/runtime/internal/start.js',
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker)
	};

	const client_manifest = await build_client(options);
	await build_server(options, client_manifest, runtime);

	if (options.service_worker_entry_file) {
		if (config.kit.paths.base !== '' || config.kit.paths.assets !== '/.') {
			throw new Error('Cannot use service worker alongside config.kit.paths');
		}

		await build_service_worker(options, client_manifest);
	}
}

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('../../types').ValidatedConfig
 *   manifest: import('../../types').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string;
 * }} options
 */
async function build_client({
	cwd,
	base,
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
	process.env.VITE_SVELTEKIT_SERVICE_WORKER = service_worker_entry_file ? '/service-worker.js' : '';

	const client_out_dir = `${output_dir}/client/${config.kit.appDir}`;
	const client_manifest_file = `${client_out_dir}/manifest.json`;

	// client build
	await vite.build({
		root: cwd,
		base,
		build: {
			cssCodeSplit: true,
			manifest: true,
			lib: {
				entry: client_entry_file,
				name: 'app',
				formats: ['es']
			},
			outDir: client_out_dir,
			rollupOptions: {
				output: {
					entryFileNames: 'start-[hash].js',
					chunkFileNames: '[name]-[hash].js',
					assetFileNames: '[name]-[hash][extname]'
				}
			}
		},
		resolve: {
			alias: {
				$app: path.resolve(`${build_dir}/runtime/app`)
			}
		},
		plugins: [
			svelte({
				emitCss: true,
				compilerOptions: {
					dev: true,
					hydratable: true
				},
				hot: true,
				extensions: config.extensions
			})
		]
	});

	/** @type {ClientManifest} */
	const client_manifest = JSON.parse(fs.readFileSync(client_manifest_file, 'utf-8'));
	fs.unlinkSync(client_manifest_file);

	return client_manifest;
}

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('../../types').ValidatedConfig
 *   manifest: import('../../types').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string;
 * }} options
 * @param {ClientManifest} client_manifest
 * @param {string} runtime
 */
async function build_server(
	{ cwd, base, config, manifest, build_dir, output_dir, client_entry_file },
	client_manifest,
	runtime
) {
	let setup_file = resolve_entry(config.kit.files.setup);
	if (!fs.existsSync(setup_file)) {
		setup_file = path.resolve(cwd, '.svelte/build/setup.js');
		fs.writeFileSync(setup_file, '');
	}

	const app_file = `${build_dir}/app.js`;

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = path.relative(build_dir, path.resolve(cwd, file));
		return relative_file[0] === '.' ? relative_file : `./${relative_file}`;
	};

	const component_indexes = new Map();
	manifest.components.forEach((c, i) => {
		component_indexes.set(c, i);
	});

	/** @param {string} c */
	const stringify_component = (c) => `() => import(${s(`${app_relative(c)}`)})`;

	// TODO ideally we wouldn't embed the css_lookup, but this is the easiest
	// way to be able to inline CSS into AMP documents. if we come up with
	// something better, we could use it for non-AMP documents too, as
	// critical CSS below a certain threshold _should_ be inlined
	const css_lookup = {};
	// manifest.pages.forEach((data) => {
	// 	data.parts.forEach((c) => {
	// 		const deps = client.deps[c];
	// 		deps.css.forEach((dep) => {
	// 			const url = `${config.kit.paths.assets}/${config.kit.appDir}/${dep}`.replace(/^\/\./, '');
	// 			const file = `${OPTIMIZED}/client/${config.kit.appDir}/${dep}`;

	// 			css_lookup[url] = fs.readFileSync(file, 'utf-8');
	// 		});
	// 	});
	// });

	// TODO get_stack, below, just returns the stack as-is, without sourcemapping

	const entry = `${config.kit.paths.assets}/${config.kit.appDir}/${client_manifest[client_entry_file].file}`;

	// prettier-ignore
	fs.writeFileSync(
		app_file,
		`
			import { ssr } from '${runtime}';
			import root from './generated/root.svelte';
			import { set_paths } from './runtime/internal/singletons.js';
			import * as setup from ${s(app_relative(setup_file))};

			const template = ({ head, body }) => ${s(fs.readFileSync(config.kit.files.template, 'utf-8'))
				.replace('%svelte.head%', '" + head + "')
				.replace('%svelte.body%', '" + body + "')};

			set_paths(${s(config.kit.paths)});

			// allow paths to be overridden in svelte-kit start
			export function init({ paths }) {
				set_paths(paths);
			}

			init({ paths: ${s(config.kit.paths)} });

			const d = decodeURIComponent;
			const empty = () => ({});

			const components = [
				${manifest.components.map((c) => stringify_component(c)).join(',\n\t\t\t\t')}
			];

			${config.kit.amp ? `
			const css_lookup = ${s(css_lookup)};` : ''}

			const manifest = {
				assets: ${s(manifest.assets)},
				layout: ${stringify_component(manifest.layout)},
				error: ${stringify_component(manifest.error)},
				pages: [
					${manifest.pages
						.map((data) => {
							const params = get_params(data.params);
							const parts = data.parts.map(c => `components[${component_indexes.get(c)}]`);

							const prefix = config.kit.paths.assets === '/.' ? '' : config.kit.paths.assets;

							/** @param {string} dep */
							const path_to_dep = dep => prefix + `/${config.kit.appDir}/${dep}`;

							const js_deps = new Set();
							const css_deps = new Set();

							/** @param {string} id */
							function find_deps(id) {
								const chunk = client_manifest[id];
								js_deps.add(path_to_dep(chunk.file));

								if (chunk.css) {
									chunk.css.forEach(file => css_deps.add(path_to_dep(file)));
								}

								if (chunk.imports) {
									chunk.imports.forEach(find_deps);
								}
							}

							for (const part of data.parts) {
								find_deps(part);
							}

							// data.parts.forEach(c => {
							// 	const deps = client.deps[c];
							// 	deps.js.forEach(dep => js_deps.add(path_to_dep(dep)));
							// 	deps.css.forEach(dep => css_deps.add(path_to_dep(dep)));
							// });

							return `{
								pattern: ${data.pattern},
								params: ${params},
								parts: [${parts.join(', ')}],
								css: [${Array.from(css_deps).map(s).join(', ')}],
								js: [${Array.from(js_deps).map(s).join(', ')}]
							}`;
						})
						.join(',\n\t\t\t\t\t')}
				],
				endpoints: [
					${manifest.endpoints
						.map((data) => {
							const params = get_params(data.params);
							const load = `() => import(${s(app_relative(data.file))})`;

							return `{ pattern: ${data.pattern}, params: ${params}, load: ${load} }`;
						})
						.join(',\n\t\t\t\t\t')}
				]
			};

			export function render(request, {
				paths = ${s(config.kit.paths)},
				local = false,
				only_prerender = false,
				get_static_file
			} = {}) {
				return ssr(request, {
					paths,
					local,
					template,
					manifest,
					target: ${s(config.kit.target)},${
						config.kit.startGlobal ? `\n\t\t\t\t\tstart_global: ${s(config.kit.startGlobal)},` : ''
					}
					entry: ${s(entry)},
					root,
					setup,
					dev: false,
					amp: ${config.kit.amp},
					only_prerender,
					app_dir: ${s(config.kit.appDir)},
					host: ${s(config.kit.host)},
					host_header: ${s(config.kit.hostHeader)},
					get_stack: error => error.stack,
					get_static_file,
					get_amp_css: dep => css_lookup[dep]
				});
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	await vite.build({
		root: cwd,
		base,
		build: {
			ssr: true,
			lib: {
				entry: app_file,
				name: 'app',
				formats: ['es']
			},
			outDir: `${output_dir}/server`
		},
		resolve: {
			alias: {
				$app: path.resolve(`${build_dir}/runtime/app`)
			}
		},
		plugins: [
			svelte({
				emitCss: true,
				compilerOptions: {
					dev: true,
					hydratable: true
				},
				hot: true,
				extensions: config.extensions
			})
		],
		ssr: {
			noExternal: ['svelte']
		}
	});
}

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('../../types').ValidatedConfig
 *   manifest: import('../../types').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string;
 * }} options
 * @param {ClientManifest} client_manifest
 */
async function build_service_worker(
	{ cwd, base, config, manifest, build_dir, output_dir, service_worker_entry_file },
	client_manifest
) {
	fs.writeFileSync(
		`${build_dir}/runtime/service-worker.js`,
		`
			export const timestamp = ${Date.now()};

			export const build = [
				${Object.values(client_manifest)
					.map((asset) => `${s(`/${config.kit.appDir}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const assets = [
				${manifest.assets.map((asset) => `${s(`/${asset.file}`)}`).join(',\n\t\t\t\t')}
			];

			export function onInstall(callback) {
				self.addEventListener('install', (event) => {
					event.waitUntil(Promise.resolve(callback(event)));
				});
			}

			export function onActivate(callback) {
				self.addEventListener('activate', (event) => {
					event.waitUntil(Promise.resolve(callback(event)));
				});
			}

			export function onFetch(callback) {
				self.addEventListener('fetch', (event) => {
					event.respondWith(Promise.resolve(callback(event)).then(result => result || fetch(event.request)));
				});
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	await vite.build({
		root: cwd,
		base,
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
				'$service-worker': path.resolve(`${build_dir}/runtime/service-worker`)
			}
		}
	});
}

/**
 * @param {string} entry
 * @returns {string}
 */
function resolve_entry(entry) {
	if (fs.existsSync(entry)) {
		const stats = fs.statSync(entry);
		if (stats.isDirectory()) {
			return resolve_entry(path.join(entry, 'index'));
		}

		return entry;
	} else {
		const dir = path.dirname(entry);

		if (fs.existsSync(dir)) {
			const base = path.basename(entry);
			const files = fs.readdirSync(dir);

			const found = files.find((file) => file.replace(/\.[^.]+$/, '') === base);

			if (found) return path.join(dir, found);
		}
	}

	return null;
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
							? `${param.slice(3)}: d(m[${i + 1}]).split('/')`
							: `${param}: d(m[${i + 1}])`;
					})
					.join(', ') +
				'})'
		: 'empty';
}
