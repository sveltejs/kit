import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';
import { get_routes_json, parse_redirects } from 'utils.js';

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (
				existsSync('_routes.json') ||
				existsSync(`${builder.config.kit.files.assets}/_routes.json`)
			) {
				throw new Error(
					"Cloudflare's _routes.json should be configured in svelte.config.js. See https://svelte.dev/docs/kit/adapter-cloudflare#Options-routes"
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

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const worker_dest = `${dest}/_worker.js`;

			builder.rimraf(dest);

			builder.mkdirp(worker_dest);

			// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page.
			// This file is served when a request that matches an entry in `routes.exclude` fails to match an asset.
			const fallback = path.join(dest, '404.html');
			if (options.fallback === 'spa') {
				await builder.generateFallback(fallback);
			} else {
				writeFileSync(fallback, 'Not Found');
			}

			// client assets and prerendered pages
			const dest_dir = `${dest}${builder.config.kit.paths.base}`;
			const client_assets = builder.writeClient(dest_dir);
			builder.writePrerendered(dest_dir);

			// _worker.js
			builder.writeServer(`${worker_dest}/server`);
			builder.copy(`${files}/worker.js`, `${worker_dest}/index.js`, {
				replace: {
					SERVER: './server/index.js',
					MANIFEST: './manifest.js'
				}
			});
			writeFileSync(
				`${worker_dest}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './server' })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			// _headers
			if (existsSync('_headers')) {
				copyFileSync('_headers', `${dest}/_headers`);
			}
			writeFileSync(`${dest}/_headers`, generate_headers(builder.getAppPath()), { flag: 'a' });

			// _redirects
			const redirects_file = `${dest}/_redirects`;
			if (existsSync('_redirects')) {
				copyFileSync('_redirects', redirects_file);
			}
			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(redirects_file, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			// _routes.json
			/** @type {string[]} */
			let redirects = [];
			if (existsSync(redirects_file)) {
				const redirect_rules = readFileSync(redirects_file, 'utf8');
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

			writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });
		},
		emulate() {
			// we want to invoke `getPlatformProxy` only once, but await it only when it is accessed.
			// If we would await it here, it would hang indefinitely because the platform proxy only resolves once a request happens
			const get_emulated = async () => {
				const proxy = await getPlatformProxy(options.platformProxy);
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
