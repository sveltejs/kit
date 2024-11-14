import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import url from 'node:url';

/**
 * Loads and validates svelte.config.js
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('./types.js').Options['config']>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = path.join(cwd, 'svelte.config.js');

	if (!fs.existsSync(config_file)) {
		return {};
	}

	const module = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);
	const config = module.default;

	if (config.package) {
		throw new Error(
			'config.package is no longer supported. See https://github.com/sveltejs/kit/discussions/8825 for more information.'
		);
	}

	return config;
}

/**
 * @param {string} cwd
 * @returns Record<string, any>
 */
export function load_pkg_json(cwd = process.cwd()) {
	const pkg_json_file = path.join(cwd, 'package.json');

	if (!fs.existsSync(pkg_json_file)) {
		return {};
	}

	return JSON.parse(fs.readFileSync(pkg_json_file, 'utf-8'));
}
