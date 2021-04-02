import fs from 'fs';
import { join } from 'path';

/**
 * Updates package.json with given devDependencies
 *
 * @param {string} cwd
 * @param {Record<string, string>} newDevDeps
 */
export function update_package_json_dev_deps(cwd, newDevDeps) {
	update_package_json(cwd, (pkg) => {
		pkg.devDependencies = sortObj({
			...pkg.devDependencies,
			...newDevDeps
		});
		return pkg;
	});
}

/**
 * Updates a Svelte component, doing all given replacements.
 *
 * @param {string} cwd
 * @param {string} filepath
 * @param {[string, string][]} replacements
 */
export function update_component(cwd, filepath, replacements) {
	const file = join(cwd, filepath);

	let code = fs.readFileSync(file, 'utf-8');
	replacements.forEach((replacement) => (code = code.replace(replacement[0], replacement[1])));

	fs.writeFileSync(file, code);
}

/**
 * Adds `svelte-preprocess` to `svelte.config.cjs`, if there's no preprocessor already.
 *
 * @param {string} cwd
 */
export function add_svelte_preprocess_to_config(cwd) {
	const file = join(cwd, 'svelte.config.cjs');
	let config = fs.readFileSync(file, 'utf-8');

	if (config.includes('preprocess:')) {
		return;
	}

	config = `const sveltePreprocess = require('svelte-preprocess');\n${config}`;
	config = config.replace(
		'module.exports = {',
		`module.exports = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: sveltePreprocess(),`
	);

	fs.writeFileSync(file, config);
}

/**
 * Copy over a specific file from the template-additions folder.
 *
 * @param {string} cwd
 * @param  {string[] | {from: string[], to: string[]}} path
 */
export function copy_from_template_additions(cwd, path) {
	const from = Array.isArray(path) ? path : path.from;
	const to = Array.isArray(path) ? path : path.to;
	fs.copyFileSync(join(__dirname, 'template-additions', ...from), join(cwd, ...to));
}

/**
 * Update or insert package.json scripts
 *
 * @param {string} cwd
 * @param {Record<string, string>} newScripts
 */
export function upsert_package_json_scripts(cwd, newScripts) {
	update_package_json(cwd, (pkg) => {
		pkg.scripts = sortObj({
			...pkg.scripts,
			...newScripts
		});
		return pkg;
	});
}

/**
 *
 * @param {string} cwd
 * @param {(pkg: any) => any} modify
 */
function update_package_json(cwd, modify) {
	const pkg_file = join(cwd, 'package.json');
	const pkg_json = fs.readFileSync(pkg_file, 'utf-8');
	const pkg = modify(JSON.parse(pkg_json));
	fs.writeFileSync(pkg_file, JSON.stringify(pkg, null, '\t') + '\n', 'utf-8');
}

/**
 * @param {Record<string, any>} obj
 * @returns Record<string, any>
 */
function sortObj(obj) {
	return Object.keys(obj).reduce((/** @type {Record<string, any>} */ newObj, key) => {
		newObj[key] = obj[key];
		return newObj;
	}, {});
}
