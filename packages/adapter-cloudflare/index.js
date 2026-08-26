/** @import { Plugin } from 'vite' */
/** @import { GetPlatformProxyOptions } from 'wrangler' */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';
import {
	is_building_for_cloudflare_pages,
	validate_worker_settings,
	get_routes_json,
	parse_redirects,
	append_headers
} from './utils.js';
import { exactRegex } from '@rolldown/pluginutils';
import { getRequest } from '@sveltejs/kit/node';

const name = '@sveltejs/adapter-cloudflare';

/** @type {typeof import('./index.js').default} */
export default function (options = {}) {
	// Add a random query so we can reliably string-replace the stub
	const stub_import =
		import.meta.resolve('./src/virtual-cloudflare-workers.js') + '?' + crypto.randomUUID();
	return {
		name,
		async adapt(builder) {
			if (
				fs.existsSync('_routes.json') ||
				fs.existsSync(`${builder.config.files.assets}/_routes.json`)
			) {
				throw new Error(
					"Cloudflare Pages' _routes.json should be configured from the adapter option of the SvelteKit plugin in your vite.config.js. See https://svelte.dev/docs/kit/adapter-cloudflare#Options-routes"
				);
			}

			if (fs.existsSync(`${builder.config.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			if (fs.existsSync(`${builder.config.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			const { wrangler_config, building_for_cloudflare_pages } = validate_wrangler_config(
				options.config
			);

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
			}

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			fs.rmSync(dest, { force: true, recursive: true });
			fs.rmSync(worker_dest, { force: true, recursive: true });

			fs.mkdirSync(dest, { recursive: true });
			fs.mkdirSync(tmp, { recursive: true });

			replace_stub(builder.getServerDirectory(), stub_import);

			// client assets and prerendered pages
			const assets_dest = `${dest}${builder.config.paths.base}`;
			fs.mkdirSync(assets_dest, { recursive: true });
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
					fs.writeFileSync(fallback, 'Not Found');
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
			builder.generateServerInstance(`${tmp}/server.js`);
			builder.copy(`${files}/worker.js`, worker_dest, {
				replace: {
					// the paths returned by the Wrangler config might be Windows paths,
					// so we need to convert them to POSIX paths or else the backslashes
					// will be interpreted as escape characters and create an incorrect import path.
					// We also need to ensure the relative imports start with ./ since Wrangler
					// errors if a relative import looks like a package import
					SERVER: `./${posixify(path.relative(worker_dest_dir, tmp))}/server.js`,
					BASE_PATH: JSON.stringify(builder.config.paths.base),
					APP_PATH: JSON.stringify(builder.getAppPath()),
					MANIFEST_ASSETS: `new Set(${JSON.stringify(builder.manifest.assets.map((a) => a.path))})`,
					PRERENDERED: `new Set(${JSON.stringify(builder.prerendered.paths)})`,
					ASSETS_BINDING: assets_binding
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
			/** @type {string | undefined} */
			let headers;
			if (fs.existsSync(headers_src)) {
				headers = fs.readFileSync(headers_src, 'utf-8');
			}
			fs.writeFileSync(headers_dest, generate_headers(builder.getAppPath(), headers));

			// _redirects
			const redirects_src = '_redirects';
			const redirects_dest = `${dest}/_redirects`;
			if (fs.existsSync(redirects_src)) {
				fs.copyFileSync(redirects_src, redirects_dest);
			}
			if (builder.prerendered.redirects.size > 0) {
				fs.writeFileSync(redirects_dest, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			if (building_for_cloudflare_pages) {
				// _routes.json

				// we need to add the source paths found in the `_redirects` file to the
				// `_routes.json` file so that Cloudflare knows it shouldn't invoke the
				// Worker but instead let the rules in the `_redirects` file take over.
				/** @type {string[]} */
				let redirects = [];
				if (fs.existsSync(redirects_dest)) {
					const redirect_rules = fs.readFileSync(redirects_dest, 'utf8');
					redirects = parse_redirects(redirect_rules);
				}

				fs.writeFileSync(
					`${dest}/_routes.json`,
					JSON.stringify(
						get_routes_json(builder, client_assets, redirects, options.routes ?? {}),
						null,
						'\t'
					)
				);
			} else {
				fs.writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });
			}
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		getRequest(options) {
			const request = getRequest(options);
			/** @type {import('@cloudflare/workers-types').Request} */ (
				/** @type {unknown} */ (request)
			).cf = globalThis.__sveltekit_cloudflare_platform?.cf;
			return request;
		},
		vite: {
			plugins: {
				pre: [
					virtual_workers_module(
						{
							configPath: options.config,
							...options.platformProxy
						},
						stub_import
					)
				]
			}
		}
	};
}

/**
 * @param {GetPlatformProxyOptions} options
 * @param {string} stub_import
 * @returns {Plugin}
 */
function virtual_workers_module(options, stub_import) {
	const setup = async () => {
		if (globalThis.__sveltekit_cloudflare_platform) return;
		const proxy = await getPlatformProxy(options);
		// We store the platform proxy on globalThis so that our virtual workers module
		// can access the same instance that we use here to populate `caches` and `cf` (above).
		globalThis.__sveltekit_cloudflare_platform = proxy;
		/** @type {any} */ (globalThis).caches = proxy.caches;
	};
	return {
		name: 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module',
		configureServer: setup,
		configurePreviewServer: setup,
		resolveId: {
			filter: { id: exactRegex('cloudflare:workers') },
			handler() {
				return {
					id: stub_import,
					external: true
				};
			}
		}
	};
}

/**
 * @param {string} app_dir
 * @param {string | undefined} content existing `_headers` file content
 * @returns {string}
 */
function generate_headers(app_dir, content = '') {
	content = append_headers(
		`/${app_dir}/*`,
		['X-Robots-Tag: noindex', 'Cache-Control: no-cache'],
		content
	);

	content = append_headers(
		`/${app_dir}/immutable/*`,
		['! Cache-Control', 'Cache-Control: public, immutable, max-age=31536000'],
		content
	);

	return content;
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
 * 	wrangler_config: import('wrangler').Unstable_Config,
 * 	building_for_cloudflare_pages: boolean
 * }}
 */
function validate_wrangler_config(config_file = undefined) {
	const wrangler_config = unstable_readConfig({ config: config_file });

	const building_for_cloudflare_pages = is_building_for_cloudflare_pages(wrangler_config);

	// we don't need to validate the config if we're building for Cloudflare Pages
	// because the `main` and `assets` values cannot be changed there
	if (!building_for_cloudflare_pages) {
		validate_worker_settings(wrangler_config);
	}

	return {
		wrangler_config,
		building_for_cloudflare_pages
	};
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 *
 * @param {string} directory
 * @param {string} stub_import
 */
function replace_stub(directory, stub_import) {
	// recurse, find stub_import, replace with "cloudflare:workers"
	const files = fs.readdirSync(directory);
	for (const file of files) {
		const file_path = path.join(directory, file);
		if (fs.statSync(file_path).isDirectory()) {
			replace_stub(file_path, stub_import);
		} else {
			const contents = fs.readFileSync(file_path, 'utf8');
			if (contents.includes(stub_import)) {
				fs.writeFileSync(file_path, contents.replaceAll(stub_import, 'cloudflare:workers'));
			}
		}
	}
}
