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
	const indentation = /** @type {RegExpExecArray} */ (/\n?(\s*)/.exec(str))[1];
	const pattern = new RegExp(`^${indentation}`, 'gm');
	return str.replace(pattern, '').trim();
}

/**
 * Adapted from https://github.com/joliss/js-string-escape/blob/master/index.js
 * @param {string} str
 * @returns
 */
export function escape(str) {
	return str.replace(/["'\\\n\r\u2028\u2029]/g, (character) => {
		// Escape all characters not included in SingleStringCharacters and
		// DoubleStringCharacters on
		// http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
		switch (character) {
			case '"':
			case "'":
			case '\\':
				return '\\' + character;
			// Four possible LineTerminator characters need to be escaped:
			case '\n':
				return '\\n';
			case '\r':
				return '\\r';
			case '\u2028':
				return '\\u2028';
			case '\u2029':
				return '\\u2029';
		}
		return '';
	});
}
