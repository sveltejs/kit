import { writeFileSync } from 'node:fs';
import { posix, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

/** @type {import('./index.js').default} */
export default function ({ config, platformProxy = {} } = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		adapt(builder) {
			const { main, assets } = validate_config(builder, config);
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const out_dir = dirname(main);
			const relative_path = posix.relative(out_dir, builder.getServerDirectory());

			builder.log.minor('Generating worker...');

			// Clear out old files
			builder.rimraf(assets.directory);
			builder.rimraf(out_dir);

			// Create the entry-point for the Worker
			builder.copy(`${files}/entry.js`, main, {
				replace: {
					SERVER: `${relative_path}/index.js`,
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
				`${out_dir}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: relative_path })};\n\n` +
					`export const prerendered = new Map(${JSON.stringify(prerendered_entries)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			builder.log.minor('Copying assets...');
			const assets_dir = `${assets.directory}${builder.config.kit.paths.base}`;
			builder.writeClient(assets_dir);
			builder.writePrerendered(assets_dir);
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
			'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
		);
		builder.log(
			`
Sample wrangler.jsonc:
{
	"name": "<your-service-name>",
	"account_id": "<your-account-id>",
	"main": "./.cloudflare/worker.js",
	"site": {
		"bucket": "./.cloudflare/public"
	},
	"build": {
		"command": "npm run build"
	},
	"compatibility_date": "2021-11-12"
}
	`.trim()
		);
		throw new Error('Missing a Wrangler configuration file');
	}

	if (!wrangler_config.site?.bucket) {
		throw new Error(
			`You must specify the \`site.bucket\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/platform/sites/configuration`
		);
	}

	if (!wrangler_config.main) {
		throw new Error(
			`You must specify the \`main\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/platform/sites/configuration`
		);
	}

	return wrangler_config;
}
