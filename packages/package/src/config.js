import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import url from 'node:url';

/**
 * Loads and validates Svelte config
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('./types.js').Options['config']>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	try {
		const config = await load_config_from_vite(cwd);
		if (config) return config;
	} catch {
		// Vite is optional, and non-Kit projects may have an unrelated Vite config
	}

	return load_svelte_config(cwd);
}

/**
 * Loads Svelte config from the SvelteKit Vite plugin
 * @param {string} cwd
 */
async function load_config_from_vite(cwd) {
	const current_cwd = process.cwd();

	try {
		if (cwd !== current_cwd) process.chdir(cwd);

		const { resolveConfig } = /** @type {typeof import('vite')} */ (await import_peer('vite', cwd));
		const vite_config = await resolveConfig(
			{},
			'build',
			process.env.MODE ?? 'production',
			'production'
		);
		const plugin = vite_config.plugins.find(
			(plugin) => plugin.name === 'vite-plugin-sveltekit-setup' && plugin.api?.options
		);

		return plugin?.api.options;
	} finally {
		if (cwd !== current_cwd) process.chdir(current_cwd);
	}
}

/**
 * Loads Svelte config from svelte.config.js or svelte.config.ts
 * @param {string} cwd
 * @returns {Promise<import('./types.js').Options['config']>}
 */
async function load_svelte_config(cwd) {
	const config_files = ['js', 'ts']
		.map((ext) => path.join(cwd, `svelte.config.${ext}`))
		.filter((f) => fs.existsSync(f));

	if (config_files.length === 0) {
		return {};
	}
	const config_file = config_files[0];
	if (config_files.length > 1) {
		console.log(
			`Found multiple Svelte config files in ${cwd}: ${config_files.map((f) => path.basename(f)).join(', ')}. Using ${path.basename(config_file)}`
		);
	}
	const config = (await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`)).default;

	if (config.package) {
		throw new Error(
			'config.package is no longer supported. See https://github.com/sveltejs/kit/discussions/8825 for more information.'
		);
	}

	return config;
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

/**
 * Resolve a dependency relative to the project
 * @param {string} dependency
 * @param {string} root
 */
async function import_peer(dependency, root) {
	try {
		return await import(/* @vite-ignore */ url.pathToFileURL(resolve_peer(dependency, root)).href);
	} catch {
		return await import(/* @vite-ignore */ dependency);
	}
}

/**
 * @param {string} dependency
 * @param {string} root
 */
function resolve_peer(dependency, root) {
	let [name, ...parts] = dependency.split('/');
	if (name[0] === '@') name += `/${parts.shift()}`;

	let dir = root;
	while (!fs.existsSync(`${dir}/node_modules/${name}/package.json`)) {
		if (dir === (dir = path.dirname(dir))) {
			throw new Error(
				`Could not resolve peer dependency "${name}" relative to your project — please install it and try again.`
			);
		}
	}

	const pkg_dir = `${dir}/node_modules/${name}`;
	const pkg = JSON.parse(fs.readFileSync(`${pkg_dir}/package.json`, 'utf-8'));
	const subpackage = ['.', ...parts].join('/');
	let exported = pkg.exports[subpackage];

	while (typeof exported !== 'string') {
		if (!exported) {
			throw new Error(`Could not find valid "${subpackage}" export in ${name}/package.json`);
		}
		exported = exported.import ?? exported.default;
	}

	return path.resolve(pkg_dir, exported);
}
