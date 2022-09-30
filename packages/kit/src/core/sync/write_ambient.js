import fs from 'fs';
import path from 'path';
import { get_env } from '../../exports/vite/utils.js';
import { GENERATED_COMMENT } from '../../constants.js';
import { create_dynamic_types, create_static_types } from '../env.js';
import { write_if_changed } from './utils.js';
import { fileURLToPath } from 'url';

const descriptions_dir = fileURLToPath(new URL('../../../scripts/special-types', import.meta.url));

/** @param {string} filename */
function read_description(filename) {
	const content = fs.readFileSync(`${descriptions_dir}/${filename}`, 'utf8');
	return `/**\n${content
		.trim()
		.split('\n')
		.map((line) => ` * ${line}`)
		.join('\n')}\n */`;
}

/**
 * @param {{ public: Record<string, string>, private: Record<string, string> }} env
 */
const template = (env) => `
${GENERATED_COMMENT}

/// <reference types="@sveltejs/kit" />

${read_description('$env+static+private.md')}
${create_static_types('$env/static/private', env.private)}

${read_description('$env+static+public.md')}
${create_static_types('$env/static/public', env.public)}

${read_description('$env+dynamic+private.md')}
${create_dynamic_types('$env/dynamic/private', env.private)}

${read_description('$env+dynamic+public.md')}
${create_dynamic_types('$env/dynamic/public', env.public)}
`;

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode The Vite mode
 */
export function write_ambient(config, mode) {
	const env = get_env(config.env, mode);

	write_if_changed(path.join(config.outDir, 'ambient.d.ts'), template(env));
}
