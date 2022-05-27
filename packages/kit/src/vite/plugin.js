import { svelte as svelte_plugin } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { searchForWorkspaceRoot } from 'vite';
import { load_config, print_config_conflicts } from '../core/config/index.js';
import { get_aliases, get_runtime_path } from '../core/utils.js';
import { deep_merge } from '../utils/object.js';
import { configure_server } from './dev.js';

const cwd = process.cwd();

/**
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {import('vite').Plugin}
 */
const sveltekit = function (svelte_config) {
	return {
		name: 'vite-plugin-svelte-kit',

		async config(_config, env) {
			if (env.command === 'build') {
				throw Error('build not yet supported');
			}

			// dev and preview config can be shared
			const [vite_config] = deep_merge(
				{
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
								`${svelte_config.kit.outDir}/**`,
								`!${svelte_config.kit.outDir}/generated/**`
							]
						}
					},
					spa: false
				},
				await svelte_config.kit.vite()
			);

			/** @type {[any, string[]]} */
			const [merged_config, conflicts] = deep_merge(vite_config, {
				configFile: false,
				root: cwd,
				resolve: {
					alias: get_aliases(svelte_config)
				},
				build: {
					rollupOptions: {
						// Vite dependency crawler needs an explicit JS entry point
						// eventhough server otherwise works without it
						input: `${get_runtime_path(svelte_config)}/client/start.js`
					}
				},
				base: '/'
			});

			print_config_conflicts(conflicts, 'kit.vite.');

			return merged_config;
		},

		configureServer: configure_server(svelte_config)

		// TODO: implement configurePreviewServer for Vite 3
	};
};

/**
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {import('vite').Plugin[]}
 */
const svelte = function (svelte_config) {
	return svelte_plugin({
		...svelte_config,
		compilerOptions: {
			...svelte_config.compilerOptions,
			hydratable: !!svelte_config.kit.browser.hydrate
		},
		configFile: false
	});
};

/**
 * @param {import('types').ValidatedConfig} [svelte_config]
 * @return {Promise<import('vite').Plugin[]>}
 */
export const plugins = async function (svelte_config) {
	svelte_config = svelte_config || (await load_config());
	return [...svelte(svelte_config), sveltekit(svelte_config)];
};
