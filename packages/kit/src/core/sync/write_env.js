/** @import { EnvVarConfig } from '@sveltejs/kit' */
import path from 'node:path';
import { create_explicit_env_types } from '../env.js';
import { write_if_changed } from './utils.js';
import { posixify } from '../../utils/os.js';

const DOCS = '// See https://svelte.dev/docs/kit/environment-variables for more information';

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {string | null} entry
 * @param {Record<string, EnvVarConfig<any>> | null} env_config
 * @param {string} root
 */
export function write_env(entry, env_config, root) {
	const content = [];

	const dir = path.join(root, 'node_modules/$app/types');
	const out = path.join(dir, 'env.d.ts');

	if (entry && env_config) {
		const relative = posixify(path.relative(dir, entry));
		content.push(
			`// This file is generated from ${relative}.\n${DOCS}`,
			create_explicit_env_types(env_config, relative, 'private'),
			create_explicit_env_types(env_config, relative, 'public')
		);
	} else {
		content.push(
			DOCS,
			create_explicit_env_types({}, '', 'private'),
			create_explicit_env_types({}, '', 'public')
		);
	}

	write_if_changed(out, content.join('\n\n'));
}
