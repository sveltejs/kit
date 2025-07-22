import { VERSION } from '@sveltejs/kit';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { is_building_for_cloudflare_pages, get_routes_json, parse_redirects } from './utils.js';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

const name = '@sveltejs/adapter-cloudflare';
const [kit_major, kit_minor] = VERSION.split('.');

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name,
		async adapt(builder) {
			if (
				existsSync('_routes.json') ||
				existsSync(`${builder.config.kit.files.assets}/_routes.json`)
			) {
				throw new Error(
					"Cloudflare Pages' _routes.json should be configured in svelte.config.js. See https://svelte.dev/docs/kit/adapter-cloudflare#Options-routes"
				);
			}

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

			const wrangler_config = validate_config(options.config);
			const building_for_cloudflare_pages = is_building_for_cloudflare_pages(wrangler_config);

			let dest = builder.getBuildDirectory('cloudflare');
			let worker_dest = `${dest}/_worker.js`;
			let assets_binding = 'ASSETS';

			if (building_for_cloudflare_pages) {
				if (wrangler_config.pages_build_output_dir) {
					dest = wrangler_config.pages_build_output_dir;
					worker_dest = `${dest}/_worker.js`;
				}
			} else {
				if (wrangler_config.main) {
					worker_dest = wrangler_config.main;
				}
				if (wrangler_config.assets?.directory) {
					dest = wrangler_config.assets.directory;
				}
				if (wrangler_config.assets?.binding) {
					assets_binding = wrangler_config.assets.binding;
				}
			}

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(worker_dest);

			builder.mkdirp(dest);
			builder.mkdirp(tmp);

			// client assets and prerendered pages
			const assets_dest = `${dest}${builder.config.kit.paths.base}`;
			builder.mkdirp(assets_dest);
			if (
				building_for_cloudflare_pages ||
				wrangler_config.assets?.not_found_handling === '404-page'
			) {
				// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page.
				// This file is served when a request fails to match an asset.
				// If we're building for Cloudflare Pages, it's only served when a request matches an entry in `routes.exclude`
				const fallback = path.join(assets_dest, '404.html');
				if (options.fallback === 'spa') {
					await builder.generateFallback(fallback);
				} else {
					writeFileSync(fallback, 'Not Found');
				}
			}
			const client_assets = builder.writeClient(assets_dest);
			builder.writePrerendered(assets_dest);
			if (
				!building_for_cloudflare_pages &&
				wrangler_config.assets?.not_found_handling === 'single-page-application'
			) {
				await builder.generateFallback(path.join(assets_dest, 'index.html'));
			}

			// worker
			const worker_dest_dir = path.dirname(worker_dest);
			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: path.posix.relative(tmp, builder.getServerDirectory()) })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);
			builder.copy(`${files}/worker.js`, worker_dest, {
				replace: {
					// the paths returned by the Wrangler config might be Windows paths,
					// so we need to convert them to POSIX paths or else the backslashes
					// will be interpreted as escape characters and create an incorrect import path
					SERVER: `${posixify(path.relative(worker_dest_dir, builder.getServerDirectory()))}/index.js`,
					MANIFEST: `${posixify(path.relative(worker_dest_dir, tmp))}/manifest.js`,
					ASSETS: assets_binding
				}
			});

			// _headers
			const headers_src = '_headers';
			const headers_dest = `${dest}/_headers`;
			if (existsSync(headers_src)) {
				copyFileSync(headers_src, headers_dest);
			}
			writeFileSync(headers_dest, generate_headers(builder.getAppPath()), { flag: 'a' });

			// _redirects
			const redirects_src = '_redirects';
			const redirects_dest = `${dest}/_redirects`;
			if (existsSync(redirects_src)) {
				copyFileSync(redirects_src, redirects_dest);
			}
			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(redirects_dest, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			if (building_for_cloudflare_pages) {
				// _routes.json

				// we need to add the source paths found in the `_redirects` file to the
				// `_routes.json` file so that Cloudflare knows not to invoke the Worker
				// for these paths.
				/** @type {string[]} */
				let redirects = [];
				if (existsSync(redirects_dest)) {
					const redirect_rules = readFileSync(redirects_dest, 'utf8');
					redirects = parse_redirects(redirect_rules);
				}

				writeFileSync(
					`${dest}/_routes.json`,
					JSON.stringify(
						get_routes_json(builder, client_assets, redirects, options.routes ?? {}),
						null,
						'\t'
					)
				);
			} else {
				writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });
			}
		},
		emulate() {
			// we want to invoke `getPlatformProxy` only once, but await it only when it is accessed.
			// If we would await it here, it would hang indefinitely because the platform proxy only resolves once a request happens
			const get_emulated = async () => {
				const proxy = await getPlatformProxy(options.platformProxy);
				const platform = /** @type {App.Platform} */ ({
					env: proxy.env,
					ctx: proxy.ctx,
					context: proxy.ctx, // deprecated in favor of ctx
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
		},
		supports: {
			read: ({ route }) => {
				// TODO bump peer dep in next adapter major to simplify this
				if (kit_major === '2' && kit_minor < '25') {
					throw new Error(
						`${name}: Cannot use \`read\` from \`$app/server\` in route \`${route.id}\` when using SvelteKit < 2.25.0`
					);
				}

				return true;
			}
		}
	};
}

/**
 * @param {string} app_dir
 * @returns {string}
 */
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

/**
 * @param {Map<string, { status: number; location: string }>} redirects
 * @returns {string}
 */
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

/**
 * @returns {string}
 */
function generate_assetsignore() {
	// this comes from https://github.com/cloudflare/workers-sdk/blob/main/packages/create-cloudflare/templates-experimental/svelte/templates/static/.assetsignore
	return `
_worker.js
_routes.json
_headers
_redirects
`.trimEnd();
}

/**
 * @param {string} config_file
 * @returns {import('wrangler').Unstable_Config}
 */
function validate_config(config_file = undefined) {
	const wrangler_config = unstable_readConfig({ config: config_file });

	// we don't support workers sites
	if (wrangler_config.site) {
		throw new Error(
			`You must remove all \`site\` keys in ${wrangler_config.configPath}. Consult https://svelte.dev/docs/kit/adapter-cloudflare#Migrating-from-Workers-Sites-to-Workers-Static-Assets`
		);
	}

	if (is_building_for_cloudflare_pages(wrangler_config)) {
		return wrangler_config;
	}

	// probably deploying to Cloudflare Workers
	if (wrangler_config.main || wrangler_config.assets) {
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
	}

	return wrangler_config;
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
