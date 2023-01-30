import path from 'node:path';
import { posixify } from '../../../utils/filesystem.js';

const ILLEGAL_IMPORTS = new Set(['\0$env/dynamic/private', '\0$env/static/private']);
const ILLEGAL_MODULE_NAME_PATTERN = /.*\.server\..+/;

/**
 * Checks if given id imports a module that is not allowed to be imported into client-side code.
 * @param {string} id
 * @param {{
 *   cwd: string;
 *   node_modules: string;
 *   server: string;
 * }} dirs
 */
export function is_illegal(id, dirs) {
	if (ILLEGAL_IMPORTS.has(id)) return true;
	if (!id.startsWith(dirs.cwd) || id.startsWith(dirs.node_modules)) return false;
	return ILLEGAL_MODULE_NAME_PATTERN.test(path.basename(id)) || id.startsWith(dirs.server);
}

/**
 * Creates a guard that checks that no id imports a module that is not allowed to be imported into client-side code.
 * @param {import('rollup').PluginContext} context
 * @param {{ cwd: string; lib: string }} paths
 */
export function module_guard(context, { cwd, lib }) {
	/** @type {Set<string>} */
	const seen = new Set();

	const dirs = {
		// ids will be posixified, so we need to posixify these, too
		cwd: posixify(cwd),
		node_modules: posixify(path.join(cwd, 'node_modules')),
		server: posixify(path.join(lib, 'server'))
	};

	/**
	 * @param {string} id
	 * @param {Array<{ id: string; dynamic: boolean }>} chain
	 */
	function follow(id, chain) {
		if (seen.has(id)) return;
		seen.add(id);

		if (is_illegal(id, dirs)) {
			chain.shift(); // discard the entry point
			id = normalize_id(id, lib, cwd);

			const pyramid =
				chain.map(({ id, dynamic }, i) => {
					id = normalize_id(id, lib, cwd);

					return `${' '.repeat(i * 2)}- ${id} ${dynamic ? 'dynamically imports' : 'imports'}\n`;
				}) + `${' '.repeat(chain.length)}- ${id}`;

			const message = `Cannot import ${id} into client-side code:\n${pyramid}`;

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
	}

	return {
		/** @param {string} id should be posixified */
		check: (id) => {
			follow(id, []);
		}
	};
}

/**
 * Removes cwd/lib path from the start of the id
 * @param {string} id
 * @param {string} lib
 * @param {string} cwd
 */
export function normalize_id(id, lib, cwd) {
	if (id.startsWith(lib)) {
		id = id.replace(lib, '$lib');
	}

	if (id.startsWith(cwd)) {
		id = path.relative(cwd, id);
	}

	return posixify(id);
}
