import fs from 'node:fs';
import path from 'node:path';
import * as url from 'node:url';
import options from './options.js';
import { transpileModule } from 'typescript';

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
 * Loads and validates svelte.config.js or svelte.config.ts
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('types').ValidatedConfig>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	const js_config_file = path.join(cwd, 'svelte.config.js');
	const ts_config_file = path.join(cwd, 'svelte.config.ts');

	if (fs.existsSync(js_config_file)) {
		const config = await import(`${url.pathToFileURL(js_config_file).href}?ts=${Date.now()}`);
		return process_config(config.default, { cwd });
	}

	if (fs.existsSync(ts_config_file)) {
		const config = await load_ts_config(ts_config_file);
		return process_config(config.default, { cwd });
	}

	return process_config({}, { cwd });
}

/**
 * Loads and transpiles the TypeScript configuration file
 * @param {string} ts_config_file
 * @returns {Promise<import('@sveltejs/kit').Config>}
 */
async function load_ts_config(ts_config_file) {
	try {
		const ts_code = fs.readFileSync(ts_config_file, 'utf-8');
		const js_code = transpileModule(ts_code, {
			compilerOptions: { module: 99, target: 99 }
		}).outputText;

		const config = await import(
			`data:text/javascript;base64,${Buffer.from(js_code).toString('base64')}`
		);
		return config;
	} catch (e) {
		const error = /** @type {Error} */ (e);

		// redact the stack trace — it's not helpful to users
		error.stack = `Could not load svelte.config.ts: ${error.message}\n`;
		throw error;
	}
}

/**
 * @param {import('@sveltejs/kit').Config} config
 * @returns {import('types').ValidatedConfig}
 */
function process_config(config, { cwd = process.cwd() } = {}) {
	const validated = validate_config(config);

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
 * @param {import('@sveltejs/kit').Config} config
 * @returns {import('types').ValidatedConfig}
 */
export function validate_config(config) {
	if (typeof config !== 'object') {
		throw new Error(
			'svelte.config.js or svelte.config.ts must have a configuration object as its default export. See https://kit.svelte.dev/docs/configuration'
		);
	}

	return options(config, 'config');
}
