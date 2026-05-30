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

/**
 * @typedef {object} ExplicitEnvVar
 * @property {string} name
 * @property {boolean} public
 * @property {boolean} static
 * @property {boolean} validates
 * @property {string | null} description
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
			console.warn(`${path.relative(process.cwd(), resolved)} requires the \`experimental.explicitEnvironmentVariables\` flag to be set`);
			warned = true;
		}
	} else if (config.experimental.explicitEnvironmentVariables) {
		throw new Error('experimental.explicitEnvironmentVariables was set, but no src/env.ts or src/env.js file could be found');
	}

	return null;
}

/**
 * @param {string | null} file
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode
 * @returns {Promise<ExplicitEnvVar[]>}
 */
export async function load_explicit_env(file, config, mode) {
	if (!file) return [];

	const bundle = /** @type {import('vite').Rollup.RollupOutput} */ (
		await vite.build({
			configFile: false,
			envDir: config.env.dir,
			logLevel: 'silent',
			mode,
			root: process.cwd(),
			ssr: {
				noExternal: true
			},
			build: {
				emptyOutDir: false,
				ssr: file,
				write: false,
				rollupOptions: {
					output: {
						format: 'es',
						inlineDynamicImports: true
					}
				}
			}
		})
	);

	const chunk = bundle.output.find((chunk) => chunk.type === 'chunk' && chunk.isEntry);
	if (!chunk || chunk.type !== 'chunk') {
		throw new Error(`Could not build ${file}`);
	}

	const href = `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}#${Date.now()}`;
	const { variables } = await import(href);

	if (!variables || typeof variables !== 'object') {
		throw new Error(`${file} must export a variables object`);
	}

	return Object.entries(variables).map(([name, value]) => {
		if (!valid_identifier.test(name) || reserved.has(name)) {
			throw new Error(`Invalid environment variable name ${JSON.stringify(name)}`);
		}

		const config = value && typeof value === 'object' ? value : {};

		/** @type {ExplicitEnvVar} */
		const variable = {
			name,
			public: config.public === true,
			static: config.static === true || config.inline === true,
			validates: 'validate' in config,
			description: typeof config.description === 'string' ? config.description : null
		};

		return variable;
	});
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function create_static_module(id, env) {
	/** @type {string[]} */
	const statements = [];

	statements.push(
		dedent`
			if (__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
				throw new Error('Cannot import \`${id}\` when \`experimental.explicitEnvironmentVariables\` is enabled. Use \`${id.replace('$env/static', '$app/env')}\` instead.');
			}
		`
	)

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
 */
export function create_dynamic_module(type, dev_values) {
	const prelude = dedent`
		if (__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
			throw new Error('Cannot import \`\$env/dynamic/{type}\` when \`experimental.explicitEnvironmentVariables\` is enabled. Use \`\$app/env/${type}\` instead.');
		}
	`;

	if (dev_values) {
		const keys = Object.entries(dev_values).map(
			([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`
		);
		return `${prelude}\n\nexport const env = {\n${keys.join(',\n')}\n}`;
	}
	return `${prelude}\n\nexport { ${type}_env as env } from '${runtime_base}/shared-server.js';`;
}

/**
 * @param {string} id
 * @param {string[]} exports
 */
export function create_forbidden_module(id, exports) {
	const unique_exports = Array.from(new Set(exports)).filter((name) => valid_identifier.test(name));
	const declarations = unique_exports.map((name) => `export let ${name};`).join('\n');

	return dedent`
		throw new Error(${JSON.stringify(
			`Cannot import ${id} when kit.experimental.explicitEnvironmentVariables is enabled. Use $app/env instead.`
		)});

		${declarations}
	`;
}

/**
 * @param {ExplicitEnvVar[]} variables
 * @param {Record<string, string>} env
 * @param {string | null} entry
 */
export function create_explicit_env_module(variables, env, entry) {
	if (!entry) return 'export function set() {}; export const rendered_env = {};';

	const imports = `import { variables } from ${JSON.stringify(entry)};`;
	const declarations = [];
	const setters = [];

	for (const variable of variables) {
		const comment = variable.description ? `${create_jsdoc(variable.description)}\n` : '';
		const name = JSON.stringify(variable.name);

		let lhs = variable.name;

		if (variable.public) {
			lhs += ` = rendered_env[${name}]`;
		}

		if (variable.static) {
			const value = JSON.stringify(env[variable.name]);
			declarations.push(`${comment}export const ${lhs} = validate(${value}, ${name});`);
		} else {
			declarations.push(`${comment}export var ${variable.name};`);
			setters.push(`${lhs} = validate(env[${name}], ${name});`);
		}
	}

	const blocks = [
		GENERATED_COMMENT,
		imports,
		'export const rendered_env = {};',
		create_validator(),
		...declarations,
		`export function set_env(env) {${setters.map((line) => `\n\t${line};`).join('')}\n}`
	]

	const module = blocks.join('\n\n');

	return module;
}

/**
 * @param {ExplicitEnvVar[]} variables
 * @param {string} global
 */
export function create_explicit_env_public_module(variables, global) {
	return dedent`
		const env = ${global}.env;

		${variables.map((v) => `export const ${v.name} = env.${v.name};\n`).join('')}
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
 * @param {ExplicitEnvVar[]} variables
 * @param {EnvType} type
 */
export function create_explicit_env_types(variables, type) {
	const declarations = variables
		.filter((variable) => variable.public === (type === 'public'))
		.map((variable) => {
			const comment = variable.description ? `${create_jsdoc(variable.description)}\n\t` : '';
			return `${comment}export const ${variable.name}: string;`;
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
