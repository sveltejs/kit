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

const illegal_import_names /** @type {Array<string>} */ = [
	'.svelte-kit/runtime/app/env/private.js'
];

/**
 * Create a formatted error for an illegal import.
 * @param {string} error_module_id
 * @param {Array<string>} stack
 * @param {(id: string, err: Error) => void} error_handler
 */
function handle_illegal_import_error(error_module_id, stack, error_handler) {
	stack.push(error_module_id + ' (server-side only module)');
	const stringified_stack = stack.map((mod, i) => `  ${i}: ${mod}`).join(', which imports:\n');
	const err = new Error(
		`Found an illegal import originating from: ${stack[0]}. It imports:\n${stringified_stack}`
	);
	error_handler(error_module_id, err);
	return;
}

/**
 * Recurse through the ModuleNode graph, throwing if the module
 * imports a private module.
 * @param {(id: string, err: Error) => void} error_handler
 * @param {import('vite').ModuleNode} node
 * @param {Array<string>} illegal_module_stack
 * @param {Set<string>} illegal_module_set
 */
function throw_if_illegal_private_import_recursive_vite(
	node,
	error_handler = (id, err) => {
		throw err;
	},
	illegal_module_stack = [],
	illegal_module_set = new Set()
) {
	const file = node.file ?? 'unknown';
	// This prevents cyclical imports creating a stack overflow
	if (illegal_module_set.has(file) || node.importedModules.size === 0) {
		return;
	}
	illegal_module_set.add(file);
	illegal_module_stack.push(file);
	node.importedModules.forEach((childNode) => {
		if (illegal_import_names.some((name) => childNode.file?.endsWith(name))) {
			handle_illegal_import_error(
				childNode?.file ?? 'unknown',
				illegal_module_stack,
				error_handler
			);
			return;
		}
		throw_if_illegal_private_import_recursive_vite(
			childNode,
			error_handler,
			illegal_module_stack,
			illegal_module_set
		);
	});
	illegal_module_set.delete(file);
	illegal_module_stack.pop();
}

/**
 * Throw an error if a private module is imported from a client-side node.
 * @param {(id: string, err: Error) => void} error_handler
 * @param {import('vite').ModuleNode} node
 */
export function throw_if_illegal_private_import_vite(error_handler, node) {
	throw_if_illegal_private_import_recursive_vite(node, error_handler);
}

/**
 * Recurse through the ModuleInfo graph, throwing if the module
 * imports a private module.
 * @param {import('rollup').GetModuleInfo} node_getter
 * @param {import('rollup').ModuleInfo} node
 * @param {(id: string, err: Error) => void} error_handler
 * @param {Array<string>} illegal_module_stack
 * @param {Set<string>} illegal_module_set
 */
function throw_if_illegal_private_import_recursive_rollup(
	node_getter,
	node,
	error_handler = (id, err) => {
		throw err;
	},
	illegal_module_stack = [],
	illegal_module_set = new Set()
) {
	const id = node.id;
	// This prevents cyclical imports creating a stack overflow
	if (
		illegal_module_set.has(id) ||
		(node.importedIds.length === 0 && node.dynamicImporters.length === 0)
	) {
		return;
	}
	illegal_module_set.add(id);
	illegal_module_stack.push(id);
	/** @type {(child_id: string) => void} */
	const recursiveChildNodeHandler = (childId) => {
		const childNode = node_getter(childId);
		if (childNode === null) {
			const err = new Error(`Failed to find module info for ${childId}`);
			error_handler(childId, err);
			return;
		}
		if (illegal_import_names.some((name) => childId.endsWith(name))) {
			handle_illegal_import_error(childId, illegal_module_stack, error_handler);
			return;
		}
		throw_if_illegal_private_import_recursive_rollup(
			node_getter,
			childNode,
			error_handler,
			illegal_module_stack,
			illegal_module_set
		);
	};
	node.importedIds.forEach(recursiveChildNodeHandler);
	node.dynamicallyImportedIds.forEach(recursiveChildNodeHandler);
	illegal_module_set.delete(id);
	illegal_module_stack.pop();
}

/**
 * Throw an error if a private module is imported from a client-side node.
 * @param {import('rollup').GetModuleInfo} node_getter
 * @param {(id: string, err: Error) => void} error_handler
 * @param {import('rollup').ModuleInfo} module_info
 */
export function throw_if_illegal_private_import_rollup(node_getter, error_handler, module_info) {
	throw_if_illegal_private_import_recursive_rollup(node_getter, module_info, error_handler);
}
