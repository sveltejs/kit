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
 * @param {import('../../../types.internal').ValidatedConfig} config
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
		const { base, assets } = config.kit.paths;

		if (assets !== base && assets !== '/.') {
			throw new Error('Cannot use service worker alongside config.kit.paths.assets');
		}

		await build_service_worker(options, client_manifest);
	}
}

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('../../../types.internal').ValidatedConfig
 *   manifest: import('../../../types.internal').ManifestData
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

	/** @type {Record<string, string>} */
	const input = {
		start: path.resolve(cwd, client_entry_file)
	};

	manifest.pages.forEach((page) => {
		page.parts.forEach((file) => {
			const resolved = path.resolve(cwd, file);
			const relative = path.relative(config.kit.files.routes, resolved);
			input[path.join('pages', relative)] = resolved;
		});
	});

	/** @type {any} */
	const user_config = config.kit.vite();

	await vite.build({
		...user_config,
		configFile: false,
		root: cwd,
		base,
		build: {
			...user_config.build,
			cssCodeSplit: true,
			manifest: true,
			lib: {
				// TODO i'm not convinced this block is necessary if we're
				// providing inputs explicitly via rollupOptions, but without
				// it Vite complains about the dynamic import polyfill
				entry: client_entry_file,
				name: 'app',
				formats: ['es']
			},
			outDir: client_out_dir,
			rollupOptions: {
				...(user_config.build && user_config.build.rollupOptions),
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
			...user_config.resolve,
			alias: {
				...(user_config.resolve && user_config.resolve.alias),
				$app: path.resolve(`${build_dir}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		plugins: [
			...(user_config.plugins || []),
			svelte({
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
 *   config: import('../../../types.internal').ValidatedConfig
 *   manifest: import('../../../types.internal').ManifestData
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

	const entry = `${config.kit.paths.assets}/${config.kit.appDir}/${client_manifest[client_entry_file].file}`;

	/** @type {Set<string>} */
	const common_js_deps = new Set();

	/** @type {Set<string>} */
	const common_css_deps = new Set();

	/** @type {Map<string, Set<string>>} */
	const js_deps_by_file = new Map();

	/** @type {Map<string, Set<string>>} */
	const css_deps_by_file = new Map();

	/**
	 * @param {string} file
	 * @param {Set<string>} js_deps
	 * @param {Set<string>} css_deps
	 */
	function find_deps(file, js_deps, css_deps) {
		const chunk = client_manifest[file];

		js_deps.add(chunk.file);

		if (chunk.css) {
			chunk.css.forEach((file) => css_deps.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => find_deps(file, js_deps, css_deps));
		}
	}

	find_deps(client_entry_file, common_js_deps, common_css_deps);

	// TODO ideally we wouldn't embed the css_lookup, but this is the easiest
	// way to be able to inline CSS into AMP documents. if we come up with
	// something better, we could use it for non-AMP documents too, as
	// critical CSS below a certain threshold _should_ be inlined

	/** @type {Record<string, string>} */
	const amp_css_lookup = {};

	/** @type {Record<string, string>} */
	const client_component_lookup = {};

	[client_entry_file, ...manifest.components].forEach((file) => {
		client_component_lookup[file] = client_manifest[file].file;

		const js_deps = new Set();
		const css_deps = new Set();

		js_deps_by_file.set(file, js_deps);
		css_deps_by_file.set(file, css_deps);

		find_deps(file, js_deps, css_deps);

		css_deps.forEach((file) => {
			const resolved = `${output_dir}/client/${config.kit.appDir}/${file}`;
			const contents = fs.readFileSync(resolved, 'utf-8');

			amp_css_lookup[file] = contents;
		});
	});

	// prettier-ignore
	fs.writeFileSync(
		app_file,
		`
			import { ssr } from '${runtime}';
			import root from './generated/root.svelte';
			import { set_paths } from './runtime/paths.js';
			import * as setup from ${s(app_relative(setup_file))};

			const template = ({ head, body }) => ${s(fs.readFileSync(config.kit.files.template, 'utf-8'))
				.replace('%svelte.head%', '" + head + "')
				.replace('%svelte.body%', '" + body + "')};

			set_paths(${s(config.kit.paths)});

			// allow paths to be overridden in svelte-kit start
			export function init({ paths }) {
				set_paths(paths);
			}

			const d = decodeURIComponent;
			const empty = () => ({});

			const components = [
				${manifest.components.map((c) => stringify_component(c)).join(',\n\t\t\t\t')}
			];

			${config.kit.amp ? `
			const amp_css_lookup = ${s(amp_css_lookup)};` : ''}

			const client_component_lookup = ${s(client_component_lookup)};

			const manifest = {
				assets: ${s(manifest.assets)},
				layout: ${stringify_component(manifest.layout)},
				error: ${stringify_component(manifest.error)},
				pages: [
					${manifest.pages
						.map((data) => {
							const params = get_params(data.params);
							const parts = data.parts.map(id => `{ id: ${s(id)}, load: components[${component_indexes.get(id)}] }`);

							const js_deps = new Set(common_js_deps);
							const css_deps = new Set(common_css_deps);

							for (const file of data.parts) {
								js_deps_by_file.get(file).forEach(asset => {
									js_deps.add(asset);
								});

								css_deps_by_file.get(file).forEach(asset => {
									css_deps.add(asset);
								});
							}

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
					target: ${s(config.kit.target)},
					entry: ${s(entry)},
					root,
					setup,
					dev: false,
					amp: ${config.kit.amp},
					only_prerender,
					app_dir: ${s(config.kit.appDir)},
					host: ${s(config.kit.host)},
					host_header: ${s(config.kit.hostHeader)},
					get_component_path: id => ${s(`${config.kit.paths.assets}/${config.kit.appDir}/`)} + client_component_lookup[id],
					get_stack: error => error.stack,
					get_static_file,
					get_amp_css: dep => amp_css_lookup[dep]
				});
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	/** @type {any} */
	const user_config = config.kit.vite();

	await vite.build({
		...user_config,
		configFile: false,
		root: cwd,
		base,
		build: {
			target: 'es2018',
			...user_config.build,
			ssr: true,
			lib: {
				entry: app_file,
				name: 'app',
				formats: ['es']
			},
			outDir: `${output_dir}/server`
		},
		resolve: {
			...user_config.resolve,
			alias: {
				...(user_config.resolve && user_config.resolve.alias),
				$app: path.resolve(`${build_dir}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		plugins: [
			...(user_config.plugins || []),
			svelte({
				extensions: config.extensions
			})
		],
		// this API is marked as @alpha https://github.com/vitejs/vite/blob/27785f7fcc5b45987b5f0bf308137ddbdd9f79ea/packages/vite/src/node/config.ts#L129
		// it's not exposed in the typescript definitions as a result
		// so we need to ignore the fact that it's missing
		// @ts-ignore
		ssr: {
			...user_config.ssr,
			noExternal: [
				'svelte',
				'@sveltejs/kit',
				...((user_config.ssr && user_config.ssr.noExternal) || [])
			]
		},
		optimizeDeps: {
			entries: []
		}
	});
}

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('../../../types.internal').ValidatedConfig
 *   manifest: import('../../../types.internal').ManifestData
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

			export const assets = [
				${manifest.assets
					.map((asset) => `${s(`${config.kit.paths.base}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	/** @type {any} */
	const user_config = config.kit.vite();

	await vite.build({
		...user_config,
		configFile: false,
		root: cwd,
		base,
		build: {
			...user_config.build,
			lib: {
				entry: service_worker_entry_file,
				name: 'app',
				formats: ['es']
			},
			rollupOptions: {
				...(user_config.build && user_config.build.rollupOptions),
				output: {
					entryFileNames: 'service-worker.js'
				}
			},
			outDir: `${output_dir}/client`,
			emptyOutDir: false
		},
		resolve: {
			...user_config.resolve,
			alias: {
				...(user_config.resolve && user_config.resolve.alias),
				'$service-worker': path.resolve(`${build_dir}/runtime/service-worker`)
			}
		},
		optimizeDeps: {
			entries: []
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
							? `${param.slice(3)}: d(m[${i + 1}])`
							: `${param}: d(m[${i + 1}])`;
					})
					.join(', ') +
				'})'
		: 'empty';
}
