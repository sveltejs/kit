import path from 'path';
import { get_env } from '../../vite/utils.js';
import { GENERATED_COMMENT } from '../constants.js';
import { create_types } from '../env.js';
import { write_if_changed } from './utils.js';

const types_reference = '/// <reference types="@sveltejs/kit" />\n\n';

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode The Vite mode
 */
export function write_ambient(config, mode) {
	const env = get_env(config.env, mode);

	write_if_changed(
		path.join(config.outDir, 'ambient.d.ts'),
		GENERATED_COMMENT +
			types_reference +
			create_types('$env/static/public', env.public) +
			'\n\n' +
			create_types('$env/static/private', env.private)
	);
}
