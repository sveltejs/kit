import path from 'path';
import colors from 'kleur';
import { fileURLToPath } from 'url';
import { posixify } from '../utils/filesystem.js';

/**
 * Resolved path of the `runtime` directory
 *
 * TODO Windows issue:
 * Vite or sth else somehow sets the driver letter inconsistently to lower or upper case depending on the run environment.
 * In playwright debug mode run through VS Code this a root-to-lowercase conversion is needed in order for the tests to run.
 * If we do this conversion in other cases it has the opposite effect though and fails.
 */
export const runtime_directory = posixify(fileURLToPath(new URL('../runtime', import.meta.url)));

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
