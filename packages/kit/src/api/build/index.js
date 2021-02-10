import fs, { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import { green, bold, cyan } from 'kleur/colors';
import { mkdirp } from '@sveltejs/app-utils/files';
import create_manifest_data from '../../core/create_manifest_data';
import { rollup } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import css_chunks from 'rollup-plugin-css-chunks';
import { copy_assets } from '../utils';
import { create_app } from '../../core/create_app';
import { css_injection } from './css_injection';

const execFile = promisify(child_process.execFile);

let snowpack_pkg_file;
let dir = fileURLToPath(import.meta.url);
while (dir !== (dir = path.join(dir, '..'))) {
	snowpack_pkg_file = path.join(dir, 'node_modules/snowpack/package.json');
	if (existsSync(snowpack_pkg_file)) break;
}

const snowpack_pkg = JSON.parse(readFileSync(snowpack_pkg_file, 'utf-8')); // eslint-disable-line
const snowpack_bin = path.resolve(path.dirname(snowpack_pkg_file), snowpack_pkg.bin.snowpack);
const ignorable_warnings = new Set(['EMPTY_BUNDLE', 'MISSING_EXPORT']);
const onwarn = (warning, handler) => {
	// TODO would be nice to just eliminate the circular dependencies instead of
	// squelching these warnings (it happens when e.g. the root layout imports
	// from $app/navigation)
	if (ignorable_warnings.has(warning.code)) return;
	handler(warning);
};

const DIR = '.svelte';
const ASSETS = `${DIR}/assets`;
const UNOPTIMIZED = `${DIR}/build/unoptimized`;
const OPTIMIZED = `${DIR}/build/optimized`;

const s = JSON.stringify;

export async function build(config) {
	const manifest = create_manifest_data(config);

	mkdirp(ASSETS);
	await rimraf(UNOPTIMIZED);
	await rimraf(OPTIMIZED);

	create_app({
		manifest_data: manifest,
		output: '.svelte/assets'
	});

	copy_assets();

	// TODO use import.meta.env.SSR upon resolution of https://github.com/snowpackjs/snowpack/discussions/1889
	// prettier-ignore
	writeFileSync('.svelte/assets/runtime/app/env.js', [
		'export const browser = typeof window !== "undefined";',
		'export const dev = false;',
		`export const amp = ${config.amp};`
	].join('\n'));

	const tick = bold(green('✔'));
	console.log(bold(cyan('Transforming...')));

	const mount = [
		`--mount.${config.files.routes}=/${config.appDir}/routes`,
		`--mount.${config.files.setup}=/${config.appDir}/setup`
	];

	const env = { ...process.env, SVELTE_KIT_APP_DIR: config.appDir };

	const promises = {
		transform_client: execFile(
			process.argv[0],
			[snowpack_bin, 'build', ...mount, `--out=${UNOPTIMIZED}/client`],
			{ env }
		),
		transform_server: execFile(
			process.argv[0],
			[snowpack_bin, 'build', ...mount, `--out=${UNOPTIMIZED}/server`, '--ssr'],
			{ env }
		)
	};

	await promises.transform_client;
	console.log(`  ${tick} client`);

	await promises.transform_server;
	console.log(`  ${tick} server`);

	console.log(bold(cyan('Optimizing...')));

	const client = {
		entry: null,
		deps: {}
	};

	const entry = path.resolve(
		`${UNOPTIMIZED}/client/${config.appDir}/assets/runtime/internal/start.js`
	);

	const client_chunks = await rollup({
		input: {
			entry
		},
		plugins: [
			{
				name: 'deproxy-css',
				async resolveId(importee, importer) {
					if (/\.css\.proxy\.js$/.test(importee)) {
						const deproxied = importee.replace(/\.css\.proxy\.js$/, '.css');
						const resolved = await this.resolve(deproxied, importer);
						return resolved.id;
					}
				}
			},
			// TODO the .default suggests a bug in the css_chunks plugin
			css_chunks.default({
				sourcemap: true
			}),
			css_injection,
			{
				name: 'generate-client-manifest',
				generateBundle(_options, bundle) {
					const reverse_lookup = new Map();

					const routes = path.resolve(`${UNOPTIMIZED}/client/${config.appDir}/routes`);

					let inject_styles;

					for (const key in bundle) {
						const chunk = bundle[key];

						if (chunk.facadeModuleId === entry) {
							client.entry = key;
						} else if (chunk.facadeModuleId === 'inject_styles.js') {
							inject_styles = key;
						} else if (chunk.modules) {
							for (const id in chunk.modules) {
								if (id.startsWith(routes) && id.endsWith('.js')) {
									const file = id.slice(routes.length + 1);
									reverse_lookup.set(file, key);
								}
							}
						}
					}

					const find_deps = (key, js, css) => {
						if (js.has(key)) return;

						js.add(key);

						const chunk = bundle[key];

						if (chunk) {
							const imports = chunk.imports;

							if (imports) {
								imports.forEach((key) => {
									if (key.endsWith('.css')) {
										js.add(inject_styles);
										css.add(key);
									} else {
										find_deps(key, js, css);
									}
								});
							}
						} else {
							this.error(`'${key}' is imported but could not be bundled`);
						}

						return { js, css };
					};

					const get_deps = (key) => {
						const js = new Set();
						const css = new Set();

						find_deps(key, js, css);

						return {
							js: Array.from(js),
							css: Array.from(css)
						};
					};

					manifest.components.forEach((component) => {
						const file = path.normalize(component.file + '.js');
						const key = reverse_lookup.get(file);

						client.deps[component.name] = get_deps(key);
					});
				}
			},
			terser()
		],

		onwarn,

		// TODO ensure this works with external node modules (on server)
		external: (id) => id[0] !== '.' && !path.isAbsolute(id)
	});

	await client_chunks.write({
		dir: `${OPTIMIZED}/client/${config.appDir}`,
		entryFileNames: '[name]-[hash].js',
		chunkFileNames: '[name]-[hash].js',
		assetFileNames: '[name]-[hash].js', // TODO CSS filenames aren't hashed?
		format: 'esm',
		sourcemap: true
	});

	console.log(`  ${tick} client`);

	const setup_file = `${UNOPTIMIZED}/server/${config.appDir}/setup/index.js`;
	if (!fs.existsSync(setup_file)) {
		mkdirp(path.dirname(setup_file));
		fs.writeFileSync(setup_file, '');
	}

	const app_file = `${UNOPTIMIZED}/server/app.js`;

	const component_indexes = new Map();
	manifest.components.forEach((c, i) => {
		component_indexes.set(c.file, i);
	});

	const stringify_component = (c) => `() => import(${s(`.${c.url}`)})`;

	// TODO ideally we wouldn't embed the css_lookup, but this is the easiest
	// way to be able to inline CSS into AMP documents. if we come up with
	// something better, we could use it for non-AMP documents too, as
	// critical CSS below a certain threshold _should_ be inlined
	const css_lookup = {};
	manifest.pages.forEach((data) => {
		data.parts.forEach((c) => {
			const deps = client.deps[c.name];
			deps.css.forEach((dep) => {
				const url = `${config.paths.assets}/${config.appDir}/${dep}`.replace(/^\/\./, '');
				const file = `${OPTIMIZED}/client/${config.appDir}/${dep}`;

				css_lookup[url] = readFileSync(file, 'utf-8');
			});
		});
	});

	// TODO get_stack, below, just returns the stack as-is, without sourcemapping

	// prettier-ignore
	fs.writeFileSync(
		app_file,
		`
			import * as renderer from '@sveltejs/kit/renderer';
			import root from './${config.appDir}/assets/generated/root.svelte.js';
			import { set_paths } from './${config.appDir}/assets/runtime/internal/singletons.js';
			import * as setup from './${config.appDir}/setup/index.js';

			const template = ({ head, body }) => ${s(fs.readFileSync(config.files.template, 'utf-8'))
				.replace('%svelte.head%', '" + head + "')
				.replace('%svelte.body%', '" + body + "')};

			const entry = ${s(client.entry)};

			set_paths(${s(config.paths)});

			// allow paths to be overridden in svelte-kit start
			export function init({ paths }) {
				set_paths(paths);
			}

			init({ paths: ${s(config.paths)} });

			const d = decodeURIComponent;
			const empty = () => ({});

			const components = [
				${manifest.components.map((c) => stringify_component(c)).join(',\n\t\t\t\t')}
			];

			${config.amp ? `
			const css_lookup = ${s(css_lookup)};` : ''}

			const manifest = {
				assets: ${s(manifest.assets)},
				layout: ${stringify_component(manifest.layout)},
				error: ${stringify_component(manifest.error)},
				pages: [
					${manifest.pages
						.map((data) => {
							const params = get_params(data.params);
							const parts = data.parts.map(c => `components[${component_indexes.get(c.file)}]`);

							const path_to_dep = dep => `${config.paths.assets}/${config.appDir}/${dep}`.replace(/^\/\./, '');

							const js_deps = new Set();
							const css_deps = new Set();
							data.parts.forEach(c => {
								const deps = client.deps[c.name];
								deps.js.forEach(dep => js_deps.add(path_to_dep(dep)));
								deps.css.forEach(dep => css_deps.add(path_to_dep(dep)));
							});

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
							const load = `() => import(${s(`.${data.url.replace(/\.\w+$/, '.js')}`)})`;

							return `{ pattern: ${data.pattern}, params: ${params}, load: ${load} }`;
						})
						.join(',\n\t\t\t\t\t')}
				]
			};

			export function render(request, {
				paths = ${s(config.paths)},
				local = false,
				only_prerender = false,
				get_static_file
			} = {}) {
				return renderer.render(request, {
					paths,
					local,
					template,
					manifest,
					target: ${s(config.target)},${
						config.startGlobal ? `\n\t\t\t\t\tstart_global: ${s(config.startGlobal)},` : ''
					}
					entry,
					root,
					setup,
					dev: false,
					amp: ${config.amp},
					only_prerender,
					app_dir: ${s(config.appDir)},
					host: ${s(config.host)},
					host_header: ${s(config.hostHeader)},
					get_stack: error => error.stack,
					get_static_file,
					get_amp_css: dep => css_lookup[dep]
				});
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	const server_input = {
		app: `${UNOPTIMIZED}/server/app.js`
	};

	const server_chunks = await rollup({
		input: server_input,
		plugins: [
			{
				name: 'remove-css',
				load(id) {
					if (/\.css\.proxy\.js$/.test(id)) return '';
				}
			},
			// TODO add server manifest generation so we can prune
			// imports before zipping for cloud functions
			terser()
		],

		onwarn,

		// TODO ensure this works with external node modules (on server)
		external: (id) => id[0] !== '.' && !path.isAbsolute(id)
	});

	await server_chunks.write({
		dir: `${OPTIMIZED}/server`,
		format: 'esm',
		exports: 'named',
		entryFileNames: '[name].js',
		chunkFileNames: 'chunks/[name].js',
		assetFileNames: 'assets/[name].js',
		sourcemap: true
	});

	console.log(`  ${tick} server\n`);
}

async function rimraf(path) {
	return new Promise((resolve) => {
		(fs.rm || fs.rmdir)(path, { recursive: true, force: true }, () => resolve());
	});
}

// given an array of params like `['x', 'y', 'z']` for
// src/routes/[x]/[y]/[z]/svelte, create a function
// that turns a RexExpMatchArray into ({ x, y, z })
function get_params(array) {
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
