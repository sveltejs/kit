/** @import { WorkerConfig } from '@cloudflare/vite-plugin' */
import { copyFileSync, existsSync, writeFileSync, symlinkSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import { DEV } from 'esm-env';

const name = '@sveltejs/adapter-cloudflare';

const default_worker = path.join(import.meta.dirname, 'src/worker.js');

const DEFAULT_ASSET_BINDING = 'ASSETS';

/**
 * Resolved after the Cloudflare Vite plugin `config` hook runs
 * @type {WorkerConfig | undefined}
 */
let wrangler_config;

/** @type {boolean} */
let building;

/** @type {import('./index.js').default} */
export default function (options = {}) {
	options.worker ??= true;

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
			if (wrangler_config?.assets?.not_found_handling === '404-page') {
				await builder.generateFallback(path.join(client_dest, '404.html'));
			}

			builder.writePrerendered(client_dest);

			if (wrangler_config?.assets?.not_found_handling === 'single-page-application') {
				await builder.generateFallback(path.join(client_dest, 'index.html'));
			}

			// worker
			if (options.worker) {
				const server_dest = builder.getServerDirectory();
				const manifest_path = `${server_dest}/manifest.js`;
				unlinkSync(manifest_path);
				writeFileSync(
					manifest_path,
					`export const manifest = ${builder.generateManifest({ relativePath: '.' })};\n`
				);

				if (builder.hasServerInstrumentationFile()) {
					builder.instrument({
						entrypoint: `${server_dest}/index.js`,
						instrumentation: `${server_dest}/instrumentation.server.js`
					});
				}
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

			// avoid deploying the Vite manifest
			writeFileSync(`${client_dest}/.assetsignore`, '\n.vite', { flag: 'a' });
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		vite: {
			plugins: [
				{
					name: 'vite-plugin-sveltekit-cloudflare:pre',
					config(config, env) {
						building = env.command === 'build';

						// We need to rename the SvelteKit server entry to `server.js` because
						// The Cloudflare Vite plugin hardcodes the worker entry as `index.js`
						config.environments ??= {};
						config.environments.ssr ??= {};
						config.environments.ssr.build ??= {};
						config.environments.ssr.build.rolldownOptions ??= {};
						const input = config.environments.ssr.build.rolldownOptions.input;
						if (typeof input === 'object' && 'index' in input) {
							input.server = input.index;
							delete input.index;
						}

						// noop to prevent Cloudflare's fallback `buildApp` hook from running
						// so that it doesn't build the client and server again, but also
						// avoid overwriting the user's `buildApp` hook if they defined one
						if (!config.builder?.buildApp) {
							config.builder ??= {};
							config.builder.buildApp = async () => {};
						}
					},
					applyToEnvironment(environment) {
						return environment.name === 'ssr';
					},

					resolveId: {
						filter: {
							id: [/^SERVER$/, /^MANIFEST$/]
						},
						handler(id, importer, options) {
							if (importer !== default_worker) return;

							if (!building) {
								const source = `sveltekit:${id === 'SERVER' ? 'server' : 'server-manifest'}`;
								return this.resolve(source, importer, options);
							}

							return {
								id: `./${id.toLowerCase()}.js`,
								external: true
							};
						}
					},
					writeBundle(output) {
						// manifest.js isn't written until the `adapter.adapt()` method runs
						// so we need to temporarily symlink the full manifest for the
						// the build analysis and prerender phases
						const filepath = `${output.dir}/manifest.js`;
						if (!existsSync(filepath)) {
							symlinkSync(`${output.dir}/manifest-full.js`, filepath);
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
					// this function does not run for `vite preview`
					config(user_config) {
						// merge with the user's programmatic config
						if (typeof options.vitePluginOptions?.config === 'function') {
							options.vitePluginOptions?.config(user_config);
						} else {
							Object.assign(user_config, options.vitePluginOptions?.config);
						}

						if (!options.worker && (user_config.main || user_config.assets?.binding)) {
							throw new Error(
								'The Cloudflare adapter `worker` option has been set to `false`' +
									' but your Wrangler configuration file has the Worker keys `main` or `assets.binding` configured.' +
									' Please remove the keys from your Wrangler configuration file or enable the Cloudflare adapter `worker` option in your Svelte config file'
							);
						}

						if (DEV || options.worker) {
							user_config.main ??= default_worker;

							// we don't need to populate `assets.directory` because
							// the Cloudflare Vite plugin does that based on the Vite client
							// build input entry value
							user_config.assets ??= {};
							user_config.assets.binding ??= DEFAULT_ASSET_BINDING;

							// svelte and kit both require `node:async_hooks` on the server so
							// we need to ensure either `nodejs_als` or `nodejs_compat` are enabled
							if (
								!user_config.compatibility_flags.find(
									(flag) => flag === 'nodejs_als' || flag === 'nodejs_compat'
								)
							) {
								user_config.compatibility_flags.push('nodejs_als');
							}
						}

						// TODO: warn on overridden config options?

						wrangler_config = user_config;
					},
					experimental: {
						...options.vitePluginOptions?.experimental
						// TODO: identify when kit is prerendering and use this prerender worker instead of the main worker
						// prerenderWorker: {
						// 	configPath: options.vitePluginOptions?.experimental?.prerenderWorker?.configPath,
						// 	viteEnvironment: {
						// 		name: 'prerender',
						// 		childEnvironments:
						// 			options.vitePluginOptions?.experimental?.prerenderWorker?.viteEnvironment
						// 				?.childEnvironments
						// 	},
						// 	config() {
						// 		return wrangler_config;
						// 	}
						// }
					}
				}),
				{
					name: 'vite-plugin-sveltekit-cloudflare:post',
					config(config) {
						// use the assets binding name configured in the wrangler config file
						config.environments ??= {};
						config.environments.ssr ??= {};
						config.environments.ssr.define ??= {};
						config.environments.ssr.define.__SVELTEKIT_CLOUDFLARE_ASSETS_BINDING__ = JSON.stringify(
							wrangler_config?.assets?.binding ?? DEFAULT_ASSET_BINDING
						);

						// prevent Vite from resolving Svelte client exports
						const browser_condition =
							config.environments.ssr.resolve?.conditions?.indexOf('browser');
						if (browser_condition && browser_condition >= 0) {
							config.environments.ssr.resolve?.conditions?.splice(browser_condition, 1);
						}

						// ensure we correctly reference the build output file that exports
						// `Server` rather than the Cloudflare worker entry `output/server/index.js`
						config.resolve ??= {};
						config.resolve.alias ??= [];
						if (Array.isArray(config.resolve.alias)) {
							config.resolve.alias.unshift({
								find: '__SERVER__/index.js',
								replacement: `${config.environments.ssr.build?.outDir}/server.js`
							});
						}

						// inherit top-level `optimizeDeps.entries` that we set in SvelteKit's
						// Vite config so that server-side deps are correctly pre-bundled
						config.environments.ssr.optimizeDeps ??= {};
						config.environments.ssr.optimizeDeps.entries ??= [];
						if (typeof config.environments.ssr.optimizeDeps.entries === 'string') {
							config.environments.ssr.optimizeDeps.entries = [
								config.environments.ssr.optimizeDeps.entries
							];
						}
						if (config.optimizeDeps?.entries) {
							const top_level_entries = (
								Array.isArray(config.optimizeDeps.entries)
									? config.optimizeDeps.entries
									: [config.optimizeDeps.entries]
							).filter((entry) => {
								return entry.endsWith('/**/+*.{svelte,js,ts}');
							});
							config.environments.ssr.optimizeDeps.entries.push(...top_level_entries);
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
