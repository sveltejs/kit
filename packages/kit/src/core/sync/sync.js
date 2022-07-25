import path from 'path';
import create_manifest_data from './create_manifest_data/index.js';
import { copy_assets } from './copy_assets.js';
import { write_manifest } from './write_manifest.js';
import { write_matchers } from './write_matchers.js';
import { write_root } from './write_root.js';
import { write_tsconfig } from './write_tsconfig.js';
import { write_types } from './write_types.js';
import { write_env } from './write_env.js';

/**
 * Initialize SvelteKit's generated files.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode
 */
export function init(config, mode) {
	copy_assets(path.join(config.kit.outDir, 'runtime'));

	write_tsconfig(config.kit);
	write_env(config.kit, mode);
}

/**
 * Update SvelteKit's generated files.
 * @param {import('types').ValidatedConfig} config
 */
export function update(config) {
	const manifest_data = create_manifest_data({ config });

	const output = path.join(config.kit.outDir, 'generated');
	const base = path.relative('.', output);

	write_manifest(manifest_data, base, output);
	write_root(manifest_data, output);
	write_matchers(manifest_data, output);
	write_types(config, manifest_data);

	return { manifest_data };
}

/**
 * Run sync.init and sync.update in series, returning the result from sync.update.
 * @param {import('types').ValidatedConfig} config
 * @param {string} mode The Vite mode
 */
export function all(config, mode) {
	init(config, mode);
	return update(config);
}
