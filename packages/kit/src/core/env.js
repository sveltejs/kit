/** @import { EnvVarConfig } from '@sveltejs/kit' */
import path from 'node:path';
import process from 'node:process';
import * as vite from 'vite';
import { GENERATED_COMMENT } from '../constants.js';
import { dedent } from './sync/utils.js';
import { runtime_base } from './utils.js';
import { resolve_entry } from '../utils/filesystem.js';

/**
 * @typedef {'public' | 'private'} EnvType
 */

let warned = false;

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string | null}
 */
export function resolve_explicit_env_entry(config) {
	const resolved = resolve_entry(path.join(config.files.src, 'env'));

	if (resolved) {
		if (config.experimental.explicitEnvironmentVariables) {
			return resolved;
		}

		if (!warned) {
			console.warn(
				`${path.relative(process.cwd(), resolved)} requires the \`experimental.explicitEnvironmentVariables\` flag to be set`
			);
			warned = true;
		}
	} else if (config.experimental.explicitEnvironmentVariables) {
		console.warn(
			'experimental.explicitEnvironmentVariables was set, but no src/env.ts or src/env.js file could be found'
		);
	}

	return null;
}

/**
 * @param {string | null} file
 * @param {string} mode
 * @returns {Promise<Record<string, EnvVarConfig<any>> | null>}
 */
