import path from 'path';
import { normalizePath } from 'vite';

const cwd = normalizePath(process.cwd());
const node_modules = normalizePath(path.resolve(process.cwd(), 'node_modules'));
const ILLEGAL_IMPORTS = new Set(['\0$env/dynamic/private', '\0$env/static/private']);
const ILLEGAL_MODULE_NAME_PATTERN = /.*\.server\..+/;

/**
 * @param {import('rollup').PluginContext} context
 * @param {string} lib
 */
export function module_guard(context, lib) {
	/** @type {Set<string>} */
	const safe = new Set();

	const lib_dir = normalizePath(lib);
	const server_dir = normalizePath(path.resolve(lib, 'server'));

	/**
	 * @param {string} id
	 * @param {Array<{ id: string, dynamic: boolean }>} chain
	 */
	function follow(id, chain = []) {
		if (safe.has(id)) return;

		if (
			ILLEGAL_IMPORTS.has(id) ||
			id.startsWith(server_dir) ||
			(ILLEGAL_MODULE_NAME_PATTERN.test(path.basename(id)) &&
				id.startsWith(cwd) &&
				!id.startsWith(node_modules))
		) {
			chain.shift(); // discard the entry point

			if (id.startsWith(lib_dir)) id = id.replace(lib_dir, '$lib');
			if (id.startsWith(cwd)) id = path.relative(cwd, id);

			const pyramid =
				chain.map(({ id, dynamic }, i) => {
					if (id.startsWith(lib_dir)) id = id.replace(lib_dir, '$lib');
					if (id.startsWith(cwd)) id = path.relative(cwd, id);

					return `${repeat(' ', i * 2)}- ${id} ${dynamic ? 'dynamically imports' : 'imports'}\n`;
				}) + `${repeat(' ', chain.length)}- ${id}`;

			const message = `Cannot import ${id} into public-facing code:\n${pyramid}`;

			throw new Error(message);
		}

		const module = context.getModuleInfo(id);

		if (module) {
			for (const child of module.importedIds) {
				follow(child, [...chain, { id, dynamic: false }]);
			}

			for (const child of module.dynamicallyImportedIds) {
				follow(child, [...chain, { id, dynamic: true }]);
			}
		}

		safe.add(id);
	}

	return {
		/** @param {string} id */
		check: (id) => {
			follow(id, []);
		}
	};
}

/**
 * @param {string} str
 * @param {number} times
 */
function repeat(str, times) {
	return new Array(times + 1).join(str);
}
