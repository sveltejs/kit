import { GENERATED_COMMENT } from '../constants.js';
import { runtime_base } from './utils.js';

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function create_static_module(id, env) {
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

	return GENERATED_COMMENT + declarations.join('\n\n');
}

/**
 * @param {'public' | 'private'} type
 * @param {Record<string, string> | undefined} dev_values If in a development mode, values to pre-populate the module with.
 */
export function create_dynamic_module(type, dev_values) {
	if (dev_values) {
		const objectKeys = Object.entries(dev_values).map(
			([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`
		);
		return `const env = {\n${objectKeys.join(',\n')}\n}\n\nexport { env }`;
	}
	return `export { env } from '${runtime_base}/env-${type}.js';`;
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function create_static_types(id, env) {
	const declarations = Object.keys(env)
		.filter((k) => valid_identifier.test(k))
		.map((k) => `\texport const ${k}: string;`)
		.join('\n');

	return `declare module '${id}' {\n${declarations}\n}`;
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function create_dynamic_types(id, env) {
	const properties = Object.keys(env)
		.filter((k) => valid_identifier.test(k))
		.map((k) => `\t\t${k}: string;`);

	properties.push(`\t\t[key: string]: string | undefined;`);

	return `declare module '${id}' {\n\texport const env: {\n${properties.join('\n')}\n\t}\n}`;
}

export const reserved = new Set([
	'do',
	'if',
	'in',
	'for',
	'let',
	'new',
	'try',
	'var',
	'case',
	'else',
	'enum',
	'eval',
	'null',
	'this',
	'true',
	'void',
	'with',
	'await',
	'break',
	'catch',
	'class',
	'const',
	'false',
	'super',
	'throw',
	'while',
	'yield',
	'delete',
	'export',
	'import',
	'public',
	'return',
	'static',
	'switch',
	'typeof',
	'default',
	'extends',
	'finally',
	'package',
	'private',
	'continue',
	'debugger',
	'function',
	'arguments',
	'interface',
	'protected',
	'implements',
	'instanceof'
]);

export const valid_identifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
