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
		previous_contents.set(file, code);
		mkdirp(path.dirname(file));
		fs.writeFileSync(file, code);
	}
}

/** @param {string} str */
export function trim(str) {
	return str.replace(/^\t\t/gm, '').trim();
}
