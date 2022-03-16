import path from 'path';
import create_manifest_data from './create_manifest_data/index.js';
import { copy_assets } from './copy_assets.js';
import { write_manifest } from './write_manifest.js';
import { write_root } from './write_root.js';
import { write_tsconfig } from './write_tsconfig.js';
import { write_types } from './write_types.js';
import { write_validators } from './write_validators.js';

/** @param {import('types').ValidatedConfig} config */
export function init(config) {
	copy_assets(path.join(config.kit.outDir, 'runtime'));
	write_tsconfig(config);
}

/** @param {import('types').ValidatedConfig} config */
export function update(config) {
	const manifest_data = create_manifest_data({ config });

	const output = path.join(config.kit.outDir, 'generated');
	const base = path.relative('.', output);

	write_manifest(manifest_data, base, output);
	write_root(manifest_data, output);
	write_validators(manifest_data, output);
	write_types(config, manifest_data);

	return { manifest_data };
}

/** @param {import('types').ValidatedConfig} config */
export function all(config) {
	init(config);
	return update(config);
}
