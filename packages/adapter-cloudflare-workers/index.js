import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

/** @type {import('./index.js').default} */
export default function ({ config, platformProxy = {} } = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		adapt(builder) {
			const { main, assets } = validate_config(builder, config);
			const files = fileURLToPath(new URL('./files', import.meta.url).href);

			builder.log.minor('Generating worker...');

			// Clear out old files
			builder.rimraf(assets.directory);
			builder.rimraf(main);

			// Create the entry-point for the Worker
			builder.copy(`${files}/worker.js`, `${main}/index.js`, {
				replace: {
					SERVER: `${main}/server/index.js`,
					MANIFEST: './manifest.js',
					ASSETS: assets.binding || 'ASSETS'
				}
			});
			builder.writeServer(`${main}/server`);

			// Create the manifest for the Worker
			let prerendered_entries = Array.from(builder.prerendered.pages.entries());
			if (builder.config.kit.paths.base) {
				prerendered_entries = prerendered_entries.map(([path, { file }]) => [
					path,
					{ file: `${builder.config.kit.paths.base}/${file}` }
				]);
			}
			writeFileSync(
				`${main}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './server' })};\n\n` +
					`export const prerendered = new Map(${JSON.stringify(prerendered_entries)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			builder.log.minor('Copying assets...');
			const assets_dir = `${assets.directory}${builder.config.kit.paths.base}`;
			builder.writeClient(assets_dir);
			builder.writePrerendered(assets_dir);
			writeFileSync(`${assets.directory}/.assetsignore`, generate_assetsignore(), { flag: 'a' });
		},

		emulate() {
			// we want to invoke `getPlatformProxy` only once, but await it only when it is accessed.
			// If we would await it here, it would hang indefinitely because the platform proxy only resolves once a request happens
			const get_emulated = async () => {
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
				return { platform, prerender_platform };
			};

			/** @type {{ platform: App.Platform, prerender_platform: App.Platform }} */
			let emulated;

			return {
				platform: async ({ prerender }) => {
					emulated ??= await get_emulated();
					return prerender ? emulated.prerender_platform : emulated.platform;
				}
			};
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string} config_file
 * @returns {import('wrangler').Unstable_Config}
 */
function validate_config(builder, config_file = undefined) {
	const wrangler_config = unstable_readConfig({ config: config_file });
	if (!wrangler_config.configPath) {
		builder.log.error(
			'Consult https://developers.cloudflare.com/workers/static-assets/ on how to setup your configuration'
		);
		builder.log.error(
			`
Sample wrangler.jsonc:
{
  "name": "<your-service-name>",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2025-01-01",
  "assets": {
    "binding": "ASSETS",
    "directory": ".svelte-kit/cloudflare"
  }
}
	`.trim()
		);
		throw new Error('Missing a Wrangler configuration file');
	}

	if (!wrangler_config.main) {
		throw new Error(
			`You must specify the \`main\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/static-assets/`
		);
	}

	if (!wrangler_config.assets?.directory) {
		throw new Error(
			`You must specify the \`assets.directory\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/static-assets/binding/`
		);
	}

	if (!wrangler_config.assets?.binding) {
		throw new Error(
			`You must specify the \`assets.binding\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/static-assets/binding/`
		);
	}

	return wrangler_config;
}

// this list comes from https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets
function generate_assetsignore() {
	return `
_worker.js
_headers
_redirects
`;
}
