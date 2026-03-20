import path from 'node:path';
import process from 'node:process';
import create_manifest_data from './create_manifest_data/index.js';
import { write_client_manifest } from './write_client_manifest.js';
import { write_root } from './write_root.js';
import { write_tsconfig } from './write_tsconfig.js';
import { write_types, write_all_types } from './write_types/index.js';
import { write_ambient } from './write_ambient.js';
import { write_non_ambient } from './write_non_ambient.js';
import { write_server } from './write_server.js';
import {
	create_node_analyser,
	get_page_options
} from '../../exports/vite/static_analysis/index.js';

/**
 * Initialize SvelteKit's generated files that only depend on the config and mode.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode
 * @param {string} root The project root directory
 */
export function init(config, mode, root) {
	write_tsconfig(config.kit, root);
	write_ambient(config.kit, mode);
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
	write_root(manifest_data, config, output);
	write_all_types(config, manifest_data, root);
	write_non_ambient(config.kit, manifest_data);

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
	write_non_ambient(config.kit, manifest_data);
}

/**
 * Run sync.init and sync.create in series, returning the result from sync.create.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode The Vite mode
 * @param {string} root The project root directory
 */
export function all(config, mode, root) {
	init(config, mode, root);
	return create(config, root);
}

/**
 * Run sync.init and then generate all type files.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode The Vite mode
 */
export function all_types(config, mode) {
	const cwd = process.cwd();
	init(config, mode, cwd);
	const manifest_data = create_manifest_data({ config, cwd });
	write_all_types(config, manifest_data, cwd);
	write_non_ambient(config.kit, manifest_data);
}

/**
 * Regenerate `${output}/server/internal.js` in response to `src/{app.html,error.html,service-worker.js}` changing
 * @param {import('types').ValidatedConfig} config
 * @param {string} root The project root directory
 */
export function server(config, root) {
	write_server(config, path.join(config.kit.outDir, 'generated'), root);
}
