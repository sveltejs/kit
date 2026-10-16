/** @import { Plugin, ResolvedConfig, ViteDevServer } from 'vite' */
/** @import { GetPlatformProxyOptions } from 'wrangler' */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';
import { validate_worker_settings, append_headers } from './utils.js';
import { exactRegex } from '@rolldown/pluginutils';
import { getRequest } from '@sveltejs/kit/node';
import { cloudflare } from '@cloudflare/vite-plugin';
import { createBuilder, loadEnv } from 'vite';

const name = '@sveltejs/adapter-cloudflare';

/** @type {typeof import('./index.js').default} */
export default function (options = {}) {
	// Add a random query so we can reliably string-replace the stub
	const stub_import =
		import.meta.resolve('./src/virtual-cloudflare-workers.js') + '?' + crypto.randomUUID();
	/** @type {ResolvedConfig} */
	let vite_config;

	/**
	 * @param {string} [root]
	 * @param {string} [mode]
	 */
	function read_config(root = process.cwd(), mode = 'production') {
		root = path.resolve(root);
		const env = loadEnv(mode, root, 'CLOUDFLARE_');
		const config =
			options.config ??
			env.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH ??
			['wrangler.jsonc', 'wrangler.json', 'wrangler.toml'].find((file) =>
				fs.existsSync(path.join(root, file))
			);
		return unstable_readConfig({
			config: config ? path.resolve(root, config) : undefined,
			env: env.CLOUDFLARE_ENV
		});
	}

	return {
		name,
		async adapt(builder) {
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

			const wrangler_config = read_config(vite_config?.root, vite_config?.mode);
			validate_worker_settings(wrangler_config);

			const dest = builder.getBuildDirectory('cloudflare');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');
			const assets = `${tmp}/assets`;
			const worker_dest = `${tmp}/worker.js`;
			const assets_binding = wrangler_config.assets?.binding ?? 'ASSETS';
			const files = fileURLToPath(new URL('./files', import.meta.url));
			const server_dir = posixify(path.resolve(builder.getServerDirectory()));

			fs.rmSync(dest, { force: true, recursive: true });
			fs.rmSync(tmp, { force: true, recursive: true });
			fs.mkdirSync(assets, { recursive: true });

			replace_stub(builder.getServerDirectory(), stub_import);

			// client assets and prerendered pages
			const assets_dest = `${assets}${builder.config.paths.base}`;
			fs.mkdirSync(assets_dest, { recursive: true });
			if (wrangler_config.assets?.not_found_handling === '404-page') {
				// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page.
				// This file is served when a request fails to match an asset.
				const fallback = path.join(assets_dest, '404.html');
				if (options.fallback === 'spa') {
					await builder.generateFallback(fallback);
				} else {
					fs.writeFileSync(fallback, 'Not Found');
				}
			}
			builder.writeClient(assets_dest);
			builder.writePrerendered(assets_dest);
			if (wrangler_config.assets?.not_found_handling === 'single-page-application') {
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
				const initializer = builder.createInstrumentationInitializer({
					outputDirectory: worker_dest_dir,
					environment: `import { env } from 'cloudflare:workers';\nexport default env;\n`
				});
				builder.instrument({
					entrypoint: worker_dest,
					instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`,
					initializer,
					module: {
						generateText: ({ instrumentation, start, initializer }) =>
							`import './${initializer}';\nimport './${instrumentation}';\nexport { default } from './${start}';\n`
					}
				});
			}

			// _headers
			const headers_src = '_headers';
			const headers_dest = `${assets}/_headers`;
			/** @type {string | undefined} */
			let headers;
			if (fs.existsSync(headers_src)) {
				headers = fs.readFileSync(headers_src, 'utf-8');
			}
			fs.writeFileSync(headers_dest, generate_headers(builder.getAppPath(), headers));

			// _redirects
			const redirects_src = '_redirects';
			const redirects_dest = `${assets}/_redirects`;
			if (fs.existsSync(redirects_src)) {
				fs.copyFileSync(redirects_src, redirects_dest);
			}
			if (builder.prerendered.redirects.size > 0) {
				fs.writeFileSync(redirects_dest, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			fs.writeFileSync(`${assets}/.assetsignore`, generate_assetsignore(), { flag: 'a' });

			// Run Cloudflare's complete build only after Kit has finished prerendering and
			// generating its server. Its builder owns both the Worker bundle and deployment config.
			const worker_builder = await createBuilder({
				configFile: false,
				root: vite_config.root,
				mode: vite_config.mode,
				logLevel: vite_config.logLevel,
				base: '/',
				publicDir: path.resolve(assets),
				resolve: { alias: vite_config.resolve.alias },
				define: vite_config.define,
				build: {
					outDir: path.resolve(dest),
					minify: vite_config.build.minify,
					sourcemap: vite_config.build.sourcemap
				},
				environments: {
					client: {
						build: { rollupOptions: { input: 'virtual:sveltekit-cloudflare-assets' } }
					}
				},
				plugins: [
					{
						name: 'vite-plugin-sveltekit-cloudflare-handler',
						enforce: 'pre',
						resolveId(id) {
							if (id === 'virtual:sveltekit-cloudflare-assets')
								return '\0sveltekit-cloudflare-assets';
						},
						load(id) {
							if (id === '\0sveltekit-cloudflare-assets') return '';
							// Compose Kit's source maps with the final Worker bundle's maps.
							if (id.startsWith(`${server_dir}/`) && fs.existsSync(`${id}.map`)) {
								return {
									code: fs.readFileSync(id, 'utf8'),
									map: JSON.parse(fs.readFileSync(`${id}.map`, 'utf8'))
								};
							}
						},
						generateBundle(_options, bundle) {
							for (const [file, output] of Object.entries(bundle)) {
								if (
									output.type === 'chunk' &&
									output.facadeModuleId === '\0sveltekit-cloudflare-assets'
								)
									delete bundle[file];
							}
						}
					},
					cloudflare({
						configPath: options.config,
						viteEnvironment: { name: 'worker' },
						config(config) {
							config.main = path.resolve(worker_dest);
							config.assets ??= {};
							config.assets.binding ??= 'ASSETS';
							config.assets.directory = path.resolve(assets);
							if (
								!config.compatibility_flags.includes('nodejs_compat') &&
								!config.compatibility_flags.includes('nodejs_als')
							) {
								config.compatibility_flags.push('nodejs_als');
							}
						}
					})
				]
			});
			await worker_builder.buildApp();
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		vite({ config }) {
			if (config.paths.assets) {
				throw new Error(
					'@sveltejs/adapter-cloudflare does not support paths.assets because vite preview cannot serve assets from a separate location. Remove paths.assets from your SvelteKit configuration.'
				);
			}

			return {
				preview: false,
				getRequest(options) {
					const request = getRequest(options);
					/** @type {import('@cloudflare/workers-types').Request} */ (
						/** @type {unknown} */ (request)
					).cf = globalThis.__sveltekit_cloudflare_platform?.cf;
					return request;
				},
				plugins: [
					{
						name: 'vite-plugin-sveltekit-adapter-cloudflare',
						config: {
							order: 'post',
							handler(config, env) {
								if (env.command !== 'build') return;
								const wrangler_config = read_config(config.root, env.mode);
								validate_worker_settings(wrangler_config);
							}
						},
						configResolved(config) {
							vite_config = config;
						}
					},
					...cloudflare({ configPath: options.config }).map((plugin) => ({
						...plugin,
						/** @type {Plugin['apply']} */
						apply: (_config, env) => env.isPreview === true
					})),
					virtual_workers_module(
						{
							configPath: options.config,
							...options.platformProxy
						},
						stub_import
					)
				]
			};
		}
	};
}

/**
 * Sets a new platform proxy and disposes the old one if it exists
 * @param {GetPlatformProxyOptions} options
 */
async function reload_cloudflare_platform_proxy(options) {
	const previous = globalThis.__sveltekit_cloudflare_platform;
	const next = await getPlatformProxy(options);
	globalThis.__sveltekit_cloudflare_platform = next;
	if (globalThis.__sveltekit_cloudflare_platform_setup) {
		globalThis.__sveltekit_cloudflare_platform_setup.proxy = Promise.resolve(next);
	}
	Object.defineProperty(globalThis, 'caches', {
		value: next.caches,
		writable: true,
		enumerable: true,
		configurable: true
	});
	if (previous) {
		await previous.dispose();
	}
}

/**
 * @param {GetPlatformProxyOptions} options
 * @param {string} stub_import
 * @returns {Plugin}
 */
function virtual_workers_module(options, stub_import) {
	/** @param {ViteDevServer} server */
	const setup = async (server) => {
		// shared so that concurrent servers start one proxy and only the last close disposes it
		const shared = (globalThis.__sveltekit_cloudflare_platform_setup ??= {
			servers: 0,
			proxy: getPlatformProxy(options)
		});
		shared.servers += 1;
		try {
			const proxy = await shared.proxy;
			// We store the platform proxy on globalThis so that our virtual workers module
			// can access the same instance that we use here to populate `caches` and `cf` (above).
			globalThis.__sveltekit_cloudflare_platform = proxy;
			// Deno defines `caches` with a getter and no setter, so assigning to it throws
			Object.defineProperty(globalThis, 'caches', {
				value: proxy.caches,
				writable: true,
				enumerable: true,
				configurable: true
			});

			// reinitialise the platform proxy when the wrangler config changes
			if ('watcher' in server) {
				const resolved = unstable_readConfig({ config: options.configPath });
				if (resolved.configPath) {
					const config_path = path.resolve(resolved.configPath);
					let reloading = false;

					/** @param {string} file */
					const on_change = (file) => {
						if (reloading || path.resolve(file) !== config_path) return;
						reloading = true;
						reload_cloudflare_platform_proxy(options)
							.catch((/** @type {unknown} */ error) => {
								// A rejection must not become unhandled — it would crash the dev
								// server. Log the message and leave the previous proxy in place
								// (it is only disposed on the success path, so bindings keep working).
								server.config.logger.warn(
									`[adapter-cloudflare] failed to reload the Cloudflare platform proxy after a wrangler config change: ${error instanceof Error ? error.message : String(error)}`
								);
							})
							.finally(() => {
								reloading = false;
							});
					};
					server.watcher.add(config_path);
					server.watcher.on('change', on_change);
				}
			}
		} catch (error) {
			// let the next server retry
			if (globalThis.__sveltekit_cloudflare_platform_setup === shared) {
				globalThis.__sveltekit_cloudflare_platform_setup = undefined;
			}
			throw error;
		}
	};
	const dispose = async () => {
		const shared = globalThis.__sveltekit_cloudflare_platform_setup;
		if (!shared) return;
		shared.servers -= 1;
		if (shared.servers > 0) return;
		globalThis.__sveltekit_cloudflare_platform_setup = undefined;
		globalThis.__sveltekit_cloudflare_platform = undefined;
		await (await shared.proxy).dispose();
	};
	return {
		name: 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module',
		apply: (_config, env) => !env.isPreview,
		configureServer: setup,
		// a restarting server is set up before the old one closes, so the proxy survives
		closeServer: dispose,
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
