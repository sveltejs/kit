import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import amp_validator from 'amphtml-validator';
import vite from 'vite';
import { rimraf } from '../../utils/filesystem.js';
import { deep_merge } from '../../utils/object.js';
import { print_config_conflicts } from '../config/index.js';
import { SVELTE_KIT } from '../constants.js';
import { copy_assets } from '../utils.js';
import { create_plugin } from './plugin.js';

/**
 * @typedef {{
 *   cwd: string,
 *   port: number,
 *   host?: string,
 *   https: boolean,
 *   config: import('types/config').ValidatedConfig
 * }} Options
 * @typedef {import('types/internal').SSRComponent} SSRComponent
 */

/** @param {Options} opts */
export async function dev({ cwd, port, host, https, config }) {
	const output = path.resolve(cwd, `${SVELTE_KIT}/dev`);

	rimraf(output);
	copy_assets(output);

	process.env.VITE_SVELTEKIT_AMP = config.kit.amp ? 'true' : '';

	const [vite_config] = deep_merge(
		{
			server: {
				fs: {
					allow: [
						...new Set([
							config.kit.files.assets,
							config.kit.files.lib,
							config.kit.files.routes,
							path.resolve(cwd, 'src'),
							path.resolve(cwd, SVELTE_KIT),
							path.resolve(cwd, 'node_modules'),
							path.resolve(vite.searchForWorkspaceRoot(cwd), 'node_modules')
						])
					]
				},
				strictPort: true
			}
		},
		config.kit.vite()
	);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(vite_config, {
		configFile: false,
		root: cwd,
		resolve: {
			alias: {
				$app: path.resolve(`${output}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		build: {
			rollupOptions: {
				// Vite dependency crawler needs an explicit JS entry point
				// eventhough server otherwise works without it
				input: path.resolve(`${output}/runtime/internal/start.js`)
			}
		},
		plugins: [
			svelte({
				extensions: config.extensions,
				emitCss: !config.kit.amp,
				compilerOptions: {
					hydratable: !!config.kit.hydrate
				}
			}),
			create_plugin(config, output, cwd, config.kit.amp && (await amp_validator.getInstance()))
		],
		publicDir: config.kit.files.assets,
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
