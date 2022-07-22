import path from 'path';
import { loadEnv } from 'vite';
import { write_if_changed } from './utils.js';

const autogen_comment = '// this file is generated — do not edit it\n';

/**
 * Writes the existing environment variables in process.env to
 * $app/env and $app/env/private
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode
 * The Vite mode.
 */
export function write_env(config, mode) {
	const entries = Object.entries(loadEnv(mode, process.cwd(), ''));
	const pub = Object.fromEntries(entries.filter(([k]) => k.startsWith(config.env.publicPrefix)));
	const prv = Object.fromEntries(entries.filter(([k]) => !k.startsWith(config.env.publicPrefix)));

	// TODO when testing src, `$app` points at `src/runtime/app`... will
	// probably need to fiddle with aliases
	write_if_changed(
		path.join(config.outDir, 'runtime/app/env/public.js'),
		create_module('$app/env/public', pub)
	);

	write_if_changed(
		path.join(config.outDir, 'runtime/app/env/private.js'),
		create_module('$app/env/private', prv)
	);

	write_if_changed(
		path.join(config.outDir, 'types/ambient.d.ts'),
		autogen_comment +
			create_types('$app/env/public', pub) +
			'\n\n' +
			create_types('$app/env/private', prv)
	);
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
function create_module(id, env) {
	const declarations = Object.entries(env)
		.map(
			([k, v]) => `/** @type {import('${id}'}').${k}} */\nexport const ${k} = ${JSON.stringify(v)};`
		)
		.join('\n\n');

	return autogen_comment + declarations;
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
function create_types(id, env) {
	const declarations = Object.keys(env)
		.map((k) => `\texport const ${k}: string;`)
		.join('\n');

	return `declare module '${id}' {\n${declarations}\n}`;
}
