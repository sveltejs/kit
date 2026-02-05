import path from 'node:path';
import { dedent, write_if_changed } from './utils.js';
import { create_static_module } from '../env.js';
import { runtime_directory } from '../utils.js';
import { s } from '../../utils/misc.js';

/**
 * This version deviates from the one in env.js because we don't want to
 * serialise the user's dynamic environment variables. Instead, it loads the
 * environment variables directly. This is okay because it will only be used by
 * modules importing $env/dynamic/* from outside the Vite pipeline. Those inside
 * the Vite pipeline will load the virtual module which reuses the already loaded
 * environment variables.
 * @param {import('../env.js').EnvType} type
 * @returns {string}
 */
function create_dynamic_module(type) {
	return dedent`
		import { env as full_env } from './internal.js';

		export const env = full_env.${type};
	`;
}

/**
 * Writes env variable modules to the output directory
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode
 * @param {import('../../exports/vite/types.js').Env} env
 */
export function write_env(config, mode, env) {
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

	const env_dynamic = dedent`
		import { get_env } from '${runtime_directory}/../exports/vite/env.js';

		export const env = get_env(${s(config.env)}, ${s(mode)});
	`;
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'dynamic', 'internal.js'),
		env_dynamic
	);

	const env_dynamic_private = create_dynamic_module('private');
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'dynamic', 'private.js'),
		env_dynamic_private
	);

	const env_dynamic_public = create_dynamic_module('public');
	write_if_changed(
		path.join(config.outDir, 'generated', 'env', 'dynamic', 'public.js'),
		env_dynamic_public
	);
}
