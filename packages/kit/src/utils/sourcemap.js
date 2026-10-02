import path from 'node:path';
import { posixify } from './os.js';

/**
 * Preserve relative source paths when a sourcemap is copied to a different directory.
 * @param {string} contents
 * @param {string} from
 * @param {string} to
 */
export function rebase_sourcemap(contents, from, to) {
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
	const rebased = rebase_sourcemap_sources(sourcemap, source_dir, target_dir);
	return rebase_sourcemap_sections(rebased, source_dir, target_dir);
}

/**
 * @param {any} sourcemap
 * @param {string} source_dir
 * @param {string} target_dir
 */
function rebase_sourcemap_sources(sourcemap, source_dir, target_dir) {
	if (sourcemap.sourceRoot) {
		const source_root = relocate_sourcemap_path(sourcemap.sourceRoot, source_dir, target_dir, true);
		return source_root === sourcemap.sourceRoot
			? sourcemap
			: { ...sourcemap, sourceRoot: source_root };
	}

	if (!Array.isArray(sourcemap.sources)) return sourcemap;

	const sources = map_preserving_identity(sourcemap.sources, (source) =>
		relocate_sourcemap_path(source, source_dir, target_dir)
	);
	return sources === sourcemap.sources ? sourcemap : { ...sourcemap, sources };
}

/**
 * @param {any} sourcemap
 * @param {string} source_dir
 * @param {string} target_dir
 */
function rebase_sourcemap_sections(sourcemap, source_dir, target_dir) {
	if (!Array.isArray(sourcemap.sections)) return sourcemap;

	const sections = map_preserving_identity(sourcemap.sections, (section) => {
		if (!section.map) return section;

		const map = rebase_sourcemap_paths(section.map, source_dir, target_dir);
		return map === section.map ? section : { ...section, map };
	});
	return sections === sourcemap.sections ? sourcemap : { ...sourcemap, sections };
}

/**
 * @template T
 * @param {T[]} values
 * @param {(value: T) => T} transform
 * @returns {T[]}
 */
function map_preserving_identity(values, transform) {
	const transformed = values.map(transform);
	return transformed.some((value, i) => value !== values[i]) ? transformed : values;
}

/**
 * @param {unknown} source
 * @param {string} source_dir
 * @param {string} target_dir
 * @param {boolean} [is_dir_prefix] - whether `source` is a directory prefix
 *   (i.e. `sourceRoot`), in which case a trailing slash must be preserved
 *   because it is semantically significant under URL resolution
 *   (consumers treat `.../src` and `.../src/` differently)
 */
function relocate_sourcemap_path(source, source_dir, target_dir, is_dir_prefix = false) {
	if (typeof source !== 'string' || !is_relative_path(source)) return source;
	let relocated = posixify(path.relative(target_dir, path.resolve(source_dir, source)));
	if (is_dir_prefix) {
		// `path.relative`/`path.resolve` strip trailing slashes, but for a
		// `sourceRoot` the trailing slash matters, so restore it when the
		// original value had one
		if (source.endsWith('/') && relocated && !relocated.endsWith('/')) {
			relocated += '/';
		}
		// an empty relative path means the target dir itself; represent it as
		// `./` rather than `.` so URL resolution stays anchored to the dir
		return relocated || './';
	}
	return relocated || '.';
}

/** @param {string} source */
function is_relative_path(source) {
	return !path.posix.isAbsolute(source) && !path.win32.isAbsolute(source) && !URL.canParse(source);
}
