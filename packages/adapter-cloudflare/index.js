import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import { DEV } from 'esm-env';

const name = '@sveltejs/adapter-cloudflare';

const default_worker = path.join(import.meta.dirname, 'src/worker.js');

/**
 * Resolved after the Cloudflare Vite plugin `config` hook runs
 * @type {import('@cloudflare/vite-plugin').WorkerConfig}
 */
let wrangler_config;

/** @type {boolean} */
let building;

/** @type {import('./index.js').default} */
export default function (options = {}) {
	// TODO: remove in a future major after users have had time to migrate
	if (options.config) {
		throw new Error(
			'Remove the `adapter.config` option and configure the `adapter.vitePluginOptions.config` option in your `vite.config.js` file instead'
		);
	}

	if (options.fallback) {
		throw new Error(
			'Remove the `adapter.fallback` option and configure `assets.not_found_handling` in your Wrangler configuration file instead'
		);
	}

	if (options.platformProxy) {
		throw new Error(
			'Remove the `adapter.platformProxy` option and configure the `adapter.vitePluginOptions` option in your `vite.config.js` file or the options in your Wrangler configuration file instead'
		);
	}

	return {
		name,
		async adapt(builder) {
			// TODO: remove in a future major when users have had time to migrate to Cloudflare Workers
			let routes_json_path = '_routes.json';
			if (
				existsSync(routes_json_path) ||
				existsSync((routes_json_path = `${builder.config.kit.files.assets}/_routes.json`))
			) {
				throw new Error(
					`The ${routes_json_path} file is only used when deploying to Cloudflare Pages. However, this adapter no longer supports it. If you're migrating to Cloudflare Workers, you should remove this file`
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

			// client assets and prerendered pages
			const client_dest = builder.getClientDirectory();

			// generate plaintext 404.html first which can then be overridden by
			// prerendering, if the user defined such a page.
			if (wrangler_config.assets?.not_found_handling === '404-page') {
				await builder.generateFallback(path.join(client_dest, '404.html'));
			}

			builder.writePrerendered(client_dest);

			if (wrangler_config.assets?.not_found_handling === 'single-page-application') {
				await builder.generateFallback(path.join(client_dest, 'index.html'));
			}

			// worker
			const server_dest = builder.getServerDirectory();
			writeFileSync(
				`${server_dest}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: '.' })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const basePath = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint: `${server_dest}/index.js`,
					instrumentation: `${server_dest}/instrumentation.server.js`
				});
			}

			// _headers
			const headers_src = '_headers';
			const headers_dest = `${client_dest}/_headers`;
			if (existsSync(headers_src)) {
				copyFileSync(headers_src, headers_dest);
			}
			writeFileSync(headers_dest, generate_headers(builder.getAppPath()), { flag: 'a' });

			// _redirects
			const redirects_src = '_redirects';
			const redirects_dest = `${client_dest}/_redirects`;
			if (existsSync(redirects_src)) {
				copyFileSync(redirects_src, redirects_dest);
			}
			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(redirects_dest, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			writeFileSync(`${client_dest}/.assetsignore`, '\n.vite', { flag: 'a' });
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		vite: {
			plugins: [
				{
					name: 'vite-plugin-sveltekit-cloudflare-pre',
					config(user_config, env) {
						building = env.command === 'build';

						user_config.environments ??= {};
						user_config.environments.ssr ??= {};
						user_config.environments.ssr.build ??= {};
						user_config.environments.ssr.build.rolldownOptions ??= {};

						// The Cloudflare Vite plugin hardcodes the worker entry input as `index`
						// and it can't be configured so we need to rename the SvelteKit one
						if (
							typeof user_config.environments.ssr.build.rolldownOptions.input === 'object' &&
							'index' in user_config.environments.ssr.build.rolldownOptions.input
						) {
							user_config.environments.ssr.build.rolldownOptions.input.server =
								user_config.environments.ssr.build.rolldownOptions.input.index;
							delete user_config.environments.ssr.build.rolldownOptions.input.index;
						}
					},
					applyToEnvironment(environment) {
						return environment.name === 'ssr';
					},
					resolveId: {
						filter: {
							id: [/^SERVER$/, /^MANIFEST$/]
						},
						async handler(id, importer, options) {
							if (importer !== default_worker || (id !== 'SERVER' && id !== 'MANIFEST')) return;

							if (!building) {
								const source = `sveltekit:${id === 'SERVER' ? 'server' : 'server-manifest'}`;
								return this.resolve(source, importer, options);
							}

							return {
								id: `./${id.toLowerCase()}.js`,
								external: true
							};
						}
					}
				},
				cloudflare({
					...options.vitePluginOptions,
					configPath: options.vitePluginOptions?.configPath,
					viteEnvironment: {
						name: 'ssr',
						childEnvironments: options.vitePluginOptions?.viteEnvironment?.childEnvironments
					},
					config(user_config) {
						// merge with the user's programmatic config
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
								user_config.main = default_worker;
							}
						} else {
							// TODO: only configure these if the user does not intend to deploy an assets-only worker
							user_config.main = default_worker;
							user_config.assets = {
								binding: user_config.assets?.binding ?? 'ASSETS'
								// no need to populate `directory` as the Cloudflare Vite plugin
								// does that based on the client build input entry
							};
						}

						if (
							!user_config.compatibility_flags.find(
								(flag) => flag === 'nodejs_als' || flag === 'nodejs_compat'
							)
						) {
							user_config.compatibility_flags.push('nodejs_als');
						}

						// TODO: warn on overridden config options?

						wrangler_config = user_config;
					},
					experimental: {
						...options.vitePluginOptions?.experimental,
						prerenderWorker: {
							configPath: options.vitePluginOptions?.experimental?.prerenderWorker?.configPath,
							viteEnvironment: {
								name: 'prerender',
								childEnvironments:
									options.vitePluginOptions?.experimental?.prerenderWorker?.viteEnvironment
										?.childEnvironments
							},
							config() {
								return wrangler_config;
							}
						}
					}
				}),
				{
					name: 'vite-plugin-sveltekit-cloudflare-post',
					config(user_config) {
						// noop to prevent Cloudflare's fallback `buildApp` hook from
						// running so that it doesn't build the client and server again
						if (user_config.builder?.buildApp) {
							user_config.builder.buildApp = async () => {};
						}

						user_config.environments ??= {};
						user_config.environments.ssr ??= {};
						user_config.environments.ssr.define ??= {};
						user_config.environments.ssr.define.__SVELTEKIT_CLOUDFLARE_ASSETS_BINDING__ =
							JSON.stringify(wrangler_config.assets?.binding);

						// prevent Vite from resolving client svelte exports
						const browser_condition =
							user_config.environments.ssr.resolve?.conditions?.indexOf('browser');
						if (browser_condition && browser_condition >= 0) {
							user_config.environments.ssr.resolve?.conditions?.splice(browser_condition, 1);
						}
					}
				}
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
