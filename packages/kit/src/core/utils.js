import fs from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { to_fs } from '../exports/vite/filesystem.js';
import { runtime_directory } from '../runtime/utils.js';
import { noop } from '../utils/functions.js';
import { posixify } from '../utils/os.js';

/**
 * This allows us to import SvelteKit internals that aren't exposed via `pkg.exports` in a
 * way that works whether `@sveltejs/kit` is installed inside the project's `node_modules`
 * or in a workspace root
 * @param {string} root
 * @returns {string}
 */
export function get_runtime_base(root) {
	return runtime_directory.startsWith(root)
		? `/${posixify(path.relative(root, runtime_directory))}`
		: to_fs(runtime_directory);
}

/** @param {{ verbose: boolean }} opts */
export function logger({ verbose }) {
	/** @type {import('types').Logger} */
	const log = (msg) => console.log(msg.replace(/^/gm, '  '));

	/** @param {string} msg */
	const err = (msg) => console.error(msg.replace(/^/gm, '  '));

	log.success = (msg) => log(styleText('green', `✔ ${msg}`));
	log.error = (msg) => err(styleText(['bold', 'red'], msg));
	log.warn = (msg) => log(styleText(['bold', 'yellow'], msg));
	log.minor = verbose ? (msg) => log(styleText('grey', msg)) : noop;
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

/**
 * @param {string} dir
 * @param {(file: string) => boolean} [filter]
 */
export function list_files(dir, filter) {
	/** @type {string[]} */
	const files = [];

	/** @param {string} current */
	function walk(current) {
		for (const file of fs.readdirSync(path.resolve(dir, current))) {
			const child = path.posix.join(current, file);
			if (fs.statSync(path.resolve(dir, child)).isDirectory()) {
				walk(child);
			} else {
				if (!filter || filter(child)) {
					files.push(child);
				}
			}
		}
	}

	if (fs.existsSync(dir)) walk('');

	return files;
}
