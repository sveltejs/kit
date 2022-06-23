import { svelte as svelte_plugin } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import colors from 'kleur';
import path from 'path';
import { searchForWorkspaceRoot } from 'vite';
import { mkdirp, posixify, rimraf } from '../utils/filesystem.js';
import * as sync from '../core/sync/sync.js';
import { build_server } from './build/build_server.js';
import { build_service_worker } from './build/build_service_worker.js';
import { prerender } from './build/prerender/prerender.js';
import { load_config, print_config_conflicts } from '../core/config/index.js';
import { dev } from './dev/index.js';
import { generate_manifest } from '../core/generate_manifest/index.js';
import { get_aliases, get_runtime_path, logger, resolve_entry } from '../core/utils.js';
import { find_deps, get_default_config } from './build/utils.js';
import { preview } from './preview/index.js';
import { deep_merge } from './utils.js';

const cwd = process.cwd();

/**
 * @return {import('vite').Plugin}
 */
export const sveltekit = function () {
	/** @type {import('types').ValidatedConfig} */
	let svelte_config;

	/** @type {import('vite').UserConfig} */
	let vite_user_config;

	/** @type {import('vite').ResolvedConfig} */
	let vite_resolved_config;

	/** @type {import('types').ManifestData|undefined} */
	let manifest_data = undefined;

	return {
		name: 'vite-plugin-svelte-kit',

		async config(_config, env) {
			vite_user_config = _config;

			svelte_config = await load_config();

			const build_dir = path.join(svelte_config.kit.outDir, 'build');
			const output_dir = path.join(svelte_config.kit.outDir, 'output');
			const client_out_dir = `${output_dir}/client/${svelte_config.kit.appDir}`;
			const client_entry_file = path.relative(
				cwd,
				`${get_runtime_path(svelte_config.kit)}/client/start.js`
			);

			if (env.command === 'build') {
				rimraf(build_dir);
				mkdirp(build_dir);

				rimraf(output_dir);
				mkdirp(output_dir);

				process.env.VITE_SVELTEKIT_APP_VERSION = svelte_config.kit.version.name;
				process.env.VITE_SVELTEKIT_APP_VERSION_FILE = `${svelte_config.kit.appDir}/version.json`;
				process.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL = `${svelte_config.kit.version.pollInterval}`;

				manifest_data = sync.all(svelte_config).manifest_data;

				/** @type {Record<string, string>} */
				const input = {
					start: path.resolve(cwd, client_entry_file)
				};

				// This step is optional — Vite/Rollup will create the necessary chunks
				// for everything regardless — but it means that entry chunks reflect
				// their location in the source code, which is helpful for debugging
				manifest_data.components.forEach((file) => {
					const resolved = path.resolve(cwd, file);
					const relative = path.relative(svelte_config.kit.files.routes, resolved);

					const name = relative.startsWith('..')
						? path.basename(file)
						: posixify(path.join('pages', relative));
					input[name] = resolved;
				});

				/** @type {[any, string[]]} */
				const [merged_config, conflicts] = deep_merge(
					{},
					get_default_config({
						client_out_dir,
						config: svelte_config,
						input,
						output_dir,
						ssr: false
					})
				);

				print_config_conflicts(conflicts, 'kit.vite.', 'build_client');

				return merged_config;
			}

			// dev and preview config can be shared
			const vite_config = {
				preview: {
					port: 3000,
					strictPort: true
				},
				server: {
					fs: {
						allow: [
							...new Set([
								svelte_config.kit.files.lib,
								svelte_config.kit.files.routes,
								svelte_config.kit.outDir,
								path.resolve(cwd, 'src'),
								path.resolve(cwd, 'node_modules'),
								path.resolve(searchForWorkspaceRoot(cwd), 'node_modules')
							])
						]
					},
					port: 3000,
					strictPort: true,
					watch: {
						ignored: [
							// Ignore all siblings of config.kit.outDir/generated
							`${posixify(svelte_config.kit.outDir)}/!(generated)`
						]
					}
				},
				spa: false
			};

			/** @type {[any, string[]]} */
			const [merged_config, conflicts] = deep_merge(vite_config, {
				configFile: false,
				root: cwd,
				resolve: {
					alias: get_aliases(svelte_config.kit)
				},
				build: {
					rollupOptions: {
						// Vite dependency crawler needs an explicit JS entry point
						// eventhough server otherwise works without it
						input: `${get_runtime_path(svelte_config.kit)}/client/start.js`
					}
				},
				base: '/'
			});

			// TODO: compare resolved config to defaults to validate
			print_config_conflicts(conflicts, 'kit.vite.');

			return merged_config;
		},

		configResolved(config) {
			vite_resolved_config = config;
		},

		async writeBundle(_options, bundle) {
			if (!manifest_data) throw Error('manifest_data not populated');

			const log = logger({ verbose: !!process.env.VERBOSE });

			const build_dir = path.join(svelte_config.kit.outDir, 'build');
			const output_dir = path.join(svelte_config.kit.outDir, 'output');
			const client_out_dir = `${output_dir}/client/${svelte_config.kit.appDir}`;
			const client_entry_file = path.relative(
				cwd,
				`${get_runtime_path(svelte_config.kit)}/client/start.js`
			);

			/** @type {import('rollup').OutputChunk[]} */
			const chunks = [];
			/** @type {import('rollup').OutputAsset[]} */
			const assets = [];
			for (const key of Object.keys(bundle)) {
				// collect asset and output chunks
				if (bundle[key].type === 'asset') {
					assets.push(/** @type {import('rollup').OutputAsset} */ (bundle[key]));
				} else {
					chunks.push(/** @type {import('rollup').OutputChunk} */ (bundle[key]));
				}
			}

			/** @type {import('vite').Manifest} */
			const vite_manifest = JSON.parse(
				fs.readFileSync(`${client_out_dir}/immutable/manifest.json`, 'utf-8')
			);

			const entry = posixify(client_entry_file);
			const entry_js = new Set();
			const entry_css = new Set();
			find_deps(entry, vite_manifest, entry_js, entry_css);

			fs.writeFileSync(
				`${client_out_dir}/version.json`,
				JSON.stringify({ version: process.env.VITE_SVELTEKIT_APP_VERSION })
			);
			const client = {
				assets,
				chunks,
				entry: {
					file: vite_manifest[entry].file,
					js: Array.from(entry_js),
					css: Array.from(entry_css)
				},
				vite_manifest
			};
			log.info(`Client build completed. Wrote ${chunks.length} chunks and ${assets.length} assets`);

			const options = {
				cwd,
				config: svelte_config,
				build_dir,
				manifest_data,
				output_dir,
				client_entry_file,
				service_worker_entry_file: resolve_entry(svelte_config.kit.files.serviceWorker)
			};

			log.info('Building server');

			const server = await build_server(vite_user_config, options, client);

			process.env.SVELTEKIT_SERVER_BUILD_COMPLETED = 'true';

			/** @type {import('types').BuildData} */
			const build_data = {
				app_dir: svelte_config.kit.appDir,
				manifest_data,
				service_worker: options.service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
				client,
				server
			};

			const manifest = `export const manifest = ${generate_manifest({
				build_data,
				relative_path: '.',
				routes: manifest_data.routes
			})};\n`;
			fs.writeFileSync(`${output_dir}/server/manifest.js`, manifest);

			const static_files = manifest_data.assets.map((asset) => posixify(asset.file));

			const files = new Set([
				...static_files,
				...chunks.map((chunk) => `${svelte_config.kit.appDir}/immutable/${chunk.fileName}`),
				...assets.map((chunk) => `${svelte_config.kit.appDir}/immutable/${chunk.fileName}`)
			]);

			// TODO is this right?
			static_files.forEach((file) => {
				if (file.endsWith('/index.html')) {
					files.add(file.slice(0, -11));
				}
			});

			log.info('Prerendering');

			const prerendered = await prerender({
				config: svelte_config.kit,
				entries: manifest_data.routes
					.map((route) => (route.type === 'page' ? route.path : ''))
					.filter(Boolean),
				files,
				log
			});

			if (options.service_worker_entry_file) {
				if (svelte_config.kit.paths.assets) {
					throw new Error('Cannot use service worker alongside config.kit.paths.assets');
				}

				log.info('Building service worker');

				await build_service_worker(vite_user_config, options, prerendered, client.vite_manifest);
			}

			console.log(
				`\nRun ${colors.bold().cyan('npm run preview')} to preview your production build locally.`
			);

			if (svelte_config.kit.adapter) {
				const { adapt } = await import('./build/adapt/index.js');
				await adapt(svelte_config, build_data, prerendered, { log });

				// this is necessary to close any open db connections, etc
				process.exit(0);
			}

			console.log(colors.bold().yellow('\nNo adapter specified'));

			// prettier-ignore
			console.log(
				`See ${colors.bold().cyan('https://kit.svelte.dev/docs/adapters')} to learn how to configure your app to run on the platform of your choosing`
			);
		},

		async configureServer(vite) {
			return await dev(vite, svelte_config);
		},

		configurePreviewServer(vite) {
			return preview(vite, svelte_config, vite_resolved_config);
		}
	};
};

/**
 * @return {import('vite').Plugin[]}
 */
export const svelte = function () {
	// TODO what is the purpose of this function? Why do we not just re-export it?
	return svelte_plugin();
};

/**
 * @return {import('vite').Plugin[]}
 */
export const plugins = function () {
	return [...svelte(), sveltekit()];
};
