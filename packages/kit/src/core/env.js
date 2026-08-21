/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { ValidatedConfig } from 'types' */
import path from 'node:path';
import * as devalue from 'devalue';
import { dedent } from './sync/utils.js';
import { get_global_name, runtime_directory } from './utils.js';
import { resolve_entry } from '../utils/filesystem.js';
import { handle_issues, validate } from '../exports/internal/env.js';
import { get_config_aliases } from '../exports/vite/utils.js';
import { get_runner } from '../runner.js';
import { import_peer } from '../utils/import.js';
import { posixify } from '../utils/os.js';

/**
 * @typedef {'public' | 'private'} EnvType
 */

/**
 * @param {ValidatedConfig} config
 * @param {string} root
 * @returns {string | null}
 */
export function resolve_env_entry(config, root) {
	return resolve_entry(path.resolve(root, config.files.src, 'env'));
}

/**
 * @param {ValidatedConfig} kit
 * @param {string | null} file
 * @param {string} root
 * @param {string} mode
 * @returns {Promise<{ variables: Record<string, EnvVarConfig<any>> | null, deps: Set<string> }>}
 */
export async function load_explicit_env(kit, file, root, mode) {
	/** @type {Set<string>} */
	const deps = new Set();

	if (!file) {
		return { variables: null, deps };
	}

	/** @type {typeof import('vite')} */
	const vite = await import_peer('vite', root);

	const server = await vite.createServer({
		configFile: false,
		logLevel: 'silent',
		mode,
		define: {
			// these are needed by $app/env
			__SVELTEKIT_APP_VERSION__: JSON.stringify(kit.version.name),
			__SVELTEKIT_DEV__: mode === 'development',
			__SVELTEKIT_PAYLOAD__: 'undefined' // coming in through static import in env/internal.js but will end up unused
		},
		resolve: {
			alias: [
				{ find: '$app/env', replacement: `${runtime_directory}/app/env` },
				...get_config_aliases(kit, root)
			]
		},
		plugins: [
			{
				name: 'dependency-scanner',
				load(id) {
					deps.add(id);
				}
			}
		]
	});

	/** @type {Record<string, EnvVarConfig<any>>} */
	let variables;

	const runner = get_runner(vite, server);

	/** @type {typeof import('../runtime/app/env/server.js')} */ (
		await runner.import(`${runtime_directory}/app/env/server.js`)
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

	return { variables, deps };
}

/**
 * Creates the `<sveltekit:generated>/env/*` modules, keyed by path relative to `dir`. Every module
 * derives from one pass over `variables`, so an inlined value is validated once per build.
 * @param {ValidatedConfig} config
 * @param {Record<string, EnvVarConfig<any>> | null} variables
 * @param {Record<string, string>} env
 * @param {string} dir
 * @param {string | null} entry
 * @param {boolean} is_dev
 * @returns {Record<string, string>}
 */
export function create_env_modules(config, variables, env, dir, entry, is_dev) {
	/** @type {Record<string, StandardSchemaV1.Issue[]>} */
	const issues = {};

	/** @type {Record<string, string>} */
	const dev_env = {};

	/** @type {string[]} */
	const declarations = [];
	/** @type {string[]} */
	const setters = [];
	/** @type {string[]} */
	const public_exports = [];
	/** @type {string[]} */
	const private_exports = [];
	/** @type {string[]} */
	const sw_properties = [];

	let sw_dynamic = false;

	for (const [name, { public: is_public, static: is_static }] of Object.entries(variables ?? {})) {
		if (is_dev && name in env) dev_env[name] = env[name];

		const exports = is_public ? public_exports : private_exports;

		if (is_static) {
			const value = devalue.uneval(validate(variables ?? {}, env[name], name, issues));
			exports.push(`export const ${name} = ${value};\n`);

			if (is_public) {
				declarations.push(`explicit_public_env.${name} = ${value};`);
				sw_properties.push(`${name}: ${value}`);
			}
		} else {
			exports.push(`export const ${name} = env.${name};\n`);
			setters.push(
				`const ${name} = validate(variables, env.${name}, ${JSON.stringify(name)}, issues);`
			);

			if (is_public) {
				setters.push(`explicit_public_env.${name} = ${name};`);
				setters.push(`rendered_env.${name} = ${name};`);
				sw_dynamic = true;
				// in dev there is no prerendered env module, so the service worker inlines the value
				if (is_dev) {
					const value = devalue.uneval(validate(variables ?? {}, env[name], name, issues));
					sw_properties.push(`${name}: ${value}`);
				}
			} else {
				setters.push(`dynamic_private_env.${name} = ${name};`);
			}
		}
	}

	handle_issues(issues);

	const config_blocks = [
		entry
			? [
					`import { variables } from ${JSON.stringify(entry)};`,
					`import { validate, handle_issues } from '@sveltejs/kit/internal/env';`
				].join('\n')
			: [`const variables = {};`, `const handle_issues = () => {};`].join('\n'),
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

	if (is_dev) {
		// In dev, initialise the env immediately. Tools like `vite-node` load modules
		// through the Vite config but don't run the SvelteKit dev server, which is what
		// normally calls `set_env`. Without this, dynamic env vars imported from
		// `$app/env/public` and `$app/env/private` would be `undefined` in such contexts.
		config_blocks.push(`set_env(${devalue.uneval(dev_env)});`);
	}

	/**
	 * @param {string} prelude
	 * @param {string[]} exports
	 */
	const module = (prelude, exports) => (variables ? `${prelude}\n\n${exports.join('')}` : '');

	const global = `globalThis.${get_global_name(config.version.name, is_dev)}`;

	const version = JSON.stringify(config.version.name);

	// a production build with dynamic public env vars loads them at runtime via an import of
	// the prerendered `env.js`; otherwise the values are inlined
	const service_worker =
		!is_dev && sw_dynamic
			? dedent`
				import { env } from '${config.paths.base}/${config.appDir}/env.js';

				${global} = {
					base: location.pathname.split('/').slice(0, -1).join('/'),
					env,
					version: ${version}
				};
			`
			: dedent`
				${global} = {
					base: location.pathname.split('/').slice(0, -1).join('/'),
					env: {
						${sw_properties.join(',\n\t\t') || '// empty'}
					},
					version: ${version}
				};
			`;

	return {
		'config.js': config_blocks.join('\n\n'),
		'public/server.js': module(
			`import { rendered_env as env } from '../config.js';`,
			public_exports
		),
		'private/server.js': module(
			`import { dynamic_private_env as env } from '../config.js';`,
			private_exports
		),
		'public/client.js': module(
			is_dev
				? `const { env } = ${global};`
				: `import { payload } from ${JSON.stringify(posixify(path.relative(`${dir}/public`, `${runtime_directory}/client/payload.js`)))};\nconst env = payload.env;`,
			public_exports
		),
		'service-worker.js': service_worker
	};
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
