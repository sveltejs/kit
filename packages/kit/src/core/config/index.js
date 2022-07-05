import fs from 'fs';
import path from 'path';
import * as url from 'url';
import options from './options.js';

/**
 * Loads the template (src/app.html by default) and validates that it has the
 * required content.
 * @param {string} cwd
 * @param {import('types').ValidatedConfig} config
 */
export function load_template(cwd, config) {
	const { template } = config.kit.files;
	const relative = path.relative(cwd, template);

	if (fs.existsSync(template)) {
		const contents = fs.readFileSync(template, 'utf8');

		// TODO remove this for 1.0
		const match = /%svelte\.([a-z]+)%/.exec(contents);
		if (match) {
			throw new Error(
				`%svelte.${match[1]}% in ${relative} should be replaced with %sveltekit.${match[1]}%`
			);
		}

		const expected_tags = ['%sveltekit.head%', '%sveltekit.body%'];
		expected_tags.forEach((tag) => {
			if (contents.indexOf(tag) === -1) {
				throw new Error(`${relative} is missing ${tag}`);
			}
		});
	} else {
		throw new Error(`${relative} does not exist`);
	}

	return fs.readFileSync(template, 'utf-8');
}

/**
 * Loads and validates svelte.config.js
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('types').ValidatedConfig>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = path.join(cwd, 'svelte.config.js');

	if (!fs.existsSync(config_file)) {
		return process_config({}, { cwd });
	}

	const config = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);

	return process_config(config.default, { cwd });
}

/**
 * @param {import('types').Config} config
 * @returns {import('types').ValidatedConfig}
 */
function process_config(config, { cwd = process.cwd() } = {}) {
	const validated = validate_config(config);

	validated.kit.outDir = path.resolve(cwd, validated.kit.outDir);

	for (const key in validated.kit.files) {
		// @ts-expect-error this is typescript at its stupidest
		validated.kit.files[key] = path.resolve(cwd, validated.kit.files[key]);
	}

	return validated;
}

/**
 * @param {import('types').Config} config
 * @returns {import('types').ValidatedConfig}
 */
export function validate_config(config) {
	if (typeof config !== 'object') {
		throw new Error(
			'svelte.config.js must have a configuration object as its default export. See https://kit.svelte.dev/docs/configuration'
		);
	}

	return options(config, 'config');
}
