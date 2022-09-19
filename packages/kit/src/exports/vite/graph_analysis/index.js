import path from 'path';
import { normalizePath } from 'vite';
import { remove_query_from_id, get_module_types } from './utils.js';

/** @typedef {import('./types').ImportGraph} ImportGraph */

const CWD_ID = normalizePath(process.cwd());
const NODE_MODULES_ID = normalizePath(path.resolve(process.cwd(), 'node_modules'));
const ILLEGAL_IMPORTS = new Set([
	'/@id/__x00__$env/dynamic/private', //dev
	'\0$env/dynamic/private', // prod
	'/@id/__x00__$env/static/private', // dev
	'\0$env/static/private' // prod
]);
const ILLEGAL_MODULE_NAME_PATTERN = /.*\.server\..+/;

export class IllegalModuleGuard {
	/** @type {string} */
	#lib_dir;

	/** @type {string} */
	#server_dir;

	/** @type {Array<ImportGraph>} */
	#chain = [];

	/**
	 * @param {string} lib_dir
	 */
	constructor(lib_dir) {
		this.#lib_dir = normalizePath(lib_dir);
		this.#server_dir = normalizePath(path.resolve(lib_dir, 'server'));
	}

	/**
	 * Assert that a node imports no illegal modules.
	 * @param {ImportGraph} node
	 * @returns {void}
	 */
	assert_legal(node) {
		this.#chain.push(node);
		for (const child of node.children) {
			if (this.#is_illegal(child.id)) {
				this.#chain.push(child);
				const error = this.#format_illegal_import_chain(this.#chain);
				this.#chain = []; // Reset the chain in case we want to reuse this guard
				throw new Error(error);
			}
			this.assert_legal(child);
		}
		this.#chain.pop();
	}

	/**
	 * `true` if the provided ID represents a server-only module, else `false`.
	 * @param {string} module_id
	 * @returns {boolean}
	 */
	#is_illegal(module_id) {
		if (this.#is_kit_illegal(module_id) || this.#is_user_illegal(module_id)) return true;
		return false;
	}

	/**
	 * `true` if the provided ID represents a Kit-defined server-only module, else `false`.
	 * @param {string} module_id
	 * @returns {boolean}
	 */
	#is_kit_illegal(module_id) {
		return ILLEGAL_IMPORTS.has(module_id);
	}

	/**
	 * `true` if the provided ID represents a user-defined server-only module, else `false`.
	 * @param {string} module_id
	 * @returns {boolean}
	 */
	#is_user_illegal(module_id) {
		if (module_id.startsWith(this.#server_dir)) return true;

		// files outside the project root are ignored
		if (!module_id.startsWith(CWD_ID)) return false;

		// so are files inside node_modules
		if (module_id.startsWith(NODE_MODULES_ID)) return false;

		return ILLEGAL_MODULE_NAME_PATTERN.test(path.basename(module_id));
	}

	/**
	 * @param {string} str
	 * @param {number} times
	 */
	#repeat(str, times) {
		return new Array(times + 1).join(str);
	}

	/**
	 * Create a formatted error for an illegal import.
	 * @param {Array<ImportGraph>} stack
	 */
	#format_illegal_import_chain(stack) {
		const dev_virtual_prefix = '/@id/__x00__';
		const prod_virtual_prefix = '\0';

		stack = stack.map((graph) => {
			if (graph.id.startsWith(dev_virtual_prefix)) {
				return { ...graph, id: graph.id.replace(dev_virtual_prefix, '') };
			}
			if (graph.id.startsWith(prod_virtual_prefix)) {
				return { ...graph, id: graph.id.replace(prod_virtual_prefix, '') };
			}
			if (graph.id.startsWith(this.#lib_dir)) {
				return { ...graph, id: graph.id.replace(this.#lib_dir, '$lib') };
			}

			return { ...graph, id: path.relative(process.cwd(), graph.id) };
		});

		const pyramid = stack
			.map(
				(file, i) =>
					`${this.#repeat(' ', i * 2)}- ${file.id} ${
						file.dynamic ? '(imported by parent dynamically)' : ''
					}`
			)
			.join('\n');

		return `Cannot import ${stack.at(-1)?.id} into public-facing code:\n${pyramid}`;
	}
}

/** @implements {ImportGraph} */
export class RollupImportGraph {
	/** @type {(id: string) => import('rollup').ModuleInfo | null} */
	#node_getter;

	/** @type {import('rollup').ModuleInfo} */
	#module_info;

	/** @type {string} */
	id;

	/** @type {boolean} */
	dynamic;

	/** @type {Set<string>} */
	#seen;

	/**
	 * @param {(id: string) => import('rollup').ModuleInfo | null} node_getter
	 * @param {import('rollup').ModuleInfo} node
	 */
	constructor(node_getter, node) {
		this.#node_getter = node_getter;
		this.#module_info = node;
		this.id = remove_query_from_id(normalizePath(node.id));
		this.dynamic = false;
		this.#seen = new Set();
	}

	/**
	 * @param {(id: string) => import('rollup').ModuleInfo | null} node_getter
	 * @param {import('rollup').ModuleInfo} node
	 * @param {boolean} dynamic
	 * @param {Set<string>} seen;
	 * @returns {RollupImportGraph}
	 */
	static #new_internal(node_getter, node, dynamic, seen) {
		const instance = new RollupImportGraph(node_getter, node);
		instance.dynamic = dynamic;
		instance.#seen = seen;
		return instance;
	}

	get children() {
		return this.#children();
	}

	*#children() {
		if (this.#seen.has(this.id)) return;
		this.#seen.add(this.id);
		for (const id of this.#module_info.importedIds) {
			const child = this.#node_getter(id);
			if (child === null) return;
			yield RollupImportGraph.#new_internal(this.#node_getter, child, false, this.#seen);
		}
		for (const id of this.#module_info.dynamicallyImportedIds) {
			const child = this.#node_getter(id);
			if (child === null) return;
			yield RollupImportGraph.#new_internal(this.#node_getter, child, true, this.#seen);
		}
	}
}

