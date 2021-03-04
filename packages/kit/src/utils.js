import fs from 'fs';
import path from 'path';
import { mkdirp } from '@sveltejs/app-utils/files';

/**
 * @param {string} str
 * @param {number} len
 */
export function left_pad(str, len) {
	while (str.length < len) str = ` ${str}`;
	return str;
}

/**
 * @param {string} str
 * @param {number} i
 */
export function repeat(str, i) {
	let result = '';
	while (i--) result += str;
	return result;
}

/** @param {number} ms */
export function format_milliseconds(ms) {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

	const minutes = ~~(ms / 60000);
	const seconds = Math.round((ms % 60000) / 1000);
	return `${minutes}m${seconds < 10 ? '0' : ''}${seconds}s`;
}

/** @param {number} start */
export function elapsed(start) {
	return format_milliseconds(Date.now() - start);
}

/**
 * @param {string} cwd
 * @param {string} dir
 * @param {string[]} files
 */
export function walk(cwd, dir = cwd, files = []) {
	fs.readdirSync(dir).forEach((file) => {
		const resolved = path.resolve(dir, file);
		if (fs.statSync(resolved).isDirectory()) {
			walk(cwd, resolved, files);
		} else {
			files.push(posixify(path.relative(cwd, resolved)));
		}
	});

	return files;
}

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}

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
		fudge_mtime(file);
	}
}

/**
 * @param {string} string
 * @param {boolean} include_quotes
 */
export function stringify(string, include_quotes = true) {
	const quoted = JSON.stringify(string);
	return include_quotes ? quoted : quoted.slice(1, -1);
}

/** @param {string} file */
export function fudge_mtime(file) {
	// need to fudge the mtime so that webpack doesn't go doolally
	const { atime, mtime } = fs.statSync(file);
	fs.utimesSync(file, new Date(atime.getTime() - 999999), new Date(mtime.getTime() - 999999));
}

/** @param {string} user_path */
export function normalize_path(user_path) {
	const p = path.normalize(user_path);
	// normalize drive letter on Windows
	return p.length ? p.charAt(0).toLowerCase() + p.slice(1) : '';
}
