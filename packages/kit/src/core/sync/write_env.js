/** @import { EnvVarConfig } from '@sveltejs/kit' */
import path from 'node:path';
import { create_explicit_env_types } from '../env.js';
import { posixify } from '../../utils/filesystem.js';
import { write_if_changed } from './utils.js';

const DOCS = '// See https://svelte.dev/docs/kit/environment-variables for more information';

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string | null} entry
 * @param {Record<string, EnvVarConfig<any>> | null} env_config
 */
export function write_env(kit, entry, env_config) {
	const content = [];
	const out = path.join(kit.outDir, 'env.d.ts');

	if (entry && env_config) {
		const relative = posixify(path.relative(kit.outDir, entry));
		content.push(
			`// This file is generated from ${relative}.\n${DOCS}`,
			create_explicit_env_types(env_config, relative, 'private'),
			create_explicit_env_types(env_config, relative, 'public')
		);
	} else {
		content.push(DOCS);
	}

	write_if_changed(out, content.join('\n\n'));
}
