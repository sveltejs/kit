/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit' */
/** @import { ValidatedKitConfig } from 'types' */
import path from 'node:path';
import * as vite from 'vite';
import * as devalue from 'devalue';
import { GENERATED_COMMENT } from '../constants.js';
import { dedent } from './sync/utils.js';
import { runtime_directory } from './utils.js';
import { resolve_entry } from '../utils/filesystem.js';
import { handle_issues, validate } from '../exports/internal/env.js';
import { get_config_aliases } from '../exports/vite/utils.js';

/**
 * @typedef {'public' | 'private'} EnvType
 */

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string | null}
 */
export function resolve_explicit_env_entry(config) {
	return resolve_entry(path.join(config.files.src, 'env')) ?? null;
}

/**
 * @param {ValidatedKitConfig} kit
 * @param {string | null} file
 * @param {string} root
 * @param {string} mode
 * @returns {Promise<Record<string, EnvVarConfig<any>> | null>}
 */
export async function load_explicit_env(kit, file, root, mode) {
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
				...get_config_aliases(kit, root)
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
 * Creates the `__sveltekit/env` module
 * @param {Record<string, EnvVarConfig<any> | undefined> | null} variables
 * @param {Record<string, string>} env
 * @param {string | null} entry
 * @param {boolean} is_dev
 */
export function create_sveltekit_env(variables, env, entry, is_dev) {
	const imports = entry
		? [
				`import { building } from '$app/env/internal';`,
				`import { variables } from ${JSON.stringify(entry)};`,
				`import { validate, handle_issues } from '@sveltejs/kit/internal/env';`
			]
		: [`const variables = {};`, `const handle_issues = () => {};`];

	/** @type {string[]} */
	const declarations = [];
	/** @type {string[]} */
	const setters = [];
	/** @type {string[]} */
	const runtime_setters = [];

	/** @type {Record<string, StandardSchemaV1.Issue[]>} */
	const issues = {};

	for (const [name, config] of Object.entries(variables ?? {})) {
		const availability = config?.availability ?? 'dynamic';

		if (availability === 'inline') {
			if (config?.public) {
				const value = validate(variables ?? {}, env[name], name, issues);
				declarations.push(`explicit_public_env.${name} = ${devalue.uneval(value)};`);
			}
		} else {
			const target = availability === 'runtime' ? runtime_setters : setters;

			target.push(
				`const ${name} = validate(variables, env.${name}, ${JSON.stringify(name)}, issues);`
			);

			if (config?.public) {
				target.push(`explicit_public_env.${name} = ${name};`);
				target.push(`rendered_env.${name} = ${name};`);
			} else {
				target.push(`dynamic_private_env.${name} = ${name};`);
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
				${
					runtime_setters.length > 0
						? `if (!building) {\n\t\t\t\t\t${runtime_setters.join('\n')}\n\t\t\t\t}`
						: ''
				}
				handle_issues(issues);
			}`
	];

	// In dev, initialise the env immediately. Tools like `vite-node` load modules
	// through the Vite config but don't run the SvelteKit dev server, which is what
	// normally calls `set_env`. Without this, dynamic env vars imported from
	// `$app/env/public` and `$app/env/private` would be `undefined` in such contexts.
	if (is_dev) {
		/** @type {Record<string, string>} */
		const dev_env = {};
		for (const name of Object.keys(variables ?? {})) {
			if (name in env) dev_env[name] = env[name];
		}
		blocks.push(`set_env(${devalue.uneval(dev_env)});`);
	}

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

		const availability = config.availability ?? 'dynamic';

		/** @type {string} */
		let value;

		if (availability === 'inline') {
			value = devalue.uneval(validate(variables, env[name], name, issues));
		} else {
			value = `env.${name}`;
		}

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

		const availability = config.availability ?? 'dynamic';

		/** @type {string} */
		let value;

		if (availability === 'inline') {
			value = devalue.uneval(validate(variables, env[name], name, issues));
		} else {
			value = `env.${name}`;
		}

		exports.push(`export const ${name} = ${value};\n`);
	}

	handle_issues(issues);

	return `${prelude}\n\n${exports.join('')}`;
}

/**
 * Creates the `__sveltekit/env/service-worker` module used in production. When an app uses
 * dynamic public env vars, they're loaded at runtime via an import of the prerendered
 * `env.js`. If there are none, values are inlined.
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string} global
 * @param {string} base
 * @param {string} app_dir
 */
export function create_sveltekit_env_service_worker(variables, env, global, base, app_dir) {
	const has_dynamic_public_env = Object.values(variables ?? {}).some((config) => {
		if (!config.public) return false;
		const availability = config.availability ?? 'dynamic';
		return availability === 'dynamic' || availability === 'runtime';
	});

	if (!has_dynamic_public_env) {
		return create_sveltekit_env_service_worker_dev(variables, env, global);
	}

	return dedent`
		import { env } from '${base}/${app_dir}/env.js';

		globalThis.__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__ = true;

		${global} = { env };
	`;
}

/**
 * Creates the `__sveltekit/env/service-worker` module used in development
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
 * @param {Record<string, EnvVarConfig<any>>} variables
 * @param {string} relative
 * @param {EnvType} type
 */
export function create_explicit_env_types(variables, relative, type) {
	const declarations = Object.entries(variables)
		.filter(([_, config]) => !!config.public === (type === 'public'))
		.map(([name, config]) => {
			const comment = config.description ? `${create_jsdoc(config.description)}\n` : '';
			const availability = config.availability ?? 'dynamic';
			const maybe_undefined = availability === 'runtime';
			const type = config.schema
				? `import('@sveltejs/kit/internal/types').StandardSchemaV1.InferOutput<typeof import('${relative}').variables.${name}.schema>${maybe_undefined ? ' | undefined' : ''}`
				: maybe_undefined
					? 'string | undefined'
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
