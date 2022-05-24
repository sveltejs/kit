import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import * as vite from 'vite';
import { deep_merge } from '../../utils/object.js';
import { load_config, print_config_conflicts } from '../config/index.js';
import { get_aliases, get_runtime_path } from '../utils.js';
import { create_plugin } from './plugin.js';

const cwd = process.cwd();

/**
 * @typedef {{
 *   port: number,
 *   host?: string,
 *   https: boolean,
 * }} Options
 * @typedef {import('types').SSRComponent} SSRComponent
 */

/** @param {Options} opts */
export async function dev({ port, host, https }) {
	/** @type {import('types').ValidatedConfig} */
	const config = await load_config();

	const [vite_config] = deep_merge(
		{
			server: {
				fs: {
					allow: [
						...new Set([
							config.kit.files.lib,
							config.kit.files.routes,
							config.kit.outDir,
							path.resolve(cwd, 'src'),
							path.resolve(cwd, 'node_modules'),
							path.resolve(vite.searchForWorkspaceRoot(cwd), 'node_modules')
						])
					]
				},
				port: 3000,
				strictPort: true,
				watch: {
					ignored: [`${config.kit.outDir}/**`, `!${config.kit.outDir}/generated/**`]
				}
			}
		},
		await config.kit.vite()
	);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(vite_config, {
		configFile: false,
		root: cwd,
		resolve: {
			alias: get_aliases(config)
		},
		build: {
			rollupOptions: {
				// Vite dependency crawler needs an explicit JS entry point
				// eventhough server otherwise works without it
				input: `${get_runtime_path(config)}/client/start.js`
			}
		},
		plugins: [
			svelte({
				...config,
				emitCss: true,
				compilerOptions: {
					...config.compilerOptions,
					hydratable: !!config.kit.browser.hydrate
				},
				configFile: false
			}),
			await create_plugin(config)
		],
		base: '/'
	});

	print_config_conflicts(conflicts, 'kit.vite.');

	// optional config from command-line flags
	// these should take precedence, but not print conflict warnings
	if (host) {
		merged_config.server.host = host;
	}

	// if https is already enabled then do nothing. it could be an object and we
	// don't want to overwrite with a boolean
	if (https && !merged_config.server.https) {
		merged_config.server.https = https;
	}

	if (port) {
		merged_config.server.port = port;
	}

	const server = await vite.createServer(merged_config);
	await server.listen(port);

	return {
		server,
		config
	};
}
