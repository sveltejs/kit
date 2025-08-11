import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as url from 'node:url';
import options from './options.js';

/**
 * Loads the template (src/app.html by default) and validates that it has the
 * required content.
 * @param {string} cwd
 * @param {import('types').ValidatedConfig} config
 */
export function load_template(cwd, { kit }) {
	const { env, files } = kit;

	const relative = path.relative(cwd, files.appTemplate);

	if (!fs.existsSync(files.appTemplate)) {
		throw new Error(`${relative} does not exist`);
	}

	const contents = fs.readFileSync(files.appTemplate, 'utf8');

	const expected_tags = ['%sveltekit.head%', '%sveltekit.body%'];
	expected_tags.forEach((tag) => {
		if (contents.indexOf(tag) === -1) {
			throw new Error(`${relative} is missing ${tag}`);
		}
	});

	for (const match of contents.matchAll(/%sveltekit\.env\.([^%]+)%/g)) {
		if (!match[1].startsWith(env.publicPrefix)) {
			throw new Error(
				`Environment variables in ${relative} must start with ${env.publicPrefix} (saw %sveltekit.env.${match[1]}%)`
			);
		}
	}

	return contents;
}

/**
 * Loads the error page (src/error.html by default) if it exists.
 * Falls back to a generic error page content.
 * @param {import('types').ValidatedConfig} config
 */
export function load_error_page(config) {
	let { errorTemplate } = config.kit.files;

	// Don't do this inside resolving the config, because that would mean
	// adding/removing error.html isn't detected and would require a restart.
	if (!fs.existsSync(config.kit.files.errorTemplate)) {
		errorTemplate = url.fileURLToPath(new URL('./default-error.html', import.meta.url));
	}

	return fs.readFileSync(errorTemplate, 'utf-8');
}

/**
 * Loads and validates Svelte config file
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('types').ValidatedConfig>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	const config_files = ['js', 'ts']
		.map((ext) => path.join(cwd, `svelte.config.${ext}`))
		.filter((f) => fs.existsSync(f));

	if (config_files.length === 0) {
		console.log(
			`No Svelte config file found in ${cwd} - using SvelteKit's default configuration without an adapter.`
		);
		return await process_config(async () => ({}), { cwd });
	}
	const config_file = config_files[0];
	if (config_files.length > 1) {
		console.log(
			`Found multiple Svelte config files in ${cwd}: ${config_files.map((f) => path.basename(f)).join(', ')}. Using ${path.basename(config_file)}`
		);
	}

	const get_config = async () => {
		/** @type {{ default: import('@sveltejs/kit').Config }} */
		const config = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);
		return config.default;
	};

	try {
		return await process_config(get_config, { cwd });
	} catch (e) {
		const error = /** @type {Error} */ (e);

		// redact the stack trace — it's not helpful to users
		error.stack = `Could not load ${config_file}: ${error.message}\n`;
		throw error;
	}
}

/**
 * @param {() => Promise<import('@sveltejs/kit').Config>} get_config
 * @returns {Promise<import('types').ValidatedConfig>}
 */
async function process_config(get_config, { cwd = process.cwd() } = {}) {
	const validated = await validate_config(get_config);

	validated.kit.outDir = path.resolve(cwd, validated.kit.outDir);

	for (const key in validated.kit.files) {
		if (key === 'hooks') {
			validated.kit.files.hooks.client = path.resolve(cwd, validated.kit.files.hooks.client);
			validated.kit.files.hooks.server = path.resolve(cwd, validated.kit.files.hooks.server);
			validated.kit.files.hooks.universal = path.resolve(cwd, validated.kit.files.hooks.universal);
		} else {
			// @ts-expect-error
			validated.kit.files[key] = path.resolve(cwd, validated.kit.files[key]);
		}
	}

	return validated;
}

/**
 * @param {() => Promise<import('@sveltejs/kit').Config>} get_config
 * @returns {Promise<import('types').ValidatedConfig>}
 */
export async function validate_config(get_config) {
	const config = await get_config();

	if (typeof config !== 'object') {
		throw new Error(
			'The Svelte config file must have a configuration object as its default export. See https://svelte.dev/docs/kit/configuration'
		);
	}

	if (config.kit?.version?.name) {
		const same_config = await get_config();
		if (config.kit.version.name !== same_config.kit?.version?.name) {
			throw new Error(
				'The `version.name` option must be deterministic (e.g. a commit ref rather than` Math.random()` or `Date.now().toString()`). See https://svelte.dev/docs/kit/configuration#version'
			);
		}
	}

	const validated = options(config, 'config');

	if (validated.kit.router.resolution === 'server') {
		if (validated.kit.router.type === 'hash') {
			throw new Error(
				"The `router.resolution` option cannot be 'server' if `router.type` is 'hash'"
			);
		}
		if (validated.kit.output.bundleStrategy !== 'split') {
			throw new Error(
				"The `router.resolution` option cannot be 'server' if `output.bundleStrategy` is 'inline' or 'single'"
			);
		}
	}

	return validated;
}