/** @implements {ImportGraph} */
export class ViteImportGraph {
	/** @type {Set<string>} */
	#module_types;

	/** @type {import('vite').ModuleNode} */
	#module_info;

	/** @type {string} */
	id;

	/** @type {Set<string>} */
	#seen;

	/**
	 * @param {Set<string>} module_types Module types to analyze, eg '.js', '.ts', etc.
	 * @param {import('vite').ModuleNode} node
	 */
	constructor(module_types, node) {
		this.#module_types = module_types;
		this.#module_info = node;
		this.id = remove_query_from_id(normalizePath(node.id ?? ''));
		this.#seen = new Set();
	}

	/**
	 * @param {Set<string>} module_types Module types to analyze, eg '.js', '.ts', etc.
	 * @param {import('vite').ModuleNode} node
	 * @param {Set<string>} seen
	 * @returns {ViteImportGraph}
	 */
	static #new_internal(module_types, node, seen) {
		const instance = new ViteImportGraph(module_types, node);
		instance.#seen = seen;
		return instance;
	}

	get dynamic() {
		return false;
	}

	get children() {
		return this.#children();
	}

	*#children() {
		if (this.#seen.has(this.id)) return;
		this.#seen.add(this.id);
		for (const child of this.#module_info.importedModules) {
			if (!this.#module_types.has(path.extname(this.id))) {
				continue;
			}
			yield ViteImportGraph.#new_internal(this.#module_types, child, this.#seen);
		}
	}
}

/**
 * Throw an error if a private module is imported from a client-side node.
 * @param {(id: string) => import('rollup').ModuleInfo | null} node_getter
 * @param {import('rollup').ModuleInfo} node
 * @param {string} lib_dir
 * @returns {void}
 */
export function prevent_illegal_rollup_imports(node_getter, node, lib_dir) {
	const graph = new RollupImportGraph(node_getter, node);
	const guard = new IllegalModuleGuard(lib_dir);
	guard.assert_legal(graph);
}

/**
 * Throw an error if a private module is imported from a client-side node.
 * @param {import('vite').ModuleNode} node
 * @param {string} lib_dir
 * @param {Iterable<string>} module_types File extensions to analyze in addition to the defaults: `.ts`, `.js`, etc.
 * @returns {void}
 */
export function prevent_illegal_vite_imports(node, lib_dir, module_types) {
	const graph = new ViteImportGraph(get_module_types(module_types), node);
	const guard = new IllegalModuleGuard(lib_dir);
	guard.assert_legal(graph);
}
