import { existsSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';
// TODO 3.0: switch to named imports, right now we're doing `import * as ..` to avoid having to bump the peer dependency on Kit
import * as kit from '@sveltejs/kit';
import * as node_kit from '@sveltejs/kit/node';

const [major, minor] = kit.VERSION.split('.').map(Number);
const can_use_middleware = major > 2 || (major === 2 && minor > 17);

/** @type {string | null} */
let middleware_path = can_use_middleware ? 'src/cloudflare-middleware.js' : null;
if (middleware_path && !existsSync(middleware_path)) {
	middleware_path = 'src/cloudflare-middleware.ts';
	if (!existsSync(middleware_path)) middleware_path = null;
}

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (existsSync('_routes.json')) {
				throw new Error(
					'Cloudflare routes should be configured in svelte.config.js rather than _routes.json'
				);
			}

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(tmp);

			builder.mkdirp(dest);
			builder.mkdirp(tmp);

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

			const relativePath = path.posix.relative(dest, builder.getServerDirectory());

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			if (middleware_path) {
				builder.copy(`${files}/middleware.js`, `${tmp}/middleware.js`, {
					replace: {
						MIDDLEWARE: `${path.posix.relative(tmp, builder.getServerDirectory())}/adapter/cloudflare-middleware.js`
					}
				});
			} else {
				writeFileSync(
					`${tmp}/middleware.js`,
					'export function onRequest({ next }) { return next() }'
				);
			}

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

			builder.copy(`${files}/worker.js`, `${dest}/_worker.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: `${path.posix.relative(dest, tmp)}/manifest.js`,
					MIDDLEWARE: `${path.posix.relative(dest, tmp)}/middleware.js`
				}
			});
		},

		emulate(opts) {
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
				},
				beforeRequest: async (req, res, next) => {
					emulated ??= await get_emulated();
					const middleware = await opts.importEntryPoint('cloudflare-middleware');

					const { url, denormalize } = kit.normalizeUrl(req.url);

					const request = new Request(url, {
						headers: node_kit.getRequestHeaders(req),
						method: req.method,
						body:
							// We omit the body here because it would consume the stream
							req.method === 'GET' || req.method === 'HEAD' || !req.headers['content-type']
								? undefined
								: 'Cannot read body in dev mode'
					});
					// @ts-expect-error slight type mismatch which seems harmless
					request.cf = emulated.platform.cf;

					// Cloudflare allows you to modify the response object after calling next().
					// This isn't replicable using Vite or Polka middleware, so we approximate it.
					const fake_response = new Response();

					const response = await middleware.onRequest(
						/** @type {Partial<import('@cloudflare/workers-types').EventContext<any, any, any>>} */ ({
							// eslint-disable-next-line object-shorthand
							request: /** @type {any} */ (request), // requires a fetcher property which we don't have
							env: /** @type {any} */ (emulated.platform).env, // does exist, see above
							...emulated.platform.context,
							next: (input, init) => {
								// More any casts because of annoying CF types
								const request =
									input instanceof Request
										? input
										: input && new Request(/** @type {any} */ (input), /** @type {any} */ (init));

								if (request) {
									const url = denormalize(request.url);
									req.url = url.pathname + url.search;
									for (const [key, value] of request.headers) {
										req.headers[key] = value;
									}
								}

								return Promise.resolve(/** @type {any} */ (fake_response));
							}
						})
					);

					if (response instanceof Response && response !== fake_response) {
						// We assume that middleware bails out when returning a custom response
						return node_kit.setResponse(res, response);
					} else {
						for (const header of fake_response.headers) {
							res.setHeader(header[0], header[1]);
						}

						return next();
					}
				}
			};
		},

		additionalEntryPoints: { 'cloudflare-middleware': middleware_path }
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
