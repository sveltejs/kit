/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit' */
/** @import { ValidatedKitConfig } from 'types' */
import path from 'node:path';
import process from 'node:process';
import * as vite from 'vite';
import * as devalue from 'devalue';
import { GENERATED_COMMENT } from '../constants.js';
import { dedent } from './sync/utils.js';
import { runtime_base, runtime_directory } from './utils.js';
import { resolve_entry } from '../utils/filesystem.js';
import { handle_issues, validate } from '../exports/internal/env.js';
import { get_config_aliases } from '../exports/vite/utils.js';

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
 * @param {ValidatedKitConfig} kit
 * @param {string | null} file
 * @param {string} mode
 * @returns {Promise<Record<string, EnvVarConfig<any>> | null>}
 */
export async function load_explicit_env(kit, file, mode) {
	if (!file) return null;

	const server = await vite.createServer({
		configFile: false,
		logLevel: 'silent',
		mode,
		define: {
			__SVELTEKIT_APP_VERSION__: JSON.stringify(kit.version.name) // needed by $app/env
		},
		resolve: {
			alias: [
				{ find: '$app/env', replacement: `${runtime_directory}/app/env` },
				...get_config_aliases(kit)
			]
		}
	});

	/** @type {Record<string, EnvVarConfig<any>>} */
	let variables;

	/** @type {import('../runtime/app/env/internal.js')} */ (
		await server.ssrLoadModule(`${runtime_directory}/app/env/internal.js`)
	).set_building();

	try {
		({ variables } = await server.ssrLoadModule(file));

		if (!variables || typeof variables !== 'object') {
			throw new Error(`${file} must export a variables object`);
		}

		// validate
		for (const name of Object.keys(variables)) {
			if (!valid_identifier.test(name) || reserved.has(name)) {
				throw new Error(`Invalid environment variable name ${JSON.stringify(name)}`);
			}
		}
	} catch (e) {
		const error = /** @type {any} */ (e || {});

		if (
			error.code === 'ERR_MODULE_NOT_FOUND' &&
			error.message?.includes(`Cannot find module '$app`)
		) {
			throw new Error(
				`Cannot import \`$app/*\` modules other than \`$app/env\` inside \`src/env\``,
				{ cause: e }
			);
		}

		throw error;
	} finally {
		await server.close();
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
		? `throw new Error('Cannot import \`$env/dynamic/${type}\` when \`experimental.explicitEnvironmentVariables\` is enabled. Use \`$app/env/${type}\` instead.');\n\n`
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
 * @param {Record<string, EnvVarConfig<any> | undefined> | null} variables
 * @param {Record<string, string>} env
 * @param {string | null} entry
 */
export function create_sveltekit_env(variables, env, entry) {
	const imports = entry
		? [
				`import { variables } from ${JSON.stringify(entry)};`,
				`import { validate, handle_issues } from '@sveltejs/kit/internal/env';`
			]
		: [`const variables = {};`, `const handle_issues = () => {};`];

	const declarations = [];
	const setters = [];

	/** @type {Record<string, StandardSchemaV1.Issue[]>} */
	const issues = {};

	for (const [name, config] of Object.entries(variables ?? {})) {
		if (config?.static) {
			if (config.public) {
				const value = validate(variables ?? {}, env[name], name, issues);
				declarations.push(`explicit_public_env.${name} = ${devalue.uneval(value)};`);
			}
		} else {
			setters.push(
				`const ${name} = validate(variables, env.${name}, ${JSON.stringify(name)}, issues);`
			);

			if (config?.public) {
				setters.push(`explicit_public_env.${name} = ${name};`);
				setters.push(`rendered_env.${name} = ${name};`);
			} else {
				setters.push(`dynamic_private_env.${name} = ${name};`);
			}
		}
	}

	handle_issues(issues);

	const blocks = [
		GENERATED_COMMENT,
		imports.join('\n'),
		`const issues = {};`,
		'export { variables }',
		'export const dynamic_private_env = {};',
		'export const explicit_public_env = {};',
		'export const rendered_env = {};',
		...declarations,
		`handle_issues(issues);`,
		dedent`
			export function set_env(env) {
				const issues = {};
				${setters.join('\n')}
				handle_issues(issues);
			}`
	];

	const module = blocks.join('\n\n');

	return module;
}

/**
 * Creates the `__sveltekit/env/private` module
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 */
export function create_sveltekit_env_private(variables, env) {
	if (!variables) {
		return '';
	}

	/** @type {Record<string, StandardSchemaV1.Issue[]>} */
	const issues = {};

	/** @type {string[]} */
	const exports = [];

	for (const [name, config] of Object.entries(variables)) {
		if (config.public) continue;

		const value = config.static
			? devalue.uneval(validate(variables, env[name], name, issues))
			: `env.${name}`;

		exports.push(`export const ${name} = ${value};\n`);
	}

	handle_issues(issues);

	return `import { dynamic_private_env as env } from '__sveltekit/env';\n\n${exports.join('')}`;
}

/**
 * Creates the `__sveltekit/env/public/*` modules
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string} prelude
 */
export function create_sveltekit_env_public(variables, env, prelude) {
	if (!variables) {
		return '';
	}

	/** @type {Record<string, StandardSchemaV1.Issue[]>} */
	const issues = {};

	/** @type {string[]} */
	const exports = [];

	for (const [name, config] of Object.entries(variables)) {
		if (!config.public) continue;

		const value = config.static
			? devalue.uneval(validate(variables, env[name], name, issues))
			: `env.${name}`;

		exports.push(`export const ${name} = ${value};\n`);
	}

	handle_issues(issues);

	return `${prelude}\n\n${exports.join('')}`;
}

/**
 * Creates the `__sveltekit/env/service-worker` module used in development
 * (but not in prod, which goes through build_service_worker instead)
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string} global
 */
export function create_sveltekit_env_service_worker_dev(variables, env, global) {
	/** @type {string[]} */
	const properties = [];

	/** @type {Record<string, StandardSchemaV1.Issue[]>} */
	const issues = {};

	for (const [name, config] of Object.entries(variables ?? {})) {
		if (!config.public) continue;

		const value = validate(variables ?? {}, env[name], name, issues);
		properties.push(`${name}: ${devalue.uneval(value)}`);
	}

	handle_issues(issues);

	return dedent`
		globalThis.__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__ = true;

		${global} = {
			env: {
				${properties.join(',\n\t\t') || '// empty'}
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
		.filter(([_, config]) => !!config.public === (type === 'public'))
		.map(([name, config]) => {
			const comment = config.description ? `${create_jsdoc(config.description)}\n` : '';
			const type = config.schema
				? `import('@sveltejs/kit/internal/types').StandardSchemaV1.InferOutput<typeof import('${relative}').variables.${name}.schema>`
				: 'string';
			return `${comment}export const ${name}: ${type};`;
		});

	return dedent`
		declare module '$app/env/${type}' {
			${declarations.join('\n') || `// no ${type} environment variables were defined`}
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
