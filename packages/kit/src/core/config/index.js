/** @import { Config, KitConfig } from '@sveltejs/kit' */
/** @import { Options, SvelteConfig } from '@sveltejs/vite-plugin-svelte' */
/** @import { ValidatedConfig } from 'types' */
/** @import { ResolvedConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as url from 'node:url';
import { options, kit_options, kit_experimental_options } from './options.js';
import { resolve_entry } from '../../utils/filesystem.js';
import { import_peer } from '../../utils/import.js';

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

	if (!kit.experimental.explicitEnvironmentVariables) {
		for (const match of contents.matchAll(/%sveltekit\.env\.([^%]+)%/g)) {
			if (!match[1].startsWith(env.publicPrefix)) {
				throw new Error(
					`Environment variables in ${relative} must start with ${env.publicPrefix} (saw %sveltekit.env.${match[1]}%)`
				);
			}
		}
	}

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
 * Loads and validates Svelte config file. Tries Vite config first, falls back to svelte.config.js
 * @param {{ cwd?: string }} options
 * @returns {Promise<ValidatedConfig>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	try {
		const vite_config = await load_config_from_vite({ cwd });
		if (vite_config) {
			return vite_config;
		}
	} catch (e) {
		// TODO SvelteKit 3: fail completely instead
		console.error(
			'Loading Svelte config from Vite config failed:',
			e,
			'\n\nFalling back to loading svelte.config.js'
		);
	}

	return load_svelte_config(cwd);
}

/**
 * Loads and validates Svelte config file
 * @param {string} [cwd]
 * @returns {Promise<ValidatedConfig>}
 */
export async function load_svelte_config(cwd = process.cwd()) {
	const config_files = ['js', 'ts']
		.map((ext) => path.join(cwd, `svelte.config.${ext}`))
		.filter((f) => fs.existsSync(f));

	if (config_files.length === 0) {
		console.log(
			`No Svelte config file found in ${cwd} - using SvelteKit's default configuration without an adapter.`
		);
		return process_config({}, { cwd });
	}

	const config_file = config_files[0];
	if (config_files.length > 1) {
		console.log(
			`Found multiple Svelte config files in ${cwd}: ${config_files.map((f) => path.basename(f)).join(', ')}. Using ${path.basename(config_file)}`
		);
	}

	const config = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);
	return process_config(config.default, { cwd, source: path.relative(cwd, config_file) });
}

/**
 * Loads and validates Svelte config via Vite config resolution (if set that way).
 * @param {{ cwd?: string; mode?: string }} options
 * @returns {Promise<ValidatedConfig | undefined>}
 */
async function load_config_from_vite({ cwd = process.cwd(), mode } = {}) {
	const { resolveConfig } = await import_peer('vite');
	const current_cwd = process.cwd();

	if (cwd !== current_cwd) {
		process.chdir(cwd);
	}

	/** @type {ResolvedConfig} */
	let resolved;

	try {
		resolved = await resolveConfig({}, 'build', mode ?? process.env.MODE ?? 'production');
	} finally {
		if (cwd !== current_cwd) {
			process.chdir(current_cwd);
		}
	}

	const plugin = resolved.plugins.find(
		(plugin) => plugin.name === 'vite-plugin-sveltekit-setup' && plugin.api?.options
	);

	return plugin?.api.options;
}

/**
 * @param {Config} config
 * @returns {ValidatedConfig}
 */
export function process_config(config, { cwd = process.cwd(), source = 'svelte.config.js' } = {}) {
	try {
		const validated = validate_config(config, cwd);

		validated.kit.outDir = path.resolve(cwd, validated.kit.outDir);

		for (const key in validated.kit.files) {
			if (key === 'hooks') {
				validated.kit.files.hooks.client = path.resolve(cwd, validated.kit.files.hooks.client);
				validated.kit.files.hooks.server = path.resolve(cwd, validated.kit.files.hooks.server);
				validated.kit.files.hooks.universal = path.resolve(
					cwd,
					validated.kit.files.hooks.universal
				);
			} else {
				// @ts-expect-error
				validated.kit.files[key] = path.resolve(cwd, validated.kit.files[key]);
			}
		}

		return validated;
	} catch (e) {
		const error = /** @type {Error} */ (e);

		// redact the stack trace — it's not helpful to users
		error.stack = `Error loading ${source}: ${error.message}\n`;
		throw error;
	}
}

/**
 * @param {Config} config
 * @param {string} [cwd]
 * @returns {ValidatedConfig}
 */
export function validate_config(config, cwd = process.cwd()) {
	if (typeof config !== 'object') {
		throw new Error(
			'The Svelte config file must have a configuration object as its default export. See https://svelte.dev/docs/kit/configuration'
		);
	}

	/** @type {ValidatedConfig} */
	const validated = options(config, 'config');
	const files = validated.kit.files;

	files.hooks.client ??= path.join(files.src, 'hooks.client');
	files.hooks.server ??= path.join(files.src, 'hooks.server');
	files.hooks.universal ??= path.join(files.src, 'hooks');
	files.lib ??= path.join(files.src, 'lib');
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

	if (validated.kit.csp?.directives?.['require-trusted-types-for']?.includes('script')) {
		if (!validated.kit.csp?.directives?.['trusted-types']?.includes('svelte-trusted-html')) {
			throw new Error(
				"The `csp.directives['trusted-types']` option must include 'svelte-trusted-html'"
			);
		}
		if (
			validated.kit.serviceWorker?.register &&
			resolve_entry(path.resolve(cwd, validated.kit.files.serviceWorker)) &&
			!validated.kit.csp?.directives?.['trusted-types']?.includes('sveltekit-trusted-url')
		) {
			throw new Error(
				"The `csp.directives['trusted-types']` option must include 'sveltekit-trusted-url' when `serviceWorker.register` is true"
			);
		}
	}

	return validated;
}
