import { write_if_changed } from './utils.js';
import path from 'path';
import fs from 'fs';
import { loadEnv } from 'vite';

const autogen_comment = '// this section is auto-generated';

/**
 * @param {boolean} pub
 * @param {Record<string, string>} env
 * @returns {string}
 */
function const_declaration_template(pub, env) {
	return `${autogen_comment}

${Object.entries(env)
	.map(
		([k, v]) => `/**
 * @type {import('$app/env${pub ? '' : '/private'}').${k}}
 */
export const ${k} = ${JSON.stringify(v)};
`
	)
	.join('\n')}
`;
}

/**
 * @param {boolean} pub
 * @param {Record<string, string>} env
 * @returns {string}
 */
function type_declaration_template(pub, env) {
	return `declare module '$app/env${pub ? '' : '/private'}' {
  ${Object.keys(env)
		.map((k) => `export const ${k}: string;`)
		.join('\n  ')}
}`;
}

function runtime_env_template() {
	return `/** @type {App.RuntimeEnv} */
export let env = {};

/** @type {(environment: Record<string, string>) => void} */
export function set_env(environment) {
  env = environment;
}`;
}

/**
 * Writes the existing environment variables in process.env to
 * $app/env and $app/env/private
 * @param {import('types').ValidatedKitConfig} config
 * @param {string | undefined} mode
 * The Vite mode.
 */
export function write_env(config, mode = undefined) {
	const pub = write_public_env(config, mode);
	const priv = write_private_env(config, mode);
	write_runtime_env(config);
	write_typedef(config, pub, priv);
}

/**
 * Writes the existing environment variables prefixed with config.kit.env.publicPrefix
 * in process.env to $app/env
 * @param {import('types').ValidatedKitConfig} config
 * @param {string | undefined} mode
 * The Vite mode.
 */
function write_public_env(config, mode = undefined) {
	const pub_out = path.join(config.outDir, 'runtime/app/env.js');

	// public is a little difficult since we append to an
	// already-existing file
	const pub = loadEnv(mode, process.cwd(), config.env.publicPrefix);
	let pub_content = const_declaration_template(true, pub);
	if (fs.existsSync(pub_out)) {
		const old_pub_content = fs.readFileSync(pub_out).toString();
		const autogen_content_start = old_pub_content.indexOf(autogen_comment);
		if (autogen_content_start === -1) {
			pub_content = old_pub_content + '\n' + pub_content;
		} else {
			pub_content = old_pub_content.slice(0, autogen_content_start) + '\n' + pub_content;
		}
	}
	write_if_changed(pub_out, pub_content);
	return pub;
}

/**
 * Writes the existing environment variables not prefixed with config.kit.env.publicPrefix
 * in process.env to $app/env/private
 * @param {import('types').ValidatedKitConfig} config
 * @param {string | undefined} mode
 * The Vite mode.
 */
function write_private_env(config, mode = undefined) {
	const priv_out = path.join(config.outDir, 'runtime/app/env/private.js');

	// private is easy since it has its own file: just write if changed
	const priv = loadEnv(mode, process.cwd(), '');
	const priv_content = const_declaration_template(false, priv);
	write_if_changed(priv_out, priv_content);
	return priv;
}

/**
 * Writes a blank export to $app/env/runtime. This should be populated by
 * Server.init whenever an adapter calls it
 * @param {import('types').ValidatedKitConfig} config
 */
function write_runtime_env(config) {
	const runtime_out = path.join(config.outDir, 'runtime/app/env/runtime.js');

	write_if_changed(runtime_out, runtime_env_template());
}

/**
 * Writes the type definitions for the environment variable files
 * to types/ambient.d.ts
 * @param {import('types').ValidatedKitConfig} config
 * @param {Record<string, string>} pub
 * @param {Record<string, string>} priv
 */
function write_typedef(config, pub, priv) {
	const type_declaration_out = path.join(config.outDir, 'types/ambient.d.ts');
	const pub_declaration = type_declaration_template(true, pub);
	const priv_declaration = type_declaration_template(false, priv);
	write_if_changed(type_declaration_out, `${priv_declaration}\n${pub_declaration}`);
}
