import fs from 'fs';
import path from 'path';
import { mkdirp } from '../../utils/filesystem.js';

/** @type {Map<string, string>} */
const previous_contents = new Map();

/**
 * @param {string} file
 * @param {string} code
 */
export function write_if_changed(file, code) {
	if (code !== previous_contents.get(file)) {
		write(file, code);
	}
}

/**
 * @param {string} file
 * @param {string} code
 */
export function write(file, code) {
	previous_contents.set(file, code);
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, code);
}

/** @param {string} str */
export function trim(str) {
	const indentation = /** @type {RegExpExecArray} */ (/\n?([ \t]*)/.exec(str))[1];
	const pattern = new RegExp(`^${indentation}`, 'gm');
	return str.replace(pattern, '').trim();
}

/**
 * This function generates relative paths, whoose `from` argument can safely reside
 * inside of `node_modules`. Otherwise paths returned by `path.relative` could be interpreted
 * as package paths.
 *
 * @param { string } from
 * @param { string } to
 * @returns { string }
 */
export function relative_path(from, to) {
	return `.${path.sep}${path.relative(from, to)}`;
}
