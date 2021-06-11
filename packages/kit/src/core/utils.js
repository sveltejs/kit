import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import { copy } from './filesystem/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @param {string} dest */
export function copy_assets(dest) {
	let prefix = '..';
	do {
		// we jump through these hoops so that this function
		// works whether or not it's been bundled
		const resolved = path.resolve(__dirname, `${prefix}/assets`);

		if (fs.existsSync(resolved)) {
			copy(resolved, dest);
			return;
		}

		prefix = `../${prefix}`;
	} while (true); // eslint-disable-line
}

function noop() {}

/** @param {{ verbose: boolean }} opts */
export function logger({ verbose }) {
	/** @type {import('types/internal').Logger} */
	const log = (msg) => console.log(msg.replace(/^/gm, '  '));

	log.success = (msg) => log(colors.green(`✔ ${msg}`));
	log.error = (msg) => log(colors.bold().red(msg));
	log.warn = (msg) => log(colors.bold().yellow(msg));

	log.minor = verbose ? (msg) => log(colors.grey(msg)) : noop;
	log.info = verbose ? log : noop;

	return log;
}

/**
 * Given an entry point like [cwd]/src/hooks, returns a filename like [cwd]/src/hooks.js or [cwd]/src/hooks/index.js
 * @param {string} entry
 * @returns {string}
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

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * Get a list of packages that use pkg.svelte, so they can be added
 * to ssr.noExternal. This is done on a best-effort basis to reduce
 * the frequency of 'Must use import to load ES Module' and similar
 * @param {string} cwd
 * @returns {string[]}
 */
function find_svelte_packages(cwd) {
	const pkg_file = path.join(cwd, 'package.json');
	if (!fs.existsSync(pkg_file)) return [];

	const pkg = JSON.parse(fs.readFileSync(pkg_file, 'utf8'));

	const deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];

	return deps.filter((dep) => {
		const dep_pkg_file = path.join(cwd, 'node_modules', dep, 'package.json');
		if (!fs.existsSync(dep_pkg_file)) return false;

		const dep_pkg = JSON.parse(fs.readFileSync(dep_pkg_file, 'utf-8'));
		return !!dep_pkg.svelte;
	});
}

/**
 * @param {string} cwd
 * @param {string[]} [user_specified_deps]
 */
export function get_no_external(cwd, user_specified_deps = []) {
	return [...user_specified_deps, ...find_svelte_packages(cwd)];
}

/**
 * Merges b into a, recursively, mutating a.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @param {string[]} conflicts array to accumulate conflicts in
 * @param {string[]} path array of property names representing the current
 *     location in the tree
 */
function merge_into(a, b, conflicts = [], path = []) {
	/**
	 * @param {any} x
	 */
	const is_object = (x) => typeof x === 'object' && !Array.isArray(x);

	for (const prop in b) {
		if (is_object(b[prop])) {
			if (!is_object(a[prop])) {
				if (a[prop] !== undefined) {
					conflicts.push([...path, prop].join('.'));
				}
				a[prop] = {};
			}
			merge_into(a[prop], b[prop], conflicts, [...path, prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				if (a[prop] !== undefined) {
					conflicts.push([...path, prop].join('.'));
				}
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			if (a[prop] !== undefined) {
				conflicts.push([...path, prop].join('.'));
			}
			a[prop] = b[prop];
		}
	}
}

/**
 * Takes zero or more objects and returns a new object that has all the values
 * deeply merged together. None of the original objects will be mutated at any
 * level, and the returned object will have no references to the original
 * objects at any depth. If there's a conflict the last one wins, except for
 * arrays which will be combined.
 * @param {...Object} objects
 * @returns {[Record<string, any>, string[]]} a 2-tuple with the merged object,
 *     and a list of merge conflicts if there were any, in dotted notation
 */
export function deep_merge(...objects) {
	const result = {};
	/** @type {string[]} */
	const conflicts = [];
	objects.forEach((o) => merge_into(result, o, conflicts));
	return [result, conflicts];
}

/**
 * @param {string[]} conflicts - array of conflicts in dotted notation
 * @param {string=} pathPrefix - prepended in front of the path
 * @param {string=} scope - used to prefix the whole error message
 */
export function print_config_conflicts(conflicts, pathPrefix = '', scope) {
	const prefix = scope ? scope + ': ' : '';
	const log = logger({ verbose: false });
	conflicts.forEach((conflict) => {
		log.error(
			`${prefix}The value for ${pathPrefix}${conflict} specified in svelte.config.js has been ignored. This option is controlled by SvelteKit.`
		);
	});
}
