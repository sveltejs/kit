import fs from 'node:fs';
import path from 'node:path';
import { posixify } from './os.js';

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

	const regex = opts.replace
		? new RegExp(`\\b(${Object.keys(opts.replace).join('|')})\\b`, 'g')
		: null;

	/** @type {string | undefined} */
	let created;

	/**
	 * @param {string} from
	 * @param {string} to
	 * @param {string} file posix path of `to` relative to `target`, empty when copying a single file
	 * @param {boolean} is_directory
	 */
	function go(from, to, file, is_directory) {
		if (opts.filter && !opts.filter(path.basename(from))) return;

		if (is_directory) {
			for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
				const child = path.join(from, entry.name);
				go(
					child,
					path.join(to, entry.name),
					file ? `${file}/${entry.name}` : entry.name,
					entry.isSymbolicLink() ? fs.statSync(child).isDirectory() : entry.isDirectory()
				);
			}
			return;
		}

		const dir = path.dirname(to);
		if (dir !== created) {
			fs.mkdirSync(dir, { recursive: true });
			created = dir;
		}

		const is_sourcemap = path.extname(from) === '.map';
		if (opts.replace || is_sourcemap) {
			let data = fs.readFileSync(from, 'utf-8');
			if (opts.replace) {
				data = data.replace(
					/** @type {RegExp} */ (regex),
					(_match, key) => /** @type {Record<string, string>} */ (opts.replace)[key]
				);
			}
			if (is_sourcemap) data = rebase_sourcemap(data, from, to);
			fs.writeFileSync(to, data);
		} else {
			fs.copyFileSync(from, to);
		}

		files.push(file || posixify(path.basename(to)));
	}

	go(source, target, '', fs.statSync(source).isDirectory());

	return files;
}

/**
 * Preserve relative source paths when a sourcemap is copied to a different directory.
 * @param {string} contents
 * @param {string} from
 * @param {string} to
 */
function rebase_sourcemap(contents, from, to) {
	const source_dir = path.dirname(from);
	const target_dir = path.dirname(to);
	if (path.resolve(source_dir) === path.resolve(target_dir)) return contents;

	/** @type {any} */
	let sourcemap;
	try {
		sourcemap = JSON.parse(contents);
	} catch {
		// A .map file is not necessarily a sourcemap
		return contents;
	}

	if (sourcemap.version !== 3) return contents;

	const rebased = rebase_sourcemap_paths(sourcemap, source_dir, target_dir);
	if (rebased === sourcemap) return contents;

	return JSON.stringify(rebased) + (contents.endsWith('\n') ? '\n' : '');
}

/**
 * @param {any} sourcemap
 * @param {string} source_dir
 * @param {string} target_dir
 * @returns {any}
 */
function rebase_sourcemap_paths(sourcemap, source_dir, target_dir) {
	let rebased = sourcemap;

	if (sourcemap.sourceRoot) {
		const source_root = relocate_sourcemap_path(sourcemap.sourceRoot, source_dir, target_dir);
		if (source_root !== sourcemap.sourceRoot) rebased = { ...rebased, sourceRoot: source_root };
	} else if (Array.isArray(sourcemap.sources)) {
		const sources = sourcemap.sources.map(
			/** @param {unknown} source */ (source) =>
				relocate_sourcemap_path(source, source_dir, target_dir)
		);
		if (
			sources.some(
				/** @param {unknown} source @param {number} i */ (source, i) =>
					source !== sourcemap.sources[i]
			)
		) {
			rebased = { ...rebased, sources };
		}
	}

	if (Array.isArray(sourcemap.sections)) {
		let sections = sourcemap.sections;
		for (let i = 0; i < sections.length; i += 1) {
			const section = sections[i];
			if (!section.map) continue;

			const map = rebase_sourcemap_paths(section.map, source_dir, target_dir);
			if (map !== section.map) {
				if (sections === sourcemap.sections) sections = [...sections];
				sections[i] = { ...section, map };
			}
		}
		if (sections !== sourcemap.sections) rebased = { ...rebased, sections };
	}

	return rebased;
}

/**
 * @param {unknown} source
 * @param {string} source_dir
 * @param {string} target_dir
 */
function relocate_sourcemap_path(source, source_dir, target_dir) {
	if (typeof source !== 'string' || !is_relative_path(source)) return source;
	return posixify(path.relative(target_dir, path.resolve(source_dir, source))) || '.';
}

/** @param {string} source */
function is_relative_path(source) {
	return !path.posix.isAbsolute(source) && !path.win32.isAbsolute(source) && !URL.canParse(source);
}

/**
 * Get a list of all files in a directory
 * @param {string} cwd - the directory to walk
 * @param {string} [dir] - the subdirectory to walk, relative to `cwd`
 * @returns {Generator<string>} the posix paths of all found files, relative to `cwd`
 */
export function* walk(cwd, dir = '') {
	for (const entry of fs.readdirSync(path.join(cwd, dir), { withFileTypes: true })) {
		const joined = dir ? `${dir}/${entry.name}` : entry.name;
		const is_directory = entry.isSymbolicLink()
			? fs.statSync(path.join(cwd, joined)).isDirectory()
			: entry.isDirectory();

		if (is_directory) {
			yield* walk(cwd, joined);
		} else {
			yield joined;
		}
	}
}

/**
 * Like `path.join`, but posixified and with a leading `./` if necessary
 * @param {string[]} str
 */
export function join_relative(...str) {
	let result = posixify(path.join(...str));
	if (!result.startsWith('.')) {
		result = `./${result}`;
	}
	return result;
}

/**
 * Like `path.relative`, but always posixified and with a leading `./` if necessary.
 * Useful for JS imports so the path can safely reside inside of `node_modules`.
 * Otherwise paths could be falsely interpreted as package paths.
 * @param {string} from
 * @param {string} to
 */
export function relative_path(from, to) {
	return join_relative(path.relative(from, to));
}

/**
 * Given an entry point like [cwd]/src/hooks, returns a filename like [cwd]/src/hooks.js or [cwd]/src/hooks/index.js
 * @param {string} entry
 * @returns {string | null}
 */
export function resolve_entry(entry) {
	if (fs.existsSync(entry)) {
		const stats = fs.statSync(entry);
		if (stats.isFile()) {
			return entry;
		}

		const index = path.join(entry, 'index');
		if (fs.existsSync(index + '.js') || fs.existsSync(index + '.ts')) {
			return resolve_entry(index);
		}
	}

	const dir = path.dirname(entry);

	if (fs.existsSync(dir)) {
		const base = path.basename(entry);
		const files = fs.readdirSync(dir);
		const found = files.find((file) => {
			return file.replace(/\.(js|ts)$/, '') === base && fs.statSync(path.join(dir, file)).isFile();
		});

		if (found) return path.join(dir, found);
	}

	return null;
}

/** @param {string} file */
export function read(file) {
	return fs.readFileSync(file, 'utf-8');
}
