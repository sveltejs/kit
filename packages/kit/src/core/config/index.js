/** @import { Config } from '@sveltejs/kit/vite' */
/** @import { ValidatedConfig } from 'types' */
/** @import { ResolvedConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';
import { validate_options, kit_options, kit_experimental_options } from './options.js';
import { resolve_entry } from '../../utils/filesystem.js';
import { import_peer } from '../../utils/import.js';
import { stackless } from '../../utils/error.js';
import * as e from '../../messages/build-errors.js';

/**
 * Splits the config passed to the `sveltekit` Vite plugin into the options that
 * SvelteKit processes itself and the options that are forwarded to
 * `vite-plugin-svelte`. SvelteKit makes no assumptions about which options
 * `vite-plugin-svelte` accepts — it plucks out its own options and passes
 * everything else along (`vite-plugin-svelte` does its own validation).
 * @param {Config} config
 * @returns {{ svelte_config: Config, vite_plugin_svelte_config: Record<string, any> }}
 */
export function split_config(config) {
	/** @type {Config} */
	const svelte_config = {};

	/** @type {Record<string, any>} */
	const vite_plugin_svelte_config = {};

	for (const key in config) {
		if (key === 'experimental') {
			// `experimental` is a namespace that both SvelteKit and vite-plugin-svelte
			// use, so pluck out the flags SvelteKit recognises and pass the rest along
			const experimental = /** @type {Record<string, any>} */ (config[key]) ?? {};

			/** @type {Record<string, any>} */
			const kit_experimental = {};
			/** @type {Record<string, any>} */
			const vps_experimental = {};

			for (const flag in experimental) {
				if (kit_experimental_options.includes(flag)) {
					kit_experimental[flag] = experimental[flag];
				} else {
					vps_experimental[flag] = experimental[flag];
				}
			}

			if (Object.keys(kit_experimental).length > 0) {
				svelte_config.experimental = kit_experimental;
			}
			if (Object.keys(vps_experimental).length > 0) {
				vite_plugin_svelte_config.experimental = vps_experimental;
			}
		} else if (kit_options.includes(key)) {
			// @ts-expect-error - we've verified this is one of SvelteKit's own options
			svelte_config[key] = config[key];
		} else {
			vite_plugin_svelte_config[key] = /** @type {Record<string, any>} */ (config)[key];
		}
	}

	return {
		svelte_config,
		vite_plugin_svelte_config
	};
}

/**
 * Loads the template (src/app.html by default) and validates that it has the
 * required content.
 * @param {string} cwd
 * @param {ValidatedConfig} config
 */
export function load_template(cwd, config) {
	const { files } = config;

	const relative = path.relative(cwd, files.appTemplate);

	if (!fs.existsSync(files.appTemplate)) {
		e.app_template_missing({ file: relative });
	}

	const contents = fs.readFileSync(files.appTemplate, 'utf8');

	const expected_tags = ['%sveltekit.head%', '%sveltekit.body%'];
	expected_tags.forEach((tag) => {
		if (contents.indexOf(tag) === -1) {
			e.app_template_tag_missing({ file: relative, tag });
		}
	});

	return contents;
}

/**
 * Loads the error page (src/error.html by default) if it exists.
 * Falls back to a generic error page content.
 * @param {ValidatedConfig} config
 */
export function load_error_page(config) {
	let { errorTemplate } = config.files;

	// Don't do this inside resolving the config, because that would mean
	// adding/removing error.html isn't detected and would require a restart.
	if (!fs.existsSync(config.files.errorTemplate)) {
		errorTemplate = path.join(import.meta.dirname, 'default-error.html');
	}

	return fs.readFileSync(errorTemplate, 'utf-8');
}

/**
 * @param {string} [config]
 * @param {typeof import('vite')} [vite]
 */
export async function load_vite_config(config, vite) {
	vite ??= /** @type {typeof import('vite')} */ (await import_peer('vite', process.cwd()));

	return vite.resolveConfig({ configFile: config }, 'build', process.env.MODE ?? 'production');
}

/**
 * @param {ResolvedConfig} vite_config
 * @returns {ValidatedConfig}
 */
export function extract_svelte_config(vite_config) {
	const plugin = vite_config.plugins.find((p) => p.name === 'vite-plugin-sveltekit-setup');
	return plugin?.api.options ?? process_config(validate_config({}), vite_config.root);
}

/**
 * @param {ValidatedConfig} config
 * @param {string} cwd
 * @returns {ValidatedConfig}
 */
export function process_config(config, cwd) {
	if (
		config.csp?.directives?.['require-trusted-types-for']?.includes('script') &&
		config.serviceWorker.register &&
		resolve_entry(path.resolve(cwd, config.files.serviceWorker), config.moduleExtensions) &&
		!config.csp?.directives?.['trusted-types']?.includes('sveltekit-trusted-url')
	) {
		e.config_csp_trusted_types_missing();
	}

	config.outDir = path.resolve(cwd, config.outDir);
	config.env.dir = path.resolve(cwd, config.env.dir);

	for (const key in config.files) {
		if (key === 'hooks') {
			config.files.hooks.client = path.resolve(cwd, config.files.hooks.client);
			config.files.hooks.server = path.resolve(cwd, config.files.hooks.server);
			config.files.hooks.universal = path.resolve(cwd, config.files.hooks.universal);
		} else if (key !== 'lib' /* TODO remove when we remove the `lib` option altogether */) {
			// @ts-expect-error
			config.files[key] = path.resolve(cwd, config.files[key]);
		}
	}

	return config;
}

/**
 * @param {Config} config
 * @returns {ValidatedConfig}
 */
export function validate_config(config) {
	try {
		if (typeof config !== 'object') {
			e.config_not_object();
		}

		const validated = validate_options(config, 'config');
		const files = validated.files;

		files.hooks.client ??= path.join(files.src, 'hooks.client');
		files.hooks.server ??= path.join(files.src, 'hooks.server');
		files.hooks.universal ??= path.join(files.src, 'hooks');
		files.params ??= path.join(files.src, 'params');
		files.routes ??= path.join(files.src, 'routes');
		files.serviceWorker ??= path.join(files.src, 'service-worker');
		files.appTemplate ??= path.join(files.src, 'app.html');
		files.errorTemplate ??= path.join(files.src, 'error.html');

		if (validated.router.resolution === 'server') {
			if (validated.router.type === 'hash') {
				e.config_server_resolution_hash();
			}
			if (validated.output.bundleStrategy !== 'split') {
				e.config_server_resolution_bundle_strategy();
			}
		}

		if (typeof config.adapter?.vite === 'function') {
			validated.adapter.vite = config.adapter.vite({
				config: validated
			});
		}

		return validated;
	} catch (e) {
		const error = /** @type {Error} */ (e);

		// Print a nicer version of the error to the console
		console.log(styleText(['bold', 'red'], `\n${error.message}\n`));

		throw stackless('Failed to load SvelteKit options from Vite config');
	}
}
