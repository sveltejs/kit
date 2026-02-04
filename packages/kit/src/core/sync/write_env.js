import path from 'node:path';
import { write_if_changed } from './utils.js';
import { create_dynamic_module, create_static_module } from '../env.js';

/**
 * Writes env variable modules to the output directory
 * @param {import('types').ValidatedKitConfig} config
 * @param {import('../../exports/vite/types.js').Env} env
 */
export function write_env(config, env) {
	const env_static_private = create_static_module('$env/static/private', env.private);
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'static', 'private.js'),
		env_static_private
	);

	const env_static_public = create_static_module('$env/static/public', env.public);
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'static', 'public.js'),
		env_static_public
	);

	const env_dynamic_private = create_dynamic_module('private', env.private);
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'dynamic', 'private.js'),
		env_dynamic_private
	);

	const env_dynamic_public = create_dynamic_module('public', env.public);
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'dynamic', 'public.js'),
		env_dynamic_public
	);
}
