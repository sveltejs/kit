import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import colors from 'kleur';
import relative from 'require-relative';
import { mkdirp } from '@sveltejs/app-utils';
import create_manifest_data from '../../core/create_manifest_data';
import {
	rollup,
	OutputChunk
} from 'rollup';
import { terser } from 'rollup-plugin-terser';
import css_chunks from 'rollup-plugin-css-chunks';
import { copy_assets } from '../utils';
import { create_app } from '../../core/create_app';
import { SvelteAppConfig } from '../../interfaces';
import { css_injection } from './css_injection';

const exec = promisify(child_process.exec);

const snowpack_main = require.resolve('snowpack');
const snowpack_pkg_file = path.join(snowpack_main, '../../package.json');
const snowpack_pkg = require(snowpack_pkg_file);
const snowpack_bin = path.resolve(path.dirname(snowpack_pkg_file), snowpack_pkg.bin.snowpack);

const ignorable_warnings = new Set(['EMPTY_BUNDLE', 'CIRCULAR_DEPENDENCY']);
const onwarn = (warning, handler) => {
	// TODO would be nice to just eliminate the circular dependencies instead of
	// squelching these warnings (it happens when e.g. the root layout imports
	// from /_app/main/client)
	if (ignorable_warnings.has(warning.code)) return;
	handler(warning);
};

export async function build(config: SvelteAppConfig) {
	if (!config.adapter) {
		throw new Error('No adapter specified');
	}

	const manifest = create_manifest_data('src/routes'); // TODO make configurable, without breaking Snowpack config

	mkdirp('.svelte/main');
	create_app({
		manifest_data: manifest,
		routes: '/_app/routes',
		output: '.svelte/main'
	});

	const header = msg => console.log(colors.bold().cyan(`\n> ${msg}`));

	const log = msg => console.log(msg.replace(/^/gm, '  '));
	log.success = msg => log(colors.green(`✔ ${msg}`));
	log.error = msg => log(colors.bold().red(msg));
	log.warn = msg => log(colors.bold().yellow(msg));
	log.minor = msg => log(colors.grey(msg));
	log.info = log;

	const unoptimized = `.svelte/build/unoptimized`;

	{
		// phase one — build with Snowpack
		header('Creating unoptimized build...');
		await exec(`rm -rf .svelte/build/unoptimized`);

		copy_assets();

		await exec(`${snowpack_bin} build --out=${unoptimized}/server --ssr`);
		log.success('server');
		await exec(`${snowpack_bin} build --out=${unoptimized}/client`);
		log.success('client');
	}

	{
		// phase two — optimise
		header('Optimizing...');
		await exec(`rm -rf .svelte/build/optimized`);

		const server_input = {
			root: `${unoptimized}/server/_app/main/root.js`,
			setup: fs.existsSync(`${unoptimized}/server/_app/setup/index.js`)
				? `${unoptimized}/server/_app/setup/index.js`
				: path.join(__dirname, '../assets/setup.js'),
			// TODO session middleware etc
		};

		[
			manifest.layout, // TODO is this necessary? if so why isn't manifest.error?
			...manifest.components,
			...manifest.endpoints
		].forEach(item => {
			server_input[`routes/${item.name}`] = `${unoptimized}/server${item.url.replace(/\.\w+$/, '.js')}`;
		});

		const server_chunks = await rollup({
			input: server_input,
			plugins: [
				{
					name: 'remove-css',
					load(id) {
						if (/\.css\.proxy\.js$/.test(id)) return '';
					}
				},
				{
					name: 'generate-server-manifest',
					generateBundle(options, bundle) {
						// console.log(bundle);
					}
				},
				terser()
			],

			onwarn,

			// TODO ensure this works with external node modules (on server)
			external: id => id[0] !== '.' && !path.isAbsolute(id)
		});

		await server_chunks.write({
			dir: '.svelte/build/optimized/server',
			format: 'cjs', // TODO some adapters might want ESM?
			exports: 'named',
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name].js',
			assetFileNames: 'assets/[name].js',
			sourcemap: true
		});

		log.success(`server`);

		const entry = path.resolve(`${unoptimized}/client/_app/main/client.js`);

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
					generateBundle(options, bundle) {
						const reverse_lookup = new Map();

						const routes = path.resolve(`${unoptimized}/client/_app/routes`);
						const client: {
							entry: string;
							deps: Record<string, { js: string[], css: string[] }>
						} = {
							entry: null,
							deps: {}
						};

						let inject_styles: string;

						for (const key in bundle) {
							const chunk = bundle[key];

							if ((chunk as OutputChunk).facadeModuleId === entry) {
								client.entry = key;
							}

							else if ((chunk as OutputChunk).facadeModuleId === 'inject_styles.js') {
								inject_styles = key;
							}

							else if ((chunk as OutputChunk).modules) {
								for (const id in (chunk as OutputChunk).modules) {
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

							if (!(chunk as OutputChunk).imports) {
								console.log(chunk);
							}

							(chunk as OutputChunk).imports.forEach(key => {
								if (key.endsWith('.css')) {
									js.add(inject_styles);
									css.add(key);
								} else {
									find_deps(key, js, css);
								}
							});

							return { js, css };
						};

						const get_deps = key => {
							const js: Set<string> = new Set();
							const css: Set<string> = new Set();

							find_deps(key, js, css);

							return {
								js: Array.from(js),
								css: Array.from(css)
							};
						};

						client.deps.__entry__ = get_deps(client.entry);

						manifest.components.forEach(component => {
							const file = component.file.replace(/\.svelte$/, '.js');
							const key = reverse_lookup.get(file);

							client.deps[component.name] = get_deps(key);
						});

						// not using this.emitFile because the manifest doesn't belong with client code
						fs.writeFileSync('.svelte/build/optimized/client.json', JSON.stringify(client, null, '  '));
					}
				},
				terser()
			],

			onwarn,

			// TODO ensure this works with external node modules (on server)
			external: id => id[0] !== '.' && !path.isAbsolute(id)
		});

		await client_chunks.write({
			dir: '.svelte/build/optimized/client',
			entryFileNames: '[name]-[hash].js',
			chunkFileNames: '[name]-[hash].js',
			assetFileNames: '[name]-[hash].js', // TODO CSS filenames aren't hashed?
			format: 'esm',
			sourcemap: true
		});

		log.success(`client`);
	}

	{
		// phase three — adapter
		header(`Generating app (${config.adapter})...`);
		await exec(`rm -rf build`); // TODO customize

		const adapter = relative(config.adapter);
		await adapter({
			dir: '.svelte/build/optimized',
			manifest,
			log
		});
	}

	log.success('done');
}