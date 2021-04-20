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
	return ['svelte', '@sveltejs/kit', ...user_specified_deps, ...find_svelte_packages(cwd)];
}
