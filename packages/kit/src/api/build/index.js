import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import colors from 'kleur';
import relative from 'require-relative';
import { mkdirp } from '@sveltejs/app-utils/files';
import create_manifest_data from '../../core/create_manifest_data';
import { rollup, } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import css_chunks from 'rollup-plugin-css-chunks';
import { copy_assets } from '../utils';
import { create_app } from '../../core/create_app';

import { css_injection } from './css_injection';
import Builder from './Builder';

const exec = promisify(child_process.exec);

const snowpack_main = require.resolve('snowpack');
const snowpack_pkg_file = path.join(snowpack_main, '../../package.json');
const snowpack_pkg = require(snowpack_pkg_file); // eslint-disable-line
const snowpack_bin = path.resolve(path.dirname(snowpack_pkg_file), snowpack_pkg.bin.snowpack);

const ignorable_warnings = new Set(['EMPTY_BUNDLE', 'CIRCULAR_DEPENDENCY', 'MISSING_EXPORT']);
const onwarn = (warning, handler) => {
	// TODO would be nice to just eliminate the circular dependencies instead of
	// squelching these warnings (it happens when e.g. the root layout imports
	// from /_app/main/runtime/navigation)
	if (ignorable_warnings.has(warning.code)) return;
	handler(warning);
};

export async function build(config) {
	if (!config.adapter) {
		throw new Error('No adapter specified');
	}

	const manifest = create_manifest_data('src/routes'); // TODO make configurable, without breaking Snowpack config

	mkdirp('.svelte/main');
	create_app({
		manifest_data: manifest,
		output: '.svelte/main'
	});

	const header = (msg) => console.log(colors.bold().cyan(`\n> ${msg}`));

	const log = (msg) => console.log(msg.replace(/^/gm, '  '));
	log.success = (msg) => log(colors.green(`✔ ${msg}`));
	log.error = (msg) => log(colors.bold().red(msg));
	log.warn = (msg) => log(colors.bold().yellow(msg));
	log.minor = (msg) => log(colors.grey(msg));
	log.info = log;

	const unoptimized = '.svelte/build/unoptimized';

	{
		// phase one — build with Snowpack
		header('Creating unoptimized build...');
		await rimraf('.svelte/build/unoptimized');

		copy_assets();

		const setup_file = `${unoptimized}/server/_app/setup/index.js`;
		if (!fs.existsSync(setup_file)) {
			mkdirp(path.dirname(setup_file));
			fs.writeFileSync(setup_file, '');
		}

		await exec(`node ${snowpack_bin} build --out=${unoptimized}/server --ssr`);
		log.success('server');
		await exec(`node ${snowpack_bin} build --out=${unoptimized}/client`);
		log.success('client');
	}

	{
		// phase two — optimise
		header('Optimizing...');
		await rimraf('.svelte/build/optimized');

		const server_input = {
			root: `${unoptimized}/server/_app/main/generated/root.js`,
			setup: `${unoptimized}/server/_app/setup/index.js`
		};

		[
			manifest.layout, // TODO is this necessary? if so why isn't manifest.error?
			...manifest.components,
			...manifest.endpoints
		].forEach((item) => {
			server_input[`routes/${item.name}`] = `${unoptimized}/server${item.url.replace(
				/\.\w+$/,
				'.js'
			)}`;
		});

		// https://github.com/snowpackjs/snowpack/discussions/1395
		const re = /(\.\.\/)+_app\/main\/runtime\//;
		const work_around_alias_bug = (type) => ({
			name: 'work-around-alias-bug',
			resolveId(imported) {
				if (re.test(imported)) {
					return path.resolve(`${unoptimized}/${type}/_app/main/runtime`, imported.replace(re, ''));
				}
			}
		});

		const server_chunks = await rollup({
			input: server_input,
			plugins: [
				work_around_alias_bug('server'),
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
			dir: '.svelte/build/optimized/server',
			format: 'cjs', // TODO some adapters might want ESM?
			exports: 'named',
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name].js',
			assetFileNames: 'assets/[name].js',
			sourcemap: true
		});

		log.success('server');

		const entry = path.resolve(`${unoptimized}/client/_app/main/runtime/navigation.js`);

		const client_chunks = await rollup({
			input: {
				entry
			},
			plugins: [
				work_around_alias_bug('client'),
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

						const routes = path.resolve(`${unoptimized}/client/_app/routes`);
						const client


 = {
							entry: null,
							deps: {}
						};

						let inject_styles;

						for (const key in bundle) {
							const chunk = bundle[key];

							if ((chunk ).facadeModuleId === entry) {
								client.entry = key;
							} else if ((chunk ).facadeModuleId === 'inject_styles.js') {
								inject_styles = key;
							} else if ((chunk ).modules) {
								for (const id in (chunk ).modules) {
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
								const imports = (chunk ).imports;

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
							const file = component.file.replace(/\.svelte$/, '.js');
							const key = reverse_lookup.get(file);

							client.deps[component.name] = get_deps(key);
						});

						// not using this.emitFile because the manifest doesn't belong with client code
						fs.writeFileSync(
							'.svelte/build/optimized/client.json',
							JSON.stringify(client, null, '  ')
						);
					}
				},
				terser()
			],

			onwarn,

			// TODO ensure this works with external node modules (on server)
			external: (id) => id[0] !== '.' && !path.isAbsolute(id)
		});

		await client_chunks.write({
			dir: '.svelte/build/optimized/client',
			entryFileNames: '[name]-[hash].js',
			chunkFileNames: '[name]-[hash].js',
			assetFileNames: '[name]-[hash].js', // TODO CSS filenames aren't hashed?
			format: 'esm',
			sourcemap: true
		});

		log.success('client');
	}

	{
		// phase three — adapter
		header(`Generating app (${config.adapter})...`);

		const builder = new Builder({
			generated_files: '.svelte/build/optimized',
			static_files: 'static',
			manifest,
			log
		});

		const adapter: Adapter = relative(config.adapter);
		await adapter(builder);
	}

	log.success('done');
}

async function rimraf(path) {
	return new Promise((resolve) => {
		((fs).rm || fs.rmdir)(path, { recursive: true, force: true }, () => resolve());
	});
}
