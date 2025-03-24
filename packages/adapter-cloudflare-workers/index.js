import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

/** @type {import('./index.js').default} */
export default function ({ config, platformProxy = {} } = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		adapt(builder) {
			if (existsSync(`${builder.config.kit.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.kit.files.assets} directory`
				);
			}

			if (existsSync(`${builder.config.kit.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.kit.files.assets} directory`
				);
			}

			const { main, assets } = validate_config(builder, config);
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			// Clear out old files
			builder.rimraf(assets.directory);
			builder.rimraf(main);

			builder.mkdirp(tmp);

			builder.log.minor('Generating worker...');

			// Create the entry-point for the Worker
			const relative_path = path.posix.relative(main, builder.getServerDirectory());
			builder.copy(`${files}/worker.js`, main, {
				replace: {
					SERVER: `${relative_path}/index.js`,
					MANIFEST: `${path.posix.relative(main, tmp)}/manifest.js`,
					ASSETS: assets.binding || 'ASSETS'
				}
			});

			// Create the manifest for the Worker
			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: relative_path })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			// client assets and prerendered pages
			builder.log.minor('Copying assets...');
			const assets_dir = `${assets.directory}${builder.config.kit.paths.base}`;
			builder.writeClient(assets_dir);
			builder.writePrerendered(assets_dir);

			// _headers
			const headers_file = `${assets.directory}/_headers`;
			if (existsSync('_headers')) {
				copyFileSync('_headers', headers_file);
			}
			writeFileSync(headers_file, generate_headers(builder.getAppPath()), {
				flag: 'a'
			});

			// _redirects
			const redirects_file = `${assets.directory}/_redirects`;
			if (existsSync('_redirects')) {
				copyFileSync('_redirects', redirects_file);
			}
			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(redirects_file, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

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

	if (wrangler_config.site) {
		throw new Error(
			`You must remove all \`site\` keys in ${wrangler_config.configPath}. Consult https://svelte.dev/docs/kit/adapter-cloudflare-workers#Migrating-from-Workers-Sites-to-Workers-Static-Assets`
		);
	}

	if (!wrangler_config.assets?.directory) {
		throw new Error(
			`You must specify the \`assets.directory\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/static-assets/binding/#directory`
		);
	}

	if (!wrangler_config.assets?.binding) {
		throw new Error(
			`You must specify the \`assets.binding\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/static-assets/binding/#binding`
		);
	}

	return wrangler_config;
}

/** @param {string} app_dir */
function generate_headers(app_dir) {
	return `
# === START AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
/${app_dir}/*
	X-Robots-Tag: noindex
	Cache-Control: no-cache
/${app_dir}/immutable/*
  ! Cache-Control
	Cache-Control: public, immutable, max-age=31536000
# === END AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
`.trimEnd();
}

/** @param {Map<string, { status: number; location: string }>} redirects */
function generate_redirects(redirects) {
	const rules = Array.from(
		redirects.entries(),
		([path, redirect]) => `${path} ${redirect.location} ${redirect.status}`
	).join('\n');

	return `
# === START AUTOGENERATED SVELTE PRERENDERED REDIRECTS ===
${rules}
# === END AUTOGENERATED SVELTE PRERENDERED REDIRECTS ===
`.trimEnd();
}

// this list comes from https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets
function generate_assetsignore() {
	return `
_worker.js
_headers
_redirects
`;
}
