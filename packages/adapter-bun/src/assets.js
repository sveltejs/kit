import { join } from 'node:path';
import { dir } from './dir.js';

const embedded_files = /** @type {Map<string, string> | undefined} */ (
	/** @type {any} */ (globalThis)[Symbol.for('sveltekit.adapter-bun.assets')]
);

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @returns {string}
 */
export function asset_path(directory, relative) {
	return embedded_asset(directory, relative) ?? join(dir, directory, relative);
}

/**
 * @param {'client' | 'prerendered'} directory
 * @param {string} relative
 * @returns {string | undefined}
 */
export function embedded_asset(directory, relative) {
	return embedded_files?.get(`${directory}/${relative}`);
}
