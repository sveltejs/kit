import path from 'path';
import { loadConfigFromFile, loadEnv } from 'vite';
import { runtime_directory } from '../../core/utils.js';
import { posixify } from '../../utils/filesystem.js';

/**
 * @param {import('vite').ResolvedConfig} config
 * @param {import('vite').ConfigEnv} config_env
 * @return {Promise<import('vite').UserConfig>}
 */
export async function get_vite_config(config, config_env) {
	const loaded = await loadConfigFromFile(
		config_env,
		config.configFile,
		undefined,
		config.logLevel
	);

	if (!loaded) {
		throw new Error('Could not load Vite config');
	}
	return { ...loaded.config, mode: config_env.mode };
}

/**
 * @param {...import('vite').UserConfig} configs
 * @returns {import('vite').UserConfig}
 */
export function merge_vite_configs(...configs) {
	return deep_merge(
		...configs.map((config) => ({
			...config,
			resolve: {
				...config.resolve,
				alias: normalize_alias(config.resolve?.alias || {})
			}
		}))
	);
}

/**
 * Takes zero or more objects and returns a new object that has all the values
 * deeply merged together. None of the original objects will be mutated at any
 * level, and the returned object will have no references to the original
 * objects at any depth. If there's a conflict the last one wins, except for
 * arrays which will be combined.
 * @param {...Object} objects
 * @returns {Record<string, any>} the merged object
 */
export function deep_merge(...objects) {
	const result = {};
	/** @type {string[]} */
	objects.forEach((o) => merge_into(result, o));
	return result;
}

/**
 * normalize kit.vite.resolve.alias as an array
 * @param {import('vite').AliasOptions} o
 * @returns {import('vite').Alias[]}
 */
function normalize_alias(o) {
	if (Array.isArray(o)) return o;
	return Object.entries(o).map(([find, replacement]) => ({ find, replacement }));
}

/**
 * Merges b into a, recursively, mutating a.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 */
function merge_into(a, b) {
	/**
	 * Checks for "plain old Javascript object", typically made as an object
	 * literal. Excludes Arrays and built-in types like Buffer.
	 * @param {any} x
	 */
	const is_plain_object = (x) => typeof x === 'object' && x.constructor === Object;

	for (const prop in b) {
		if (is_plain_object(b[prop])) {
			if (!is_plain_object(a[prop])) {
				a[prop] = {};
			}
			merge_into(a[prop], b[prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			a[prop] = b[prop];
		}
	}
}

/**
 * Transforms kit.alias to a valid vite.resolve.alias array.
 * Related to tsconfig path alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * */
export function get_aliases(config) {
	/** @type {import('vite').Alias[]} */
	const alias = [
		{ find: '__GENERATED__', replacement: path.posix.join(config.outDir, 'generated') },
		{ find: '$app', replacement: `${runtime_directory}/app` },
		// For now, we handle `$lib` specially here rather than make it a default value for
		// `config.kit.alias` since it has special meaning for packaging, etc.
		{ find: '$lib', replacement: config.files.lib }
	];

	for (let [key, value] of Object.entries(config.alias)) {
		value = posixify(value);
		if (value.endsWith('/*')) {
			value = value.slice(0, -2);
		}
		if (key.endsWith('/*')) {
			// Doing just `{ find: key.slice(0, -2) ,..}` would mean `import .. from "key"` would also be matched, which we don't want
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key.slice(0, -2))}\\/(.+)$`),
				replacement: `${path.resolve(value)}/$1`
			});
		} else if (key + '/*' in config.alias) {
			// key and key/* both exist -> the replacement for key needs to happen _only_ on import .. from "key"
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key)}$`),
				replacement: path.resolve(value)
			});
		} else {
			alias.push({ find: key, replacement: path.resolve(value) });
		}
	}

	return alias;
}

/**
 * @param {string} str
 */
function escape_for_regexp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
}

/**
 * Load environment variables from process.env and .env files
 * @param {import('types').ValidatedKitConfig['env']} env_config
 * @param {string} mode
 */
export function get_env(env_config, mode) {
	const entries = Object.entries(loadEnv(mode, env_config.dir, ''));

	return {
		public: Object.fromEntries(entries.filter(([k]) => k.startsWith(env_config.publicPrefix))),
		private: Object.fromEntries(entries.filter(([k]) => !k.startsWith(env_config.publicPrefix)))
	};
}
