import fs from 'fs';
import path from 'path';

/**
 * Updates package.json with given devDependencies
 */
export function update_package_json(cwd, newDevDeps) {
	const pkg_file = path.join(cwd, 'package.json');
	const pkg_json = fs.readFileSync(pkg_file, 'utf-8');
	const pkg = JSON.parse(pkg_json);

	pkg.devDependencies = sortObj({
		...pkg.devDependencies,
		...newDevDeps
	});

	fs.writeFileSync(pkg_file, JSON.stringify(pkg, null, '\t'));
}

/**
 * Updates a Svelte component, doing all given replacements.
 */
export function update_component(cwd, filepath, replacements) {
	const file = path.join(cwd, filepath);

	let code = fs.readFileSync(file, 'utf-8');
	replacements.forEach(replacement => (code = code.replace(replacement[0], replacement[1])));

	fs.writeFileSync(file, code);
}

/**
 * Adds `svelte-preprocess` to `svelte.config.js`, if there's no preprocessor already.
 */
export function add_svelte_prepocess_to_config(cwd) {
	const file = path.join(cwd, 'svelte.config.js');
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
 * Adds plugin to snowpack config file, if not already present.
 */
export function add_snowpack_plugin_to_config(cwd, pluginname) {
	const file = path.join(cwd, 'snowpack.config.js');
	let config = fs.readFileSync(file, 'utf-8');

	if (config.includes(pluginname)) {
		return;
	}

	if (config.includes('plugins: [')) {
		config = config.replace('plugins: [', `plugins: ['${pluginname}', `);
	} else {
		config = config.replace(
			`extends: '@sveltejs/snowpack-config'`,
			`extends: '@sveltejs/snowpack-config',
	plugins: ['${pluginname}']`
		);
	}

	fs.writeFileSync(file, config);
}

function sortObj(obj) {
	return Object.keys(obj).reduce((newObj, key) => {
		newObj[key] = obj[key];
		return newObj;
	}, {});
}
