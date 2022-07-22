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

/**
 * Writes the existing environment variables in process.env to
 * $app/env and $app/env/public
 * @param {import('types').ValidatedKitConfig} config
 * @param {string | undefined} mode
 * The Vite mode.
 */
export function write_env(config, mode = undefined) {
	const pub_out = path.join(config.outDir, 'runtime/app/env.js');
	const priv_out = path.join(config.outDir, 'runtime/app/env/private.js');
	const type_declaration_out = path.join(config.outDir, 'types/ambient.d.ts');

	// public is a little difficult since we append to an
	// already-existing file
	const pub = resolve_public_env(config.env.publicPrefix, mode);
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

	// private is easy since it has its own file: just write if changed
	const priv = resolve_private_env(config.env.publicPrefix, mode);
	const priv_content = const_declaration_template(false, priv);
	write_if_changed(priv_out, priv_content);

	const pub_declaration = type_declaration_template(true, pub);
	const priv_declaration = type_declaration_template(false, priv);
	write_if_changed(type_declaration_out, `${priv_declaration}\n${pub_declaration}`);
}

/**
 * Generate a Record<string, string> of private environment variables
 * (those that do not begin with public_prefix)
 * @param {string} public_prefix
 * @param {string | undefined} mode
 * @returns {Record<string, string>}
 */
function resolve_private_env(public_prefix, mode = undefined) {
	return resolve_env(false, public_prefix, mode);
}

/**
 * Generate a Record<string, string> of public environment variables
 * (those that do begin with public_prefix)
 * @param {string} public_prefix
 * @param {string | undefined} mode
 * @returns {Record<string, string>}
 */
function resolve_public_env(public_prefix, mode = undefined) {
	return resolve_env(true, public_prefix, mode);
}

/**
 * Generate a Record<string, string> containing environment
 * variable entries.
 * @param {boolean} pub
 * @param {string} public_prefix
 * @param {string} mode
 * @returns {Record<string, string>}
 */
function resolve_env(pub, public_prefix, mode = 'development') {
	/** @type {Record<string, string>} */
	const resolved = {};

	const env = {
		...process.env,
		...loadEnv(mode, process.cwd(), '')
	};

	// I'm smart enough to do this with reduce,
	// but I'm also smart enough not to force
	// someone else to read this with reduce later
	Object.entries(env)
		.filter(([k]) => (pub ? k.startsWith(public_prefix) : !k.startsWith(public_prefix)))
		.forEach(([k, v]) => {
			resolved[k] = v ?? '';
		});

	return resolved;
}
