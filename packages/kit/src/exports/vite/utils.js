import path from 'path';
import { loadConfigFromFile, loadEnv, normalizePath } from 'vite';
import { runtime_directory } from '../../core/utils.js';
import { posixify } from '../../utils/filesystem.js';

class IllegalModuleGuard {
	/** @type {string} */
	#lib_dir;

	/** @type {string} */
	#server_dir;

	/** @type {string} */
	#node_modules_dir = normalizePath(path.resolve(process.cwd(), 'node_modules'));

	/** @type {string} */
	#cwd = normalizePath(process.cwd());

	/** @type {Set<string>} */
	#illegal_imports = new Set([
		'/@id/__x00__$env/dynamic/private', //dev
		'\0$env/dynamic/private', // prod
		'/@id/__x00__$env/static/private', // dev
		'\0$env/static/private' // prod
	]);

	/** @type {Array<import('types').ImportNode>} */
	#chain = [];

	/**
	 * @param {string} lib_dir
	 */
	constructor(lib_dir) {
		this.#lib_dir = normalizePath(lib_dir);
		this.#server_dir = normalizePath(path.resolve(lib_dir, 'server'));
	}

	/**
	 * @param {import('types').ImportNode} node
	 * @returns {void}
	 */
	assert_legal(node) {
		this.#chain.push(node);
		for (const child of node.children) {
			if (this.#is_illegal(child.name)) {
				this.#chain.push(child);
				throw new Error(this.#format_illegal_import_chain(this.#chain));
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
		return this.#illegal_imports.has(module_id);
	}

	/**
	 * `true` if the provided ID represents a user-defined server-only module, else `false`.
	 * @param {string} module_id
	 * @returns {boolean}
	 */
	#is_user_illegal(module_id) {
		if (module_id.startsWith(this.#server_dir)) return true;

		// files outside the project root are ignored
		if (!module_id.startsWith(this.#cwd)) return false;

		// so are files inside node_modules
		if (module_id.startsWith(this.#node_modules_dir)) return false;

		return /.*\.server\..+/.test(path.basename(module_id));
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
	 * @param {Array<{name: string, dynamic: boolean}>} stack
	 */
	#format_illegal_import_chain(stack) {
		const dev_virtual_prefix = '/@id/__x00__';
		const prod_virtual_prefix = '\0';

		stack = stack.map((file) => {
			if (file.name.startsWith(dev_virtual_prefix)) {
				return { ...file, name: file.name.replace(dev_virtual_prefix, '') };
			}
			if (file.name.startsWith(prod_virtual_prefix)) {
				return { ...file, name: file.name.replace(prod_virtual_prefix, '') };
			}
			if (file.name.startsWith(this.#lib_dir)) {
				return { ...file, name: file.name.replace(this.#lib_dir, '$lib') };
			}

			return { ...file, name: path.relative(process.cwd(), file.name) };
		});

		const pyramid = stack
			.map(
				(file, i) =>
					`${this.#repeat(' ', i * 2)}- ${file.name} ${
						file.dynamic ? '(imported by parent dynamically)' : ''
					}`
			)
			.join('\n');

		return `Cannot import ${stack.at(-1)?.name} into client-side code:\n${pyramid}`;
	}
}

class RollupImportGraph {
	/** @type {(id: string) => import('rollup').ModuleInfo | null} */
	#node_getter;

	/** @type {import('rollup').ModuleInfo} */
	#module_info;

	/** @type {string} */
	name;

	/** @type {boolean} */
	dynamic;

	/** @type {Set<string>} */
	#seen;

	/**
	 * @param {(id: string) => import('rollup').ModuleInfo | null} node_getter
	 * @param {import('rollup').ModuleInfo} node
	 * @param {boolean} dynamic
	 * @param {Set<string>} seen
	 */
	constructor(node_getter, node, dynamic = false, seen = new Set()) {
		this.#node_getter = node_getter;
		this.#module_info = node;
		this.name = remove_query_from_path(normalizePath(node.id));
		this.dynamic = dynamic;
		this.#seen = seen;
		void (/** @type {import('types').ImportNode} */ (this));
	}

	get children() {
		return this.#children();
	}

	*#children() {
		if (this.#seen.has(this.name)) return;
		this.#seen.add(this.name);
		for (const id of this.#module_info.importedIds) {
			const child = this.#node_getter(id);
			if (child === null) return;
			yield new RollupImportGraph(this.#node_getter, child, false, this.#seen);
		}
		for (const id of this.#module_info.dynamicallyImportedIds) {
			const child = this.#node_getter(id);
			if (child === null) return;
			yield new RollupImportGraph(this.#node_getter, child, true, this.#seen);
		}
	}
}

class ViteImportGraph {
	/** @type {Set<string>} */
	#module_types;

	/** @type {import('vite').ModuleNode} */
	#module_info;

	/** @type {string} */
	name;

	/** @type {Set<string>} */
	#seen;

	/**
	 * @param {Set<string>} module_types Module types to analyze, eg '.js', '.ts', etc.
	 * @param {import('vite').ModuleNode} node
	 * @param {Set<string>} seen
	 */
	constructor(module_types, node, seen = new Set()) {
		this.#module_types = module_types;
		this.#module_info = node;
		this.name = remove_query_from_path(normalizePath(node.id ?? ''));
		this.#seen = seen;
		void (/** @type {import('types').ImportNode} */ (this));
	}

	get dynamic() {
		return false;
	}

	get children() {
		return this.#children();
	}

	*#children() {
		if (this.#seen.has(this.name)) return;
		this.#seen.add(this.name);
		for (const child of this.#module_info.importedModules) {
			if (!this.#module_types.has(path.extname(this.name))) {
				continue;
			}
			yield new ViteImportGraph(this.#module_types, child, this.#seen);
		}
	}
}

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

const query_pattern = /\?.*$/s;

/** @param {string} path */
function remove_query_from_path(path) {
	return path.replace(query_pattern, '');
}

/**
 * Vite does some weird things with import trees in dev
 * for example, a Tailwind app.css will appear to import
 * every file in the project. This isn't a problem for
 * Rollup during build.
 * @param {Iterable<string>} config_module_types
 */
const get_module_types = (config_module_types) => {
	return new Set([
		'',
		'.ts',
		'.js',
		'.svelte',
		'.mts',
		'.mjs',
		'.cts',
		'.cjs',
		'.svelte.md',
		'.svx',
		'.md',
		...config_module_types
	]);
};

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