export async function load_explicit_env(file, mode) {
	if (!file) return null;

	const server = await vite.createServer({
		configFile: false,
		logLevel: 'silent',
		mode
		// TODO do we need to provide certain aliases here?
	});

	const { variables } = await server.ssrLoadModule(file);

	await server.close();

	if (!variables || typeof variables !== 'object') {
		throw new Error(`${file} must export a variables object`);
	}

	// validate
	for (const name of Object.keys(variables)) {
		if (!valid_identifier.test(name) || reserved.has(name)) {
			throw new Error(`Invalid environment variable name ${JSON.stringify(name)}`);
		}
	}

	return variables;
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @param {boolean} disabled
 * @returns {string}
 */
export function create_static_module(id, env, disabled) {
	/** @type {string[]} */
	const statements = [];

	if (disabled) {
		statements.push(
			`throw new Error('Cannot import \`${id}\` when \`experimental.explicitEnvironmentVariables\` is enabled. Use \`${id.replace('$env/static', '$app/env')}\` instead.');`
		);
	}

	for (const key in env) {
		if (!valid_identifier.test(key) || reserved.has(key)) {
			continue;
		}

		const comment = `/** @type {import('${id}').${key}} */`;
		const declaration = `export const ${key} = ${JSON.stringify(env[key])};`;

		statements.push(`${comment}\n${declaration}`);
	}

	return GENERATED_COMMENT + statements.join('\n\n');
}

/**
 * @param {EnvType} type
 * @param {Record<string, string> | undefined} dev_values If in a development mode, values to pre-populate the module with.
 * @param {boolean} disabled
 */
export function create_dynamic_module(type, dev_values, disabled) {
	const prelude = disabled
		? `throw new Error('Cannot import \`$env/dynamic/{type}\` when \`experimental.explicitEnvironmentVariables\` is enabled. Use \`$app/env/${type}\` instead.');\n\n`
		: '';

	if (dev_values) {
		const keys = Object.entries(dev_values).map(
			([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`
		);
		return `${prelude}export const env = {\n${keys.join(',\n')}\n}`;
	}
	return `${prelude}export { ${type}_env as env } from '${runtime_base}/shared-server.js';`;
}

/**
 * Creates the `__sveltekit/env` module
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string | null} entry
 */
export function create_sveltekit_env(variables, env, entry) {
	const imports = entry
		? `import { variables } from ${JSON.stringify(entry)};`
		: `const variables = {};`;
	const declarations = [];
	const setters = [];

	for (const [name, config] of Object.entries(variables ?? {})) {
		let lhs = name;

		if (config.public) {
			lhs += ` = rendered_env.${name}`;
		}

		if (config.static) {
			const value = JSON.stringify(env[name]);
			declarations.push(`export const ${lhs} = validate(${value}, ${JSON.stringify(name)});`);
		} else {
			declarations.push(`export var ${name};`);
			setters.push(`${lhs} = validate(env.${name}, ${JSON.stringify(name)});`);
		}
	}

	const blocks = [
		GENERATED_COMMENT,
		imports,
		'export { variables }',
		'export const rendered_env = {};',
		create_validator(),
		...declarations,
		`export function set_env(env) {${setters.map((line) => `\n\t${line};`).join('')}\n}`
	];

	const module = blocks.join('\n\n');

	return module;
}

/**
 * Creates the `__sveltekit/env/browser` module
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {string} global
 */
export function create_sveltekit_env_browser(variables, global) {
	return dedent`
		const env = ${global}.env;

		${Object.keys(variables ?? {})
			.map((name) => `export const ${name} = env.${name};\n`)
			.join('')}
	`;
}

function create_validator() {
	return dedent`
		function validate(value, name) {
			const config = variables[name] ?? {};

			const schema = config.validate ?? string_schema;
			const standard = schema?.['~standard'];

			if (!standard) {
				throw new Error(\`Environment variable \${name} was configured with a validator that does not implement Standard Schema\`);
			}

			const result = standard.validate(value);

			if (typeof result?.then === 'function') {
				throw new Error(\`Environment variable \${name} uses an async validator, which is not supported\`);
			}

			if (result.issues) {
				throw new Error(\`Environment variable \${name} is invalid: \${result.issues.map((issue) => issue.message).join(', ')}\`);
			}

			return result.value;
		}

		const string_schema = {
			'~standard': {
				validate(value) {
					return typeof value === 'string'
						? { value }
						: { issues: [{ message: 'Expected a string' }] };
				}
			}
		};
	`;
}

/** @param {string} description */
function create_jsdoc(description) {
	return `/**\n${description
		.split('\n')
		.map((line) => ` * ${line.replaceAll('*/', '*\\/')}`)
		.join('\n')}\n */`;
}

/**
 * @param {EnvType} id
 * @param {import('types').Env} env
 * @returns {string}
 */
export function create_static_types(id, env) {
	const declarations = Object.keys(env[id])
		.filter((k) => valid_identifier.test(k))
		.map((k) => `export const ${k}: string;`);

	return dedent`
		declare module '$env/static/${id}' {
			${declarations.join('\n')}
		}
	`;
}

/**
 * @param {EnvType} id
 * @param {import('types').Env} env
 * @param {{
 * 	public_prefix: string;
 * 	private_prefix: string;
 * }} prefixes
 * @returns {string}
 */
export function create_dynamic_types(id, env, { public_prefix, private_prefix }) {
	const properties = Object.keys(env[id])
		.filter((k) => valid_identifier.test(k))
		.map((k) => `${k}: string;`);

	const public_prefixed = `[key: \`${public_prefix}\${string}\`]`;
	const private_prefixed = `[key: \`${private_prefix}\${string}\`]`;

	if (id === 'private') {
		if (public_prefix) {
			properties.push(`${public_prefixed}: undefined;`);
		}
		properties.push(`${private_prefixed}: string | undefined;`);
	} else {
		if (private_prefix) {
			properties.push(`${private_prefixed}: undefined;`);
		}
		properties.push(`${public_prefixed}: string | undefined;`);
	}

	return dedent`
		declare module '$env/dynamic/${id}' {
			export const env: {
				${properties.join('\n')}
			}
		}
	`;
}

/**
 * @param {Record<string, EnvVarConfig<any>>} variables
 * @param {string} relative
 * @param {EnvType} type
 */
export function create_explicit_env_types(variables, relative, type) {
	const declarations = Object.entries(variables)
		.filter(([_, config]) => config.public === (type === 'public'))
		.map(([name, config]) => {
			const comment = config.description ? `${create_jsdoc(config.description)}\n` : '';
			const type = config.validate
				? `import('@sveltejs/kit/internal/types').StandardSchemaV1.InferOutput<typeof import('${relative}').variables.${name}.validate>`
				: 'string';
			return `${comment}export const ${name}: ${type};`;
		});

	return dedent`
		declare module '$app/env/${type}' {
			${declarations.join('\n')}
		}
	`;
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
