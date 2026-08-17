/** @import { ValidatedConfig, ManifestData } from 'types' */
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
 * Update SvelteKit's generated files
 * @param {ValidatedConfig} config
 * @param {string} root The project root directory
 * @param {ManifestData} manifest_data
 * @param {boolean} is_build
 */
export function create(config, root, manifest_data, is_build) {
	const output = path.join(config.outDir, `generated/${is_build ? 'build' : 'dev'}`);

	write_client_manifest(config, manifest_data, `${output}/client`, root);
	write_server(config, output, root);
	write_all_types(config, manifest_data, root);
	write_app_types(config, manifest_data, root);
}

/**
 * Update SvelteKit's generated files in response to a single file content update.
 * Do not call this when the file in question was created/deleted.
 *
 * @param {ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} file
 * @param {string} root The project root directory
 * @returns {boolean} Whether the update completed, or a full manifest rebuild is needed
 */
export function update(config, manifest_data, file, root) {
	try {
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
		write_app_types(config, manifest_data, root);
	} catch (error) {
		// A route file can disappear before the watcher delivers its unlink event. In that case,
		// the manifest is stale and must be rebuilt instead of incrementally updated.
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return false;
		}

		throw error;
	}

	return true;
}

/**
 * Run write_tsconfig and sync.create in series during build
 * @param {ValidatedConfig} config
 * @param {string} root The project root directory
 * @param {ManifestData} manifest_data
 */
export function all(config, root, manifest_data) {
	write_tsconfig(config, root);
	create(config, root, manifest_data, true);
}

/**
 * Run sync.init and then generate all type files.
 * @param {ValidatedConfig} config
 * @param {string} root
 */
export function all_types(config, root) {
	write_tsconfig(config, root);
	const manifest_data = create_manifest_data(config, root);
	write_all_types(config, manifest_data, root);
	write_app_types(config, manifest_data, root);
}

/**
 * Generate modules and types for explicit env vars
 * @param {ValidatedConfig} kit
 * @param {string | null} entry
 * @param {string} root The Vite root
 * @param {string} mode The Vite mode
 */
export async function env(kit, entry, root, mode) {
	const env_config = await load_explicit_env(kit, entry, root, mode);

	write_env(entry, env_config.variables, root);

	return env_config;
}
