/** @import { ExplicitEnvVar } from '../env.js' */
import path from 'node:path';
import { GENERATED_COMMENT } from '../../constants.js';
import { create_explicit_env_types } from '../env.js';
import { write_if_changed } from './utils.js';

/**
 * @param {import('../env.js').ExplicitEnvVar[]} explicit_env
 */
const template = (explicit_env) => `
${GENERATED_COMMENT}

/// <reference types="@sveltejs/kit" />

${create_explicit_env_types(explicit_env, 'private')}

${create_explicit_env_types(explicit_env, 'public')}
`;

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} config
 * @param {ExplicitEnvVar[]} explicit_env
 */
export function write_env(config, explicit_env) {
	write_if_changed(
		path.join(config.outDir, 'env.d.ts'),
		template(explicit_env)
	);
}
