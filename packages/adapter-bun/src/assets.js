import { join } from 'node:path';
import { dir } from './dir.js';

const embedded_files = /** @type {Map<string, EmbeddedAsset> | undefined} */ (
	/** @type {any} */ (globalThis)[Symbol.for('sveltekit.adapter-bun.assets')]
);

/**
 * @typedef {object} EmbeddedAsset
 * @property {string} path
 * @property {number} size
 * @property {string} type
 * @property {string} lastModified
 * @property {string} etag
 */

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @returns {string}
 */
export function asset_path(directory, relative) {
	return embedded_asset(directory, relative)?.path ?? join(dir, directory, relative);
}

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @returns {EmbeddedAsset | undefined}
 */
export function embedded_asset(directory, relative) {
	return embedded_files?.get(`${directory}/${relative}`);
}
