import fs from 'fs';
import path from 'path';
import { loadConfigFromFile } from 'vite';
import { get_runtime_directory } from '../core/utils.js';

/**
 * @param {import('vite').ConfigEnv} config_env
 * @return {Promise<import('vite').UserConfig>}
 */
export async function get_vite_config(config_env) {
	const config = (await loadConfigFromFile(config_env))?.config;
	if (!config) {
		throw new Error('Could not load Vite config');
	}
	return { ...config, mode: config_env.mode };
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

/** @param {import('types').ValidatedKitConfig} config */
export function get_aliases(config) {
	/** @type {Record<string, string>} */
	const alias = {
		__GENERATED__: path.posix.join(config.outDir, 'generated'),
		$app: `${get_runtime_directory(config)}/app`,

		// For now, we handle `$lib` specially here rather than make it a default value for
		// `config.kit.alias` since it has special meaning for packaging, etc.
		$lib: config.files.lib
	};

	for (const [key, value] of Object.entries(config.alias)) {
		alias[key] = path.resolve(value);
	}

	return alias;
}

/**
 * Given an entry point like [cwd]/src/hooks, returns a filename like [cwd]/src/hooks.js or [cwd]/src/hooks/index.js
 * @param {string} entry
 * @returns {string|null}
 */
export function resolve_entry(entry) {
	if (fs.existsSync(entry)) {
		const stats = fs.statSync(entry);
		if (stats.isDirectory()) {
			return resolve_entry(path.join(entry, 'index'));
		}

		return entry;
	} else {
		const dir = path.dirname(entry);

		if (fs.existsSync(dir)) {
			const base = path.basename(entry);
			const files = fs.readdirSync(dir);

			const found = files.find((file) => file.replace(/\.[^.]+$/, '') === base);

			if (found) return path.join(dir, found);
		}
	}

	return null;
}

/**
 *
 * @param {string} str
 * @param {number} times
 * @returns
 */
function repeat(str, times) {
	return new Array(times + 1).join(str);
}
/**
 * Create a formatted error for an illegal import.
 * @param {Array<string>} stack
 */
export function format_illegal_import_chain(stack) {
	stack = stack.map((file) =>
		path.relative(process.cwd(), file).replace('.svelte-kit/runtime/app', '$app')
	);

	const pyramid = stack.map((file, i) => `${repeat(' ', i * 2)}- ${file}`).join('\n');

	return `Cannot import ${stack.at(-1)} into client-side code:\n${pyramid}`;
}

/**
 * Throw an error if a private module is imported from a client-side node.
 * @param {import('vite').ModuleNode} node
 * @param {Set<string>} illegal_imports
 */
export function throw_if_illegal_private_import_vite(node, illegal_imports) {
	const seen = new Set();

	/**
	 * @param {import('vite').ModuleNode} node
	 * @returns {string[] | null}
	 */
	function find(node) {
		if (!node.id) return null; // TODO when does this happen?

		if (seen.has(node.id)) return null;
		seen.add(node.id);

		if (node.id && illegal_imports.has(node.id)) {
			return [node.id];
		}

		for (const child of node.importedModules) {
			const chain = child && find(child);
			if (chain) return [node.id, ...chain];
		}

		return null;
	}

	const chain = find(node);

	if (chain) {
		throw new Error(format_illegal_import_chain(chain));
	}
}
