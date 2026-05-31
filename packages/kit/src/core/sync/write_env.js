/** @import { EnvVarConfig } from '@sveltejs/kit' */
import path from 'node:path';
import { GENERATED_COMMENT } from '../../constants.js';
import { create_explicit_env_types } from '../env.js';
import { write_if_changed } from './utils.js';

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} kit
 * @param {Record<string, EnvVarConfig> | null} env_config
 */
export function write_env(kit, env_config) {
	const content = [GENERATED_COMMENT];

	if (env_config) {
		content.push(create_explicit_env_types(env_config, 'private'), create_explicit_env_types(env_config, 'public'))
	}

	write_if_changed(
		path.join(kit.outDir, 'env.d.ts'),
		content.join('\n\n')
	);
}
