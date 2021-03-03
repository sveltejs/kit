import fs, { readFileSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { rimraf } from '@sveltejs/app-utils/files';
import create_manifest_data from '../../core/create_manifest_data';
import { copy_assets } from '../utils';
import { create_app } from '../../core/create_app';
import vite from 'vite';
import svelte from '@sveltejs/vite-plugin-svelte';

/** @param {any} value */
const s = (value) => JSON.stringify(value);

const build_dir = '.svelte/build';

/**
 * @param {import('../../types').ValidatedConfig} config
 * @param {{ cwd: string }} opts
 */
export async function build(config, { cwd }) {
	const manifest = create_manifest_data({
		config,
		output: build_dir
	});

	rimraf(build_dir);

	create_app({
		manifest_data: manifest,
		output: build_dir
	});

	copy_assets(build_dir);

	// prettier-ignore
	writeFileSync(`${build_dir}/runtime/app/env.js`, [
		'export const browser = !import.meta.env.SSR;',
		'export const dev = false;',
		`export const amp = ${config.kit.amp};`
	].join('\n'));

	const client_entry_file = `${build_dir}/runtime/internal/start.js`;
	const client_out_dir = `${cwd}/client/${config.kit.appDir}`;
	const client_manifest_file = `${client_out_dir}/manifest.json`;

	const base =
		config.kit.paths.assets === '/.'
			? `/${config.kit.appDir}/`
			: `${config.kit.paths.assets}/${config.kit.appDir}/`;

	// client build
	await vite.build({
		base,
		build: {
			cssCodeSplit: true,
			manifest: true,
			lib: {
				entry: client_entry_file,
				name: 'app',
				formats: ['es']
			},
			outDir: client_out_dir
		},
		resolve: {
			alias: {
				$app: resolve(`${build_dir}/runtime/app`)
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

	/** @type {Record<string, {
	 *   file: string;
	 *   css: string[];
	 *   imports: string[];
	 * }>} */
	const client_manifest = JSON.parse(readFileSync(client_manifest_file, 'utf-8'));
	fs.unlinkSync(client_manifest_file);

	let setup_file = 'src/setup/index.js';
	if (!fs.existsSync(setup_file)) {
		setup_file = `${build_dir}/setup.js`;
		fs.writeFileSync(setup_file, '');
	}

	const app_file = `${build_dir}/app.js`;

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = relative(build_dir, file);
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

	// 			css_lookup[url] = readFileSync(file, 'utf-8');
	// 		});
	// 	});
	// });

	// TODO get_stack, below, just returns the stack as-is, without sourcemapping

	const entry = `${config.kit.paths.assets}/${config.kit.appDir}/${client_manifest[client_entry_file].file}`;

	// prettier-ignore
	fs.writeFileSync(
		app_file,
		`
			import * as renderer from '@sveltejs/kit/renderer';
			import root from ${s(app_relative(`${build_dir}/generated/root.svelte`))};
			import { set_paths } from ${s(app_relative(`${build_dir}/runtime/internal/singletons.js`))};
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
				return renderer.render(request, {
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
		base,
		build: {
			ssr: true,
			lib: {
				entry: app_file,
				name: 'app',
				formats: ['es']
			},
			outDir: `${cwd}/server`
		},
		resolve: {
			alias: {
				$app: resolve(`${build_dir}/runtime/app`)
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
