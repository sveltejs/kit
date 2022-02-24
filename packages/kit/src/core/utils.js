import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import { copy } from '../utils/filesystem.js';
import { fileURLToPath } from 'url';
import { SVELTE_KIT } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runtime = process.env.BUNDLED
	? posixify_path(path.resolve(`${SVELTE_KIT}/runtime`))
	: posixify_path(fileURLToPath(new URL('../runtime', import.meta.url)));

/** @param {string} str */
function posixify_path(str) {
	const parsed = path.parse(str);
	return `/${parsed.dir.slice(parsed.root.length).split(path.sep).join('/')}/${parsed.base}`;
}

/** @param {string} dest */
export function copy_assets(dest) {
	if (process.env.BUNDLED) {
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

/** @param {import('./create_app/index.js').ManifestData} manifest_data */
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

/** @param {import('types').ValidatedConfig} config */
export function get_aliases(config) {
	const alias = {
		__GENERATED__: path.posix.resolve(`${SVELTE_KIT}/generated`),
		$app: `${runtime}/app`,
		$lib: config.kit.files.lib
	};

	return alias;
}
