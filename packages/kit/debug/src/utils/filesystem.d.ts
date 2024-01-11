/** @param {string} dir */
export function mkdirp(dir: string): void;
/** @param {string} path */
export function rimraf(path: string): void;
/**
 * @param {string} source
 * @param {string} target
 * @param {{
 *   filter?: (basename: string) => boolean;
 *   replace?: Record<string, string>;
 * }} opts
 */
export function copy(source: string, target: string, opts?: {
    filter?: ((basename: string) => boolean) | undefined;
    replace?: Record<string, string> | undefined;
}): string[];
/**
 * Get a list of all files in a directory
 * @param {string} cwd - the directory to walk
 * @param {boolean} [dirs] - whether to include directories in the result
 * @returns {string[]} a list of all found files (and possibly directories) relative to `cwd`
 */
export function walk(cwd: string, dirs?: boolean | undefined): string[];
/** @param {string} str */
export function posixify(str: string): string;
/**
 * Like `path.join`, but posixified and with a leading `./` if necessary
 * @param {string[]} str
 */
export function join_relative(...str: string[]): string;
/**
 * Like `path.relative`, but always posixified and with a leading `./` if necessary.
 * Useful for JS imports so the path can safely reside inside of `node_modules`.
 * Otherwise paths could be falsely interpreted as package paths.
 * @param {string} from
 * @param {string} to
 */
export function relative_path(from: string, to: string): string;
/**
 * Prepend given path with `/@fs` prefix
 * @param {string} str
 */
export function to_fs(str: string): string;
/**
 * Given an entry point like [cwd]/src/hooks, returns a filename like [cwd]/src/hooks.js or [cwd]/src/hooks/index.js
 * @param {string} entry
 * @returns {string|null}
 */
export function resolve_entry(entry: string): string | null;
/** @param {string} file */
export function read(file: string): string;
//# sourceMappingURL=filesystem.d.ts.map