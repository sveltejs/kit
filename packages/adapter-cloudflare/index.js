import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (existsSync('_routes.json')) {
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
			if (
				building_for_cloudflare_pages ||
				wrangler_config.assets?.not_found_handling === '404-page'
			) {
				// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page
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
			if (existsSync('_headers')) {
				copyFileSync('_headers', `${dest}/_headers`);
			}
			writeFileSync(`${dest}/_headers`, generate_headers(builder.getAppPath()), { flag: 'a' });

			// _redirects
			if (existsSync('_redirects')) {
				copyFileSync('_redirects', `${dest}/_redirects`);
			}
			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(`${dest}/_redirects`, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });

			if (building_for_cloudflare_pages) {
				writeFileSync(
					`${dest}/_routes.json`,
					JSON.stringify(get_routes_json(builder, client_assets, options.routes ?? {}), null, '\t')
				);
			}
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
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string[]} assets
 * @param {import('./index.js').AdapterOptions['routes']} routes
 * @returns {import('./index.js').RoutesJSONSpec}
 */
function get_routes_json(builder, assets, { include = ['/*'], exclude = ['<all>'] }) {
	if (!Array.isArray(include) || !Array.isArray(exclude)) {
		throw new Error('routes.include and routes.exclude must be arrays');
	}

	if (include.length === 0) {
		throw new Error('routes.include must contain at least one route');
	}

	if (include.length > 100) {
		throw new Error('routes.include must contain 100 or fewer routes');
	}

	exclude = exclude
		.flatMap((rule) => (rule === '<all>' ? ['<build>', '<files>', '<prerendered>'] : rule))
		.flatMap((rule) => {
			if (rule === '<build>') {
				return [`/${builder.getAppPath()}/immutable/*`, `/${builder.getAppPath()}/version.json`];
			}

			if (rule === '<files>') {
				return assets
					.filter(
						(file) =>
							!(
								file.startsWith(`${builder.config.kit.appDir}/`) ||
								file === '_headers' ||
								file === '_redirects'
							)
					)
					.map((file) => `${builder.config.kit.paths.base}/${file}`);
			}

			if (rule === '<prerendered>') {
				return builder.prerendered.paths;
			}

			return rule;
		});

	const excess = include.length + exclude.length - 100;
	if (excess > 0) {
		const message = `Cloudflare Pages Functions' includes/excludes exceeds _routes.json limits (see https://developers.cloudflare.com/pages/platform/functions/routing/#limits). Dropping ${excess} exclude rules — this will cause unnecessary function invocations.`;
		builder.log.warn(message);

		exclude.length -= excess;
	}

	return {
		version: 1,
		description: 'Generated by @sveltejs/adapter-cloudflare',
		include,
		exclude
	};
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

function generate_assetsignore() {
	// this comes from https://github.com/cloudflare/workers-sdk/blob/main/packages/create-cloudflare/templates-experimental/svelte/templates/static/.assetsignore
	return `
_worker.js
_routes.json
_headers
_redirects
`;
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

/**
 * @param {import('wrangler').Unstable_Config} wrangler_config
 * @returns {boolean}
 */
function is_building_for_cloudflare_pages(wrangler_config) {
	return (
		!!process.env.CF_PAGES ||
		!wrangler_config.configPath ||
		!!wrangler_config.pages_build_output_dir ||
		!wrangler_config.main ||
		!wrangler_config.assets
	);
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
