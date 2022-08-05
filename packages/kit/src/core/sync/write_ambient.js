import path from 'path';
import { get_env } from '../../vite/utils.js';
import { write_if_changed, reserved, valid_identifier } from './utils.js';

const autogen_comment = '// this file is generated — do not edit it\n';
const types_reference = '/// <reference types="@sveltejs/kit" />\n\n';

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode The Vite mode
 */
export function write_ambient(config, mode) {
	const env = get_env(mode, config.env.publicPrefix);

	write_if_changed(
		path.join(config.outDir, 'ambient.d.ts'),
		autogen_comment +
			types_reference +
			create_env_types('$env/static/public', env.public) +
			'\n\n' +
			create_env_types('$env/static/private', env.private)
	);
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function create_env_module(id, env) {
	/** @type {string[]} */
	const declarations = [];

	for (const key in env) {
		if (!valid_identifier.test(key) || reserved.has(key)) {
			continue;
		}

		const comment = `/** @type {import('${id}').${key}} */`;
		const declaration = `export const ${key} = ${JSON.stringify(env[key])};`;

		declarations.push(`${comment}\n${declaration}`);
	}

	return autogen_comment + declarations.join('\n\n');
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
function create_env_types(id, env) {
	const declarations = Object.keys(env)
		.filter((k) => valid_identifier.test(k))
		.map((k) => `\texport const ${k}: string;`)
		.join('\n');

	return `declare module '${id}' {\n${declarations}\n}`;
}
