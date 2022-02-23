const absolute = /^([a-z]+:)?\/?\//;
const scheme = /^[a-z]+:/;

/**
 * @param {string} base
 * @param {string} path
 */
export function resolve(base, path) {
	if (scheme.test(path)) return path;

	const base_match = absolute.exec(base);
	const path_match = absolute.exec(path);

	if (!base_match) {
		throw new Error(`bad base path: "${base}"`);
	}

	const baseparts = path_match ? [] : base.slice(base_match[0].length).split('/');
	const pathparts = path_match ? path.slice(path_match[0].length).split('/') : path.split('/');

	baseparts.pop();

	for (let i = 0; i < pathparts.length; i += 1) {
		const part = pathparts[i];
		if (part === '.') continue;
		else if (part === '..') baseparts.pop();
		else baseparts.push(part);
	}

	const prefix = (path_match && path_match[0]) || (base_match && base_match[0]) || '';

	return `${prefix}${baseparts.join('/')}`;
}

/** @param {string} path */
export function is_root_relative(path) {
	return path[0] === '/' && path[1] !== '/';
}

/**
 * @param {string} path
 * @param {import('types').TrailingSlash} trailing_slash
 */
export function normalize_path(path, trailing_slash) {
	if (path === '/' || trailing_slash === 'ignore') return path;

	if (trailing_slash === 'never') {
		return path.endsWith('/') ? path.slice(0, -1) : path;
	} else if (trailing_slash === 'always' && /\/[^./]+$/.test(path)) {
		return path + '/';
	}

	return path;
}
