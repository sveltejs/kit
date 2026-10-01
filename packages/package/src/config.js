import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { loadConfig } from '@sveltejs/load-config';

/**
 * Loads the Svelte config from `vite.config` or `svelte.config` in the current working directory
 * @returns {Promise<import('./types.js').Options['config']>}
 */
export async function load_config() {
	const result = await loadConfig(process.cwd(), { traverse: false });

	if (result && 'error' in result) throw result.error;

	return /** @type {import('./types.js').Options['config']} */ (result?.config ?? {});
}

/**
 * @param {string} cwd
 * @returns {Record<string, any>}
 */
export function load_pkg_json(cwd = process.cwd()) {
	const pkg_json_file = path.join(cwd, 'package.json');

	if (!fs.existsSync(pkg_json_file)) {
		return {};
	}

	return JSON.parse(fs.readFileSync(pkg_json_file, 'utf-8'));
}
