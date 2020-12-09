import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import { green, gray, bold, cyan } from 'kleur/colors';
import { mkdirp } from '@sveltejs/app-utils/files';
import create_manifest_data from '../../core/create_manifest_data';
import { rollup } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import css_chunks from 'rollup-plugin-css-chunks';
import { copy_assets } from '../utils';
import { create_app } from '../../core/create_app';
import { css_injection } from './css_injection';

const exec = promisify(child_process.exec);

const snowpack_main = require.resolve('snowpack');
const snowpack_pkg_file = path.join(snowpack_main, '../../package.json');
const snowpack_pkg = require(snowpack_pkg_file); // eslint-disable-line
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

	const progress = {
		transformed_client: false,
		transformed_server: false,
		optimized_client: false,
		optimized_server: false
	};

	process.stdout.write('\x1b[s');

	const tick = bold(green('✔'));
	const render = () =>
		process.stdout.write(
			'\x1b[u' +
				`
	${bold(cyan('Transforming...'))}
	  ${progress.transformed_client ? `${tick} client` : gray('⧗ client')}
	  ${progress.transformed_server ? `${tick} server` : gray('⧗ server')}
	${bold(cyan('Optimizing...'))}
	  ${progress.optimized_client ? `${tick} client ` : gray('⧗ client')}
	  ${progress.optimized_server ? `${tick} server ` : gray('⧗ server')}
	`
					.replace(/^\t/gm, '')
					.trimStart()
		);

	render();

	const mount = [
		`--mount.${config.files.routes}=/${config.appDir}/routes`,
		`--mount.${config.files.setup}=/${config.appDir}/setup`
	].join(' ');

	const promises = {
		transform_client: exec(`node ${snowpack_bin} build ${mount} --out=${UNOPTIMIZED}/client`, {
			env: {
				SVELTE_KIT_APP_DIR: config.appDir
			}
		}).then(
			() => {
				progress.transformed_client = true;
				render();
			}
		),
		transform_server: exec(`node ${snowpack_bin} build ${mount} --out=${UNOPTIMIZED}/server --ssr`, {
			env: {
				SVELTE_KIT_APP_DIR: config.appDir
			}
		}).then(() => {
			progress.transformed_server = true;
			render();
		})
	};

	// we await this promise because we can't start optimizing the server
	// until client optimization is complete
	await promises.transform_client;

	const client = {
		entry: null,
		deps: {}
	};

	const entry = path.resolve(`${UNOPTIMIZED}/client/${config.appDir}/assets/runtime/internal/start.js`);

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
			css_chunks({
				injectImports: true,
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

					client.deps.__entry__ = get_deps(client.entry);

					manifest.components.forEach((component) => {
						const file = path.normalize(component.file.replace(/\.svelte$/, '.js'));
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

	progress.optimized_client = true;
	render();

	// just in case the server is still transforming...
	await promises.transform_server;

	const setup_file = `${UNOPTIMIZED}/server/${config.appDir}/setup/index.js`;
	if (!fs.existsSync(setup_file)) {
		mkdirp(path.dirname(setup_file));
		fs.writeFileSync(setup_file, '');
	}

	// TODO do we need component file names in build?
	const stringify_component = (c) => `{ name: ${s(c.name)}, file: ${s(c.file)}, url: ${s(c.url)} }`;

	const stringified_manifest = `
		{
			layout: ${stringify_component(manifest.layout)},
			error: ${stringify_component(manifest.error)},
			components: [
				${manifest.components.map((c) => stringify_component(c)).join(',\n\t\t\t\t')}
			],
			pages: [
				${manifest.pages
					.map(({ path, pattern, parts }) => {
						return `{ path: ${s(path)}, pattern: ${pattern}, parts: ${s(parts)} }`;
					})
					.join(',\n\t\t\t\t')}
			],
			endpoints: [
				${manifest.endpoints
					.map(({ name, pattern, file, params }) => {
						return `{ name: ${s(name)}, pattern: ${pattern}, file: ${s(file)}, params: ${s(
							params
						)} }`;
					})
					.join(',\n\t\t\t\t')}
			]
		}
	`
		.replace(/^\t{2}/gm, '')
		.trim();

	fs.writeFileSync('.svelte/build/manifest.js', `export default ${stringified_manifest};`);
	fs.writeFileSync('.svelte/build/manifest.cjs', `module.exports = ${stringified_manifest};`);

	fs.writeFileSync(
		`${UNOPTIMIZED}/server/app.js`,
		`
			import * as renderer from '@sveltejs/kit/dist/renderer';
			import root from './${config.appDir}/assets/generated/root.js';
			import { set_paths } from './${config.appDir}/assets/runtime/internal/singletons.js';
			import * as setup from './${config.appDir}/setup/index.js';
			import manifest from '../../manifest.js';

			const template = ({ head, body }) => ${s(fs.readFileSync(config.files.template, 'utf-8'))
				.replace('%svelte.head%', '" + head + "')
				.replace('%svelte.body%', '" + body + "')};

			const client = ${s(client)};

			set_paths(${s(config.paths)});

			// allow paths to be overridden in svelte-kit start
			export function init({ paths }) {
				set_paths(paths);
			}

			init({ paths: ${s(config.paths)} });

			export function render(request, { paths = ${s(config.paths)}, only_prerender = false } = {}) {
				return renderer.render(request, {
					static_dir: ${s(config.files.static)},
					paths,
					template,
					manifest,
					target: ${s(config.target)},${
				config.startGlobal ? `\n\t\t\t\t\tstart_global: ${s(config.startGlobal)},` : ''
			}
					client,
					root,
					setup,
					load: (route) => require(\`./routes/\${route.name}.js\`),
					dev: false,
					only_prerender,
					app_dir: ${s(config.appDir)}
				});
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	const server_input = {
		app: `${UNOPTIMIZED}/server/app.js`
	};

	[manifest.layout, manifest.error, ...manifest.components, ...manifest.endpoints].forEach(
		(item) => {
			server_input[`routes/${item.name}`] = `${UNOPTIMIZED}/server${item.url.replace(
				/\.\w+$/,
				'.js'
			)}`;
		}
	);

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
		format: 'cjs', // TODO some adapters might want ESM?
		exports: 'named',
		entryFileNames: '[name].js',
		chunkFileNames: 'chunks/[name].js',
		assetFileNames: 'assets/[name].js',
		sourcemap: true
	});

	progress.optimized_server = true;
	render();
	console.log();
}

async function rimraf(path) {
	return new Promise((resolve) => {
		(fs.rm || fs.rmdir)(path, { recursive: true, force: true }, () => resolve());
	});
}
