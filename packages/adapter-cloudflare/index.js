import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { unstable_readConfig } from 'wrangler';
import { cloudflare } from '@cloudflare/vite-plugin';
import { validate_worker_settings } from './utils.js';
import { DEV } from 'esm-env';

const name = '@sveltejs/adapter-cloudflare';

/** @type {import('./index.js').default} */
export default function (options = {}) {
	const { wrangler_config } = validate_wrangler_config(options.vitePluginOptions?.configPath);

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

			let dest = builder.getBuildDirectory('cloudflare');
			let worker_dest = `${dest}/_worker.js`;
			let assets_binding = 'ASSETS';

			if (wrangler_config.main) {
				worker_dest = wrangler_config.main;
			}
			if (wrangler_config.assets?.directory) {
				// wrangler doesn't resolve `assets.directory` to an absolute path unlike
				// `main` and `pages_build_output_dir` so we need to do it ourselves here
				const parent_dir = wrangler_config.configPath
					? path.dirname(path.resolve(wrangler_config.configPath))
					: process.cwd();
				dest = path.resolve(parent_dir, wrangler_config.assets.directory);
			}
			if (wrangler_config.assets?.binding) {
				assets_binding = wrangler_config.assets.binding;
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
			if (wrangler_config.assets?.not_found_handling === '404-page') {
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
			builder.writeClient(assets_dest);
			builder.writePrerendered(assets_dest);
			if (wrangler_config.assets?.not_found_handling === 'single-page-application') {
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
					// will be interpreted as escape characters and create an incorrect import path.
					// We also need to ensure the relative imports start with ./ since Wrangler
					// errors if a relative import looks like a package import
					SERVER: `./${posixify(path.relative(worker_dest_dir, builder.getServerDirectory()))}/index.js`,
					MANIFEST: `./${posixify(path.relative(worker_dest_dir, tmp))}/manifest.js`,
					ASSETS: assets_binding
				}
			});
			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint: worker_dest,
					instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`
				});
			}

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

			writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		vite: {
			plugins: [
				cloudflare({
					...options.vitePluginOptions,
					configPath: options.vitePluginOptions?.configPath,
					viteEnvironment: {
						name: options.vitePluginOptions?.viteEnvironment?.name ?? 'ssr',
						childEnvironments: options.vitePluginOptions?.viteEnvironment?.childEnvironments
					},
					config: (user_config) => {
						// user programmatic config
						if (typeof options.vitePluginOptions?.config === 'function') {
							options.vitePluginOptions?.config(user_config);
						} else {
							Object.assign(user_config, options.vitePluginOptions?.config);
						}

						if (DEV) {
							if (!user_config.assets?.binding) {
								user_config.assets = {
									binding: 'ASSETS'
								};
							}

							if (!user_config.main) {
								user_config.main = path.resolve(import.meta.dirname, 'fallback-worker.js');
							}
						} else {
							// TODO: if `main` or `assets.binding` is configured, ensure `main`, `assets.directory` and `assets.binding` are populated
						}

						if (
							!user_config.compatibility_flags.find(
								(flag) => flag === 'nodejs_als' || flag === 'nodejs_compat'
							)
						) {
							user_config.compatibility_flags.push('nodejs_als');
						}
					}
				})
			]
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
 * @param {string | undefined} config_file
 * @returns {{
 * 	wrangler_config: import('wrangler').Unstable_Config
 * }}
 */
function validate_wrangler_config(config_file = undefined) {
	const wrangler_config = unstable_readConfig({ config: config_file });

	validate_worker_settings(wrangler_config);

	return {
		wrangler_config
	};
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
