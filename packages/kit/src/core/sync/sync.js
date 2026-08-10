import path from 'node:path';
import create_manifest_data from './create_manifest_data/index.js';
import { write_client_manifest } from './write_client_manifest.js';
import { write_tsconfig } from './write_tsconfig/index.js';
import { write_types, write_all_types } from './write_types/index.js';
import { write_app_types } from './write_app_types.js';
import { write_server } from './write_server.js';
import {
	create_node_analyser,
	get_page_options
} from '../../exports/vite/static_analysis/index.js';
import { load_explicit_env } from '../env.js';
import { write_env } from './write_env.js';

/**
 * Initialize SvelteKit's generated files that only depend on the config and mode.
 * @param {import('types').ValidatedConfig} config
 * @param {string} root The project root directory
 */
export function init(config, root) {
	write_tsconfig(config.kit, root);
}

/**
 * Update SvelteKit's generated files
 * @param {import('types').ValidatedConfig} config
 * @param {string} root The project root directory
 */
export function create(config, root) {
	const manifest_data = create_manifest_data({ config, cwd: root });

	const output = path.join(config.kit.outDir, 'generated');

	write_client_manifest(config.kit, manifest_data, `${output}/client`);
	write_server(config, output, root);
	write_all_types(config, manifest_data, root);
	write_app_types(config.kit, manifest_data, root);

	return { manifest_data };
}

/**
 * Update SvelteKit's generated files in response to a single file content update.
 * Do not call this when the file in question was created/deleted.
 *
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} file
 * @param {string} root The project root directory
 */
export function update(config, manifest_data, file, root) {
	const node_analyser = create_node_analyser(root);

	for (const node of manifest_data.nodes) {
		node.page_options = node_analyser.get_page_options(node);
	}

	for (const route of manifest_data.routes) {
		if (route.endpoint) {
			route.endpoint.page_options = get_page_options(route.endpoint.file, root);
		}
	}

	write_types(config, manifest_data, file, root);
	write_app_types(config.kit, manifest_data, root);
}

/**
 * Run sync.init and sync.create in series, returning the result from sync.create.
 * @param {import('types').ValidatedConfig} config
 * @param {string} root The project root directory
 */
export function all(config, root) {
	init(config, root);
	return create(config, root);
}

/**
 * Run sync.init and then generate all type files.
 * @param {import('types').ValidatedConfig} config
 * @param {string} root
 */
export function all_types(config, root) {
	init(config, root);
	const manifest_data = create_manifest_data({ config, cwd: root });
	write_all_types(config, manifest_data, root);
	write_app_types(config.kit, manifest_data, root);
}

/**
 * Generate modules and types for explicit env vars
 * @param {typeof import('vite')} vite
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string | null} entry
 * @param {string} root The Vite root
 * @param {string} mode The Vite mode
 */
export async function env(vite, kit, entry, root, mode) {
	const env_config = await load_explicit_env(vite, kit, entry, root, mode);

	write_env(entry, env_config, root);

	return env_config;
}

/**
 * Regenerate __SERVER__/internal.js in response to src/{app.html,error.html,service-worker.js} changing
 * @param {import('types').ValidatedConfig} config
 * @param {string} root The project root directory
 */
export function server(config, root) {
	write_server(config, path.join(config.kit.outDir, 'generated'), root);
}
