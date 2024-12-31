import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { posix, dirname } from 'node:path';
import toml from '@iarna/toml';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';

/**
 * @typedef {{
 *   main: string;
 *   assets: {
 *     directory: string;
 *     binding: string;
 *   }
 * }} WranglerConfig
 */

/** @type {import('./index.js').default} */
export default function ({ config = 'wrangler.toml', platformProxy = {} } = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		adapt(builder) {
			const { main, assets } = validate_config(builder, config);
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const outDir = dirname(main);
			const relativePath = posix.relative(outDir, builder.getServerDirectory());

			builder.log.minor('Generating worker...');

			// Clear out old files
			builder.rimraf(assets.directory);
			builder.rimraf(outDir);

			// Create the entry-point for the Worker
			builder.copy(`${files}/entry.js`, main, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js',
					ASSETS: assets.binding || 'ASSETS'
				}
			});

			// Create the manifest for the Worker
			let prerendered_entries = Array.from(builder.prerendered.pages.entries());
			if (builder.config.kit.paths.base) {
				prerendered_entries = prerendered_entries.map(([path, { file }]) => [
					path,
					{ file: `${builder.config.kit.paths.base}/${file}` }
				]);
			}
			writeFileSync(
				`${outDir}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n\n` +
					`export const prerendered = new Map(${JSON.stringify(prerendered_entries)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			builder.log.minor('Copying assets...');
			const assets_dir = `${assets.directory}${builder.config.kit.paths.base}`;
			builder.writeClient(assets_dir);
			builder.writePrerendered(assets_dir);
		},

		async emulate() {
			const proxy = await getPlatformProxy(platformProxy);
			const platform = /** @type {App.Platform} */ ({
				env: proxy.env,
				context: proxy.ctx,
				caches: proxy.caches,
				cf: proxy.cf
			});

			/** @type {Record<string, any>} */
			const env = {};
			const prerender_platform = /** @type {App.Platform} */ (/** @type {unknown} */ ({ env }));

			for (const key in proxy.env) {
				Object.defineProperty(env, key, {
					get: () => {
						throw new Error(`Cannot access platform.env.${key} in a prerenderable route`);
					}
				});
			}

			return {
				platform: ({ prerender }) => {
					return prerender ? prerender_platform : platform;
				}
			};
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string} config_file
 * @returns {WranglerConfig}
 */
function validate_config(builder, config_file) {
	if (!existsSync(config_file) && config_file === 'wrangler.toml' && existsSync('wrangler.json')) {
		builder.log.minor('Default wrangler.toml does not exist. Using wrangler.json.');
		config_file = 'wrangler.json';
	}
	if (existsSync(config_file)) {
		/** @type {WranglerConfig} */
		let wrangler_config;

		try {
			if (config_file.endsWith('.json')) {
				wrangler_config = /** @type {WranglerConfig} */ (
					JSON.parse(readFileSync(config_file, 'utf-8'))
				);
			} else {
				wrangler_config = /** @type {WranglerConfig} */ (
					toml.parse(readFileSync(config_file, 'utf-8'))
				);
			}
		} catch (err) {
			err.message = `Error parsing ${config_file}: ${err.message}`;
			throw err;
		}

		if (!wrangler_config.assets?.directory) {
			throw new Error(
				`You must specify assets.directory in ${config_file}. Consult https://developers.cloudflare.com/workers/platform/sites/configuration`
			);
		}

		if (!wrangler_config.main) {
			throw new Error(
				`You must specify main option in ${config_file}. Consult https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare-workers`
			);
		}

		return wrangler_config;
	}

	builder.log.error(
		'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
	);

	builder.log(
		`
		Sample wrangler.toml:

		name = "<your-site-name>"
		account_id = "<your-account-id>"
		main = ".svelte-kit/cloudflare/server/index.js"
		assets = { directory = ".svelte-kit/cloudflare/client" }
		build.command = "npm run build"
		compatibility_date = "2021-11-12"`
			.replace(/^\t+/gm, '')
			.trim()
	);

	throw new Error(`Missing a ${config_file} file`);
}
