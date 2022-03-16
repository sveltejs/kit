import fs from 'fs';
import path from 'path';
import * as url from 'url';
import { logger } from '../utils.js';
import options from './options.js';

/**
 * @param {string} cwd
 * @param {import('types').ValidatedConfig} config
 */
export function load_template(cwd, config) {
	const { template } = config.kit.files;
	const relative = path.relative(cwd, template);

	if (fs.existsSync(template)) {
		const contents = fs.readFileSync(template, 'utf8');
		const expected_tags = ['%svelte.head%', '%svelte.body%'];
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

export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = path.join(cwd, 'svelte.config.js');

	if (!fs.existsSync(config_file)) {
		throw new Error(
			'You need to create a svelte.config.js file. See https://kit.svelte.dev/docs/configuration'
		);
	}

	const config = await import(url.pathToFileURL(config_file).href);

	const validated = validate_config(config.default);

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

/**
 * @param {string[]} conflicts - array of conflicts in dotted notation
 * @param {string=} pathPrefix - prepended in front of the path
 * @param {string=} scope - used to prefix the whole error message
 */
export function print_config_conflicts(conflicts, pathPrefix = '', scope) {
	const prefix = scope ? scope + ': ' : '';
	const log = logger({ verbose: false });
	conflicts.forEach((conflict) => {
		log.error(
			`${prefix}The value for ${pathPrefix}${conflict} specified in svelte.config.js has been ignored. This option is controlled by SvelteKit.`
		);
	});
}
