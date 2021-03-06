import fs from 'fs';
import path from 'path';

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
