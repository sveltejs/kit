import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';
import { parse_redirects } from 'utils.js';

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (existsSync('_routes.json')) {
				throw new Error(
					"Cloudflare's _routes.json should be configured in svelte.config.js. See https://svelte.dev/docs/kit/adapter-cloudflare#Options-routes"
				);
			}

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const worker_dest = `${dest}/_worker.js`;

			builder.rimraf(dest);

			builder.mkdirp(dest);
			builder.mkdirp(worker_dest);

			// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page
			const fallback = path.join(dest, '404.html');
			if (options.fallback === 'spa') {
				await builder.generateFallback(fallback);
			} else {
				writeFileSync(fallback, 'Not Found');
			}

			const dest_dir = `${dest}${builder.config.kit.paths.base}`;
			const written_files = builder.writeClient(dest_dir);
			builder.writePrerendered(dest_dir);
			builder.writeServer(`${worker_dest}/server`);

			writeFileSync(
				`${worker_dest}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './server' })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			writeFileSync(
				`${dest}/_routes.json`,
				JSON.stringify(get_routes_json(builder, written_files, options.routes ?? {}), null, '\t')
			);

			writeFileSync(`${dest}/_headers`, generate_headers(builder.getAppPath()), { flag: 'a' });

			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(`${dest}/_redirects`, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });

			builder.copy(`${files}/worker.js`, `${worker_dest}/index.js`, {
				replace: {
					SERVER: './server/index.js',
					MANIFEST: './manifest.js'
				}
			});
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

	const redirects_file = `${builder.config.kit.files.assets}/_redirects`;

	exclude = exclude
		.flatMap((rule) =>
			rule === '<all>' ? ['<build>', '<files>', '<prerendered>', '<redirects>'] : rule
		)
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

			if (rule === '<redirects>' && existsSync(redirects_file)) {
				const file_contents = readFileSync(redirects_file, 'utf8');
				return parse_redirects(file_contents);
			}

			return rule;
		});

	const excess = include.length + exclude.length - 100;
	if (excess > 0) {
		const message = `Function includes/excludes exceeds _routes.json limits (see https://developers.cloudflare.com/pages/platform/functions/routing/#limits). Dropping ${excess} exclude rules — this will cause unnecessary function invocations.`;
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
