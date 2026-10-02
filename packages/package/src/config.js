import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';

/**
 * Loads and validates the SvelteKit config
 * @returns {Promise<import('./types.js').Options['config']>}
 */
export async function load_config() {
	const { resolveConfig } = /** @type {import('vite')} */ (
		await import_peer('vite', process.cwd())
	);

	const vite_config = await resolveConfig({}, 'build', 'production');

	const plugin = vite_config.plugins.find((p) => p.name === 'vite-plugin-sveltekit-setup');
	return plugin?.api.options ?? {};
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
 * Resolve a dependency relative to the current working directory,
 * rather than relative to this package (but falls back to trying that, if necessary)
 * @param {string} dependency
 * @param {string} root
 */
async function import_peer(dependency, root) {
	try {
		return await import(/* @vite-ignore */ resolve_peer(dependency, root));
	} catch {
		return await import(/* @vite-ignore */ dependency);
	}
}

/**
 * Resolves a peer dependency relative to the current working directory. Duplicated with `packages/adapter-auto`
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

		exported = exported['import'] ?? exported['default'];
	}

	return path.resolve(pkg_dir, exported);
}
