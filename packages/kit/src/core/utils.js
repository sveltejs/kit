import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import { to_fs } from '../utils/vite.js';
import { noop } from '../utils/functions.js';
import { hash } from '../utils/hash.js';
import { posixify } from '../utils/os.js';

/**
<<<<<<< version-chunk-rotation-fix
 * Returns a deterministic identifier for the `globalThis.__sveltekit_${payload_hash}`
 * payload global.
 *
 * It must not be derived from `kit.version.name`: the name is inlined into
 * content-hashed client chunks in `__SVELTEKIT_PAYLOAD__` via the
 * `$env/dynamic/public` virtual module, so a version-derived identifier rotates the
 * hashed filename of every chunk referencing it on each deploy (#12260).
 *
 * It must still distinguish SvelteKit apps from different projects embedded in the
 * same document (#9576), so it is derived from the project's `package.json` name
 * plus `paths.base` and `appDir` — all deterministic across repeated config loads
 * within a build and across machines.
 *
 * @param {import('types').ValidatedKitConfig} kit
 * @returns {string}
 */
export function payload_hash(kit) {
	if (kit.embedded) return hash(kit.version.name);

	const root = path.dirname(kit.outDir);

	let name = '';

	try {
		name = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).name ?? '';
	} catch {
		// TODO log error or similiar
	}

	if (!name) name = path.basename(root);

	return hash(`${name}\n${kit.paths.base}\n${kit.appDir}`);
}

/**
 * Resolved path of the `runtime` directory
=======
 * Resolved path of the `runtime` directory posix-ified
>>>>>>> version-3
 *
 * TODO Windows issue:
 * Vite or sth else somehow sets the driver letter inconsistently to lower or upper case depending on the run environment.
 * In playwright debug mode run through VS Code this a root-to-lowercase conversion is needed in order for the tests to run.
 * If we do this conversion in other cases it has the opposite effect though and fails.
 */
export const runtime_directory = posixify(fileURLToPath(new URL('../runtime', import.meta.url)));

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
