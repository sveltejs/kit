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

/**
 * @param {(file: string) => boolean} should_remove
 */
export function remove_from_previous(should_remove) {
	for (const key of previous_contents.keys()) {
		if (should_remove(key)) {
			previous_contents.delete(key);
		}
	}
}

/** @param {string} str */
export function trim(str) {
	const indentation = /** @type {RegExpExecArray} */ (/\n?(\s*)/.exec(str))[1];
	const pattern = new RegExp(`^${indentation}`, 'gm');
	return str.replace(pattern, '').trim();
}

export const reserved = new Set([
	'do',
	'if',
	'in',
	'for',
	'let',
	'new',
	'try',
	'var',
	'case',
	'else',
	'enum',
	'eval',
	'null',
	'this',
	'true',
	'void',
	'with',
	'await',
	'break',
	'catch',
	'class',
	'const',
	'false',
	'super',
	'throw',
	'while',
	'yield',
	'delete',
	'export',
	'import',
	'public',
	'return',
	'static',
	'switch',
	'typeof',
	'default',
	'extends',
	'finally',
	'package',
	'private',
	'continue',
	'debugger',
	'function',
	'arguments',
	'interface',
	'protected',
	'implements',
	'instanceof'
]);

export const valid_identifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
