import path from 'path';
import colors from 'kleur';
import { fileURLToPath } from 'url';

/** Resolved path of the `runtime` directory */
export const runtime_directory = lowercase_root(
	fileURLToPath(new URL('../runtime', import.meta.url))
);

/**
 * Vite puts a lowercase root dir in front of the posixified path, while Windows uses uppercase.
 * Vite thinks these are two separate paths, so we need to lowercase the root.
 * @param {string} dir_path */
function lowercase_root(dir_path) {
	// TODO Vite or sth else somehow sets the driver letter inconsistently to lower or upper case depending on the run environment.
	// In playwright debug mode run through VS Code this lowercase conversion is needed, else it has the opposite effect and introduces bugs.
	return dir_path;
	const parsed = path.parse(dir_path);
	// We know there's name and we know there's no extension since we call this with a directory path
	return parsed.root.toLowerCase() + parsed.dir.slice(parsed.root.length) + path.sep + parsed.name;
}

/** Prefix for the `runtime` directory, for use with import declarations */
export const runtime_prefix = posixify_path(runtime_directory);

/** @param {string} str */
function posixify_path(str) {
	const parsed = path.parse(str);
	return `/${parsed.dir.slice(parsed.root.length).split(path.sep).join('/')}/${parsed.base}`;
}

function noop() {}

/** @param {{ verbose: boolean }} opts */
export function logger({ verbose }) {
	/** @type {import('types').Logger} */
	const log = (msg) => console.log(msg.replace(/^/gm, '  '));

	/** @param {string} msg */
	const err = (msg) => console.error(msg.replace(/^/gm, '  '));

	log.success = (msg) => log(colors.green(`✔ ${msg}`));
	log.error = (msg) => err(colors.bold().red(msg));
	log.warn = (msg) => log(colors.bold().yellow(msg));

	log.minor = verbose ? (msg) => log(colors.grey(msg)) : noop;
	log.info = verbose ? log : noop;

	return log;
}

/** @param {import('types').ManifestData} manifest_data */
export function get_mime_lookup(manifest_data) {
	/** @type {Record<string, string>} */
	const mime = {};

	manifest_data.assets.forEach((asset) => {
		if (asset.type) {
			const ext = path.extname(asset.file);
			mime[ext] = asset.type;
		}
	});

	return mime;
}
