import fs from 'fs';
import path from 'path';

/** @param {string} dir */
export function mkdirp(dir) {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch (/** @type {any} */ e) {
		if (e.code === 'EEXIST') {
			if (!fs.statSync(dir).isDirectory()) {
				throw new Error(`Cannot create directory ${dir}, a file already exists at this position`);
			}
			return;
		}
		throw e;
	}
}

/** @param {string} path */
export function rimraf(path) {
	fs.rmSync(path, { force: true, recursive: true });
}

/**
 * @param {string} source
 * @param {string} target
 * @param {{
 *   filter?: (basename: string) => boolean;
 *   replace?: Record<string, string>;
 * }} opts
 */
export function copy(source, target, opts = {}) {
	if (!fs.existsSync(source)) return [];

	/** @type {string[]} */
	const files = [];

	const prefix = posixify(target) + '/';

	const regex = opts.replace
		? new RegExp(`\\b(${Object.keys(opts.replace).join('|')})\\b`, 'g')
		: null;

	/**
	 * @param {string} from
	 * @param {string} to
	 */
	function go(from, to) {
		if (opts.filter && !opts.filter(path.basename(from))) return;

		const stats = fs.statSync(from);

		if (stats.isDirectory()) {
			fs.readdirSync(from).forEach((file) => {
				go(path.join(from, file), path.join(to, file));
			});
		} else {
			mkdirp(path.dirname(to));

			if (opts.replace) {
				const data = fs.readFileSync(from, 'utf-8');
				fs.writeFileSync(
					to,
					data.replace(
						/** @type {RegExp} */ (regex),
						(_match, key) => /** @type {Record<string, string>} */ (opts.replace)[key]
					)
				);
			} else {
				fs.copyFileSync(from, to);
			}

			files.push(to === target ? posixify(path.basename(to)) : posixify(to).replace(prefix, ''));
		}
	}

	go(source, target);

	return files;
}

/**
 * Get a list of all files in a directory
 * @param {string} cwd - the directory to walk
 * @param {boolean} [dirs] - whether to include directories in the result
 */
export function walk(cwd, dirs = false) {
	/** @type {string[]} */
	const all_files = [];

	/** @param {string} dir */
	function walk_dir(dir) {
		const files = fs.readdirSync(path.join(cwd, dir));

		for (const file of files) {
			const joined = path.join(dir, file);
			const stats = fs.statSync(path.join(cwd, joined));
			if (stats.isDirectory()) {
				if (dirs) all_files.push(joined);
				walk_dir(joined);
			} else {
				all_files.push(joined);
			}
		}
	}

	return walk_dir(''), all_files;
}

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * Given an entry point like [cwd]/src/hooks, returns a filename like [cwd]/src/hooks.js or [cwd]/src/hooks/index.js
 * @param {string} entry
 * @returns {string|null}
 */
export function resolve_entry(entry) {
	if (fs.existsSync(entry)) {
		const stats = fs.statSync(entry);
		if (stats.isDirectory()) {
			return resolve_entry(path.join(entry, 'index'));
		}

		return entry;
	} else {
		const dir = path.dirname(entry);

		if (fs.existsSync(dir)) {
			const base = path.basename(entry);
			const files = fs.readdirSync(dir);

			const found = files.find((file) => file.replace(/\.[^.]+$/, '') === base);

			if (found) return path.join(dir, found);
		}
	}

	return null;
}
