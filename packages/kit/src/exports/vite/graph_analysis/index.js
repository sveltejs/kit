import path from 'node:path';
import { app_server, env_dynamic_private, env_static_private } from '../module_ids.js';

const ILLEGAL_IMPORTS = new Set([env_dynamic_private, env_static_private, app_server]);
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
