import path from 'path';
import create_manifest_data from './create_manifest_data/index.js';
import { write_client_manifest } from './write_client_manifest.js';
import { write_matchers } from './write_matchers.js';
import { write_root } from './write_root.js';
import { write_tsconfig } from './write_tsconfig.js';
import { write_types } from './write_types.js';
import { write_ambient } from './write_ambient.js';

/**
 * Initialize SvelteKit's generated files.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode
 */
export function init(config, mode) {
	write_tsconfig(config.kit);
	write_ambient(config.kit, mode);
}

/**
 * Update SvelteKit's generated files.
 * @param {import('types').ValidatedConfig} config
 */
export async function update(config) {
	const manifest_data = create_manifest_data({ config });

	const output = path.join(config.kit.outDir, 'generated');

	write_client_manifest(manifest_data, output);
	write_root(manifest_data, output);
	write_matchers(manifest_data, output);
	await write_types(config, manifest_data);

	return { manifest_data };
}

/**
 * Run sync.init and sync.update in series, returning the result from sync.update.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode The Vite mode
 */
export async function all(config, mode) {
	init(config, mode);
	return await update(config);
}
