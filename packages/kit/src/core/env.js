/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit' */
/** @import { ValidatedKitConfig } from 'types' */
import path from 'node:path';
import * as devalue from 'devalue';
import { GENERATED_COMMENT } from '../constants.js';
import { dedent } from './sync/utils.js';
import { runtime_directory } from './utils.js';
import { resolve_entry } from '../utils/filesystem.js';
import { handle_issues, validate } from '../exports/internal/env.js';
import { get_config_aliases } from '../exports/vite/utils.js';
import { get_runner } from '../runner.js';

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
 * @param {typeof import('vite')} vite
 * @param {ValidatedKitConfig} kit
 * @param {string | null} file
 * @param {string} root
 * @param {string} mode
 * @returns {Promise<Record<string, EnvVarConfig<any>> | null>}
 */
export async function load_explicit_env(vite, kit, file, root, mode) {
	if (!file) return null;

	const server = await vite.createServer({
		configFile: false,
		logLevel: 'silent',
		mode,
		define: {
			__SVELTEKIT_PAYLOAD__: 'undefined', // coming in through static import in env/internal.js but will end up unused
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

	const runner = get_runner(vite, server);

	/** @type {import('../runtime/app/env/internal.js')} */ (
		await runner.import(`${runtime_directory}/app/env/internal.js`)
	).set_building();

	try {
		({ variables } = await runner.import(file));

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
 * Creates the `__sveltekit/env/service-worker` module used in production. When an app uses
 * dynamic public env vars, they're loaded at runtime via an import of the prerendered
 * `env.js`. If there are none, values are inlined.
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string} version
 * @param {string} global
 * @param {string} base
 * @param {string} app_dir
 */
export function create_sveltekit_env_service_worker(
	variables,
	env,
	version,
	global,
	base,
	app_dir
) {
	const has_dynamic_public_env = Object.values(variables ?? {}).some(
		(config) => config.public && !config.static
	);

	if (!has_dynamic_public_env) {
		return create_sveltekit_env_service_worker_dev(variables, env, version, global);
	}

	return dedent`
		import { env } from '${base}/${app_dir}/env.js';

		${global} = {
			base: location.pathname.split('/').slice(0, -1).join('/'),
			env,
			version: ${JSON.stringify(version)}
		};
	`;
}

/**
 * Creates the `__sveltekit/env/service-worker` module used in development
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string} version
 * @param {string} global
 */
export function create_sveltekit_env_service_worker_dev(variables, env, version, global) {
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
		${global} = {
			base: location.pathname.split('/').slice(0, -1).join('/'),
			env: {
				${properties.join(',\n\t\t') || '// empty'}
			},
			version: ${JSON.stringify(version)}
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

/**
 * Generates `export const` declarations (and, for reserved-word names that need
 * aliasing, `const` + re-export specifiers) for a set of named exports.
 *
 * For regular names, emits a single efficient `export const name = expr;` statement.
 * For reserved-word names (e.g. `delete`, `class`), emits `const alias = expr;` plus
 * a re-export specifier (`alias as name`), since reserved words can't be `const`
 * binding names but CAN appear in export specifiers.
 *
 * You can do evil things like `export { c as class }`. In order to import/re-export
 * these, you need to alias the binding, then un-alias it when re-exporting:
 *
 *   const _0 = ...; // safe binding name
 *   export { _0 as class }; // valid — `class` is allowed in export specifiers
 *
 * Aliases are chosen to avoid collisions with any of the supplied names. The
 * namespace binding (used to hold the imported module) is likewise chosen to
 * avoid collisions.
 *
 * @param {Iterable<string>} names — the export names
 * @param {(name: string, namespace: string) => string} build_expression —
 *   called for each name to produce the right-hand side of the declaration;
 *   receives the chosen namespace binding so it can reference the imported module
 * @param {string} namespace_prefix — the preferred binding name for the namespace
 *   (suffixed with a number if it collides with any export name)
 * @returns {{ namespace: string, declarations: string[], reexports: string[] }}
 */
export function create_exported_declarations(names, build_expression, namespace_prefix) {
	/** @type {Set<string>} */
	const set = new Set(names);

	let namespace = namespace_prefix;
	let namespace_index = 0;
	while (set.has(namespace)) {
		namespace = `${namespace_prefix}${namespace_index++}`;
	}

	let alias_index = 0;
	/** @type {Map<string, string>} */
	const aliases = new Map();

	for (const name of set) {
		if (!reserved.has(name)) continue;

		let alias = `_${alias_index++}`;
		while (set.has(alias)) {
			alias = `_${alias_index++}`;
		}
		aliases.set(name, alias);
	}

	/** @type {string[]} */
	const declarations = [];
	/** @type {string[]} */
	const reexports = [];

	for (const name of set) {
		const alias = aliases.get(name);
		const expr = build_expression(name, namespace);
		if (alias) {
			declarations.push(`const ${alias} = ${expr};`);
			reexports.push(`${alias} as ${name}`);
		} else {
			declarations.push(`export const ${name} = ${expr};`);
		}
	}

	return { namespace, declarations, reexports };
}
