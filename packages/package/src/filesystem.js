import fs from 'node:fs';
import path from 'node:path';

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * Get a list of all files in a directory
 * @param {string} cwd - the directory to walk
 */
export function walk(cwd) {
	return fs.globSync('**', { cwd }).filter((file) => fs.statSync(path.join(cwd, file)).isFile());
}
