import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import vite from 'vite';
import { deep_merge } from '../../utils/object.js';
import { print_config_conflicts } from '../config/index.js';
import { copy_assets, get_aliases, get_runtime_path } from '../utils.js';
import { create_plugin } from './plugin.js';
import { generate_tsconfig } from '../tsconfig.js';

/**
 * @typedef {{
 *   cwd: string,
 *   port: number,
 *   host?: string,
 *   https: boolean,
 *   config: import('types').ValidatedConfig
 * }} Options
 * @typedef {import('types').SSRComponent} SSRComponent
 */

/** @param {Options} opts */
export async function dev({ cwd, port, host, https, config }) {
	copy_assets(path.join(config.kit.outDir, 'runtime'));

	generate_tsconfig(config);

	const [vite_config] = deep_merge(
		{
			server: {
				fs: {
					allow: [
						...new Set([
							config.kit.files.assets,
							config.kit.files.lib,
							config.kit.files.routes,
							config.kit.outDir,
							path.resolve(cwd, 'src'),
							path.resolve(cwd, 'node_modules'),
							path.resolve(vite.searchForWorkspaceRoot(cwd), 'node_modules')
						])
					]
				},
				strictPort: true
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
				extensions: config.extensions,
				// In AMP mode, we know that there are no conditional component imports. In that case, we
				// don't need to include CSS for components that are imported but unused, so we can just
				// include rendered CSS.
				// This would also apply if hydrate and router are both false, but we don't know if one
				// has been enabled at the page level, so we don't do anything there.
				emitCss: !config.kit.amp,
				compilerOptions: {
					hydratable: !!config.kit.browser.hydrate
				}
			}),
			await create_plugin(config, cwd)
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

	const address_info = /** @type {import('net').AddressInfo} */ (
		/** @type {import('http').Server} */ (server.httpServer).address()
	);

	return {
		address_info,
		server_config: vite_config.server,
		close: () => server.close()
	};
}
