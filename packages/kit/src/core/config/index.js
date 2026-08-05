/** @import { Config, KitConfig } from '@sveltejs/kit' */
/** @import { Options, SvelteConfig } from '@sveltejs/vite-plugin-svelte' */
/** @import { ValidatedConfig } from 'types' */
/** @import { ResolvedConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as url from 'node:url';
import { styleText } from 'node:util';
import {
	validate_kit_options,
	kit_options,
	kit_experimental_options,
	validate_svelte_options
} from './options.js';
import { resolve_entry } from '../../utils/filesystem.js';
import { import_peer } from '../../utils/import.js';
import { stackless } from '../../utils/error.js';

/**
 * Splits the config passed to the `sveltekit` Vite plugin into the options that
 * SvelteKit processes itself and the options that are forwarded to
 * `vite-plugin-svelte`. SvelteKit makes no assumptions about which options
 * `vite-plugin-svelte` accepts — it plucks out its own options and passes
 * everything else along (`vite-plugin-svelte` does its own validation).
 * @param {KitConfig & Omit<Options, 'onwarn'> & Pick<SvelteConfig, 'vitePlugin'>} config
 * @returns {{ svelte_config: Config, vite_plugin_svelte_config: Record<string, any> }}
 */
export function split_config(config) {
	const { extensions, compilerOptions, vitePlugin, preprocess, ...rest } = config;

	/** @type {KitConfig} */
	const kit = {};

	/** @type {Record<string, any>} */
	const vite_plugin_svelte_config = {};

	for (const key in rest) {
		if (key === 'experimental') {
			// `experimental` is a namespace that both SvelteKit and vite-plugin-svelte
			// use, so pluck out the flags SvelteKit recognises and pass the rest along
			const experimental = /** @type {Record<string, any>} */ (rest[key]) ?? {};

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
				kit.experimental = kit_experimental;
			}
			if (Object.keys(vps_experimental).length > 0) {
				vite_plugin_svelte_config.experimental = vps_experimental;
			}
		} else if (kit_options.includes(key)) {
			// @ts-expect-error - we've verified this is one of SvelteKit's own options
			kit[key] = rest[key];
		} else {
			vite_plugin_svelte_config[key] = /** @type {Record<string, any>} */ (rest)[key];
		}
	}

	return {
		svelte_config: { extensions, compilerOptions, vitePlugin, preprocess, kit },
		vite_plugin_svelte_config
	};
}

/**
 * Loads the template (src/app.html by default) and validates that it has the
 * required content.
 * @param {string} cwd
 * @param {ValidatedConfig} config
 */
export function load_template(cwd, { kit }) {
	const { files } = kit;

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

	return contents;
}

/**
 * Loads the error page (src/error.html by default) if it exists.
 * Falls back to a generic error page content.
 * @param {ValidatedConfig} config
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
 * @param {string} [config]
 * @param {typeof import('vite')} [vite]
 */
export async function load_vite_config(config, vite) {
	vite ??= /** @type {import('vite')} */ (await import_peer('vite', process.cwd()));

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
		config.kit.csp?.directives?.['require-trusted-types-for']?.includes('script') &&
		config.kit.serviceWorker.register &&
		resolve_entry(path.resolve(cwd, config.kit.files.serviceWorker)) &&
		!config.kit.csp?.directives?.['trusted-types']?.includes('sveltekit-trusted-url')
	) {
		throw new Error(
			"The `csp.directives['trusted-types']` option must include 'sveltekit-trusted-url' when `serviceWorker.register` is true"
		);
	}

	config.kit.outDir = path.resolve(cwd, config.kit.outDir);
	config.kit.env.dir = path.resolve(cwd, config.kit.env.dir);

	for (const key in config.kit.files) {
		if (key === 'hooks') {
			config.kit.files.hooks.client = path.resolve(cwd, config.kit.files.hooks.client);
			config.kit.files.hooks.server = path.resolve(cwd, config.kit.files.hooks.server);
			config.kit.files.hooks.universal = path.resolve(cwd, config.kit.files.hooks.universal);
		} else if (key !== 'lib' /* TODO remove when we remove the `lib` option altogether */) {
			// @ts-expect-error
			config.kit.files[key] = path.resolve(cwd, config.kit.files[key]);
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
			throw new Error(
				'The SvelteKit options from the Vite config must be an object. See https://svelte.dev/docs/kit/configuration'
			);
		}

		const validated = /** @type {ValidatedConfig} */ ({
			...validate_svelte_options(config, 'config'),
			kit: validate_kit_options(config.kit, 'config')
		});
		const files = validated.kit.files;

		files.hooks.client ??= path.join(files.src, 'hooks.client');
		files.hooks.server ??= path.join(files.src, 'hooks.server');
		files.hooks.universal ??= path.join(files.src, 'hooks');
		files.params ??= path.join(files.src, 'params');
		files.routes ??= path.join(files.src, 'routes');
		files.serviceWorker ??= path.join(files.src, 'service-worker');
		files.appTemplate ??= path.join(files.src, 'app.html');
		files.errorTemplate ??= path.join(files.src, 'error.html');

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

		if (
			validated.kit.csp?.directives?.['require-trusted-types-for']?.includes('script') &&
			!validated.kit.csp?.directives?.['trusted-types']?.includes('svelte-trusted-html')
		) {
			throw new Error(
				"The `csp.directives['trusted-types']` option must include 'svelte-trusted-html'"
			);
		}

		return validated;
	} catch (e) {
		const error = /** @type {Error} */ (e);

		// Print a nicer version of the error to the console
		console.log(styleText(['bold', 'red'], `\n${error.message}\n`));

		throw stackless('Failed to load SvelteKit options from Vite config');
	}
}
