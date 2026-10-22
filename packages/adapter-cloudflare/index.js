/** @import { WorkerConfig } from '@cloudflare/vite-plugin' */
/** @import { Plugin, ResolvedConfig, ViteDevServer } from 'vite' */
/** @import { GetPlatformProxyOptions } from 'wrangler' */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactRegex } from '@rolldown/pluginutils';
import { getRequest } from '@sveltejs/kit/node';
import { getPlatformProxy, unstable_getVarsForDev, unstable_readConfig } from 'wrangler';
import { is_dev_or_build, plugin_config } from './config.js';
import { validate_worker_settings, append_headers, sync_process_env } from './utils.js';

const files = fileURLToPath(new URL('./files', import.meta.url));

/** @type {typeof import('./index.js').default} */
export default function (options = {}) {
	// Add a random query so we can reliably string-replace the stub
	const stub_import =
		import.meta.resolve('./src/virtual-cloudflare-workers.js') + '?' + crypto.randomUUID();

	/** @type {ResolvedConfig} */
	let vite_config;
	/** @type {WorkerConfig} */
	let wrangler_config;

	return {
		name: '@sveltejs/adapter-cloudflare',
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

			validate_worker_settings(wrangler_config);

			const dest = builder.getBuildDirectory('cloudflare');

			fs.rmSync(dest, { force: true, recursive: true });

			const assets = `${dest}/client`;
			fs.mkdirSync(assets, { recursive: true });

			const worker_dir = `${dest}/worker`;
			const worker_dest = `${worker_dir}/index.js`;
			const server_dir = `${worker_dir}/server`;
			builder.writeServer(server_dir);
			replace_stub(server_dir, stub_import);
			fs.rmSync(`${server_dir}/wrangler.json`);
			if (fs.existsSync(`${server_dir}/.dev.vars`)) {
				fs.renameSync(`${server_dir}/.dev.vars`, `${worker_dir}/.dev.vars`);
			}

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
			builder.generateServerInstance(`${worker_dir}/server.js`, { serverDirectory: server_dir });
			builder.copy(`${files}/worker.js`, worker_dest, {
				replace: {
					// the paths returned by the Wrangler config might be Windows paths,
					// so we need to convert them to POSIX paths or else the backslashes
					// will be interpreted as escape characters and create an incorrect import path.
					// We also need to ensure the relative imports start with ./ since Wrangler
					// errors if a relative import looks like a package import
					SERVER: `./${posixify(path.relative(worker_dest_dir, worker_dir))}/server.js`,
					BASE_PATH: JSON.stringify(builder.config.paths.base),
					APP_PATH: JSON.stringify(builder.getAppPath()),
					MANIFEST_ASSETS: `new Set(${JSON.stringify(builder.manifest.assets.map((a) => a.path))})`,
					PRERENDERED: `new Set(${JSON.stringify(builder.prerendered.paths)})`,
					ASSETS_BINDING: wrangler_config.assets?.binding ?? 'ASSETS'
				}
			});
			if (builder.hasServerInstrumentationFile()) {
				const initializer = builder.createInstrumentationInitializer({
					outputDirectory: worker_dest_dir,
					serverDirectory: server_dir,
					environment: `import { env } from 'cloudflare:workers';\nexport default env;\n`
				});
				builder.instrument({
					entrypoint: worker_dest,
					instrumentation: `${server_dir}/instrumentation.server.js`,
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

			// Point the Cloudflare deployment config at the final Worker and assets.
			/** @type {WorkerConfig} */
			const output_config = JSON.parse(
				fs.readFileSync(`${builder.getServerDirectory()}/wrangler.json`, 'utf8')
			);
			output_config.main = path.basename(worker_dest);
			/** @type {NonNullable<WorkerConfig['assets']>} */ (output_config.assets).directory =
				posixify(path.relative(worker_dir, assets));
			fs.writeFileSync(`${worker_dir}/wrangler.json`, JSON.stringify(output_config, null, 2));

			// point Wrangler to the adapter output's deployment config
			const deploy_config_path = path.join(vite_config.root, '.wrangler/deploy/config.json');
			/** @type {WorkerConfig} */
			const deploy_config = JSON.parse(fs.readFileSync(deploy_config_path, 'utf8'));
			deploy_config.configPath = posixify(
				path.relative(path.dirname(deploy_config_path), path.resolve(worker_dir, 'wrangler.json'))
			);
			fs.writeFileSync(deploy_config_path, JSON.stringify(deploy_config, null, 2));
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
						name: 'vite-plugin-sveltekit-adapter-cloudflare-resolved-config',
						configResolved(config) {
							vite_config = config;
						}
					},
					...plugin_config(options.config, (config) => (wrangler_config = config)),
					{
						name: 'vite-plugin-sveltekit-adapter-cloudflare-env',
						apply: is_dev_or_build,
						config: {
							// runs after the Cloudflare Vite plugin resolved the Wrangler config
							// but before SvelteKit reads `process.env`
							order: 'post',
							handler() {
								sync_process_env(
									unstable_getVarsForDev(
										wrangler_config.configPath,
										undefined,
										wrangler_config.vars,
										wrangler_config.targetEnvironment,
										true,
										wrangler_config.secrets
									)
								);
							}
						}
					},
					virtual_workers_module(
						{
							configPath: options.config,
							...options.platformProxy
						},
						stub_import,
						() => wrangler_config?.targetEnvironment
					)
				]
			};
		}
	};
}

// TODO: move the Vite plugin stuff into their own file

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
 * @param {() => string | undefined} get_environment the Wrangler environment the Cloudflare Vite plugin resolved
 * @returns {Plugin}
 */
function virtual_workers_module(options, stub_import, get_environment) {
	const explicit_environment = options.environment;

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

			// reinitialise the platform proxy when the wrangler config or local variables change
			if ('watcher' in server) {
				const resolved = unstable_readConfig({ config: options.configPath });
				if (resolved.configPath) {
					const config_path = path.resolve(resolved.configPath);
					// the same files that `@cloudflare/vite-plugin` watches
					const local_files = ['.dev.vars', '.env'];
					const cloudflare_env = get_environment();
					if (cloudflare_env) {
						local_files.push(`.dev.vars.${cloudflare_env}`, `.env.${cloudflare_env}`);
					}
					const watched = [
						config_path,
						...local_files.map((file) => path.join(path.dirname(config_path), file))
					];
					let reloading = false;

					/** @param {string} file */
					const on_change = (file) => {
						if (reloading || !watched.includes(path.resolve(file))) return;
						reloading = true;
						reload_cloudflare_platform_proxy(options)
							// so that SvelteKit reads the new variables
							.then(() => server.restart())
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
					server.watcher.add(watched);
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
		apply: is_dev_or_build,
		configResolved(config) {
			// resolve the config path relative to the Vite `root` setting rather than
			// the current working directory
			if (options.configPath) {
				options.configPath = path.resolve(config.root, options.configPath);
			}
			// the Cloudflare Vite plugin also reads `CLOUDFLARE_ENV` from `.env` files,
			// so use the same environment instead of only the shell's `CLOUDFLARE_ENV`
			options.environment = explicit_environment ?? get_environment();
		},
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
	// Pad outside the string literal so that existing source-map columns stay valid.
	const padding = ' '.repeat(stub_import.length - 'cloudflare:workers'.length);
	// recurse, find stub_import, replace with "cloudflare:workers"
	const files = fs.readdirSync(directory);
	for (const file of files) {
		const file_path = path.join(directory, file);
		if (fs.statSync(file_path).isDirectory()) {
			replace_stub(file_path, stub_import);
		} else if (file.endsWith('.js')) {
			let contents = fs.readFileSync(file_path, 'utf8');
			if (contents.includes(stub_import)) {
				for (const quote of ['"', "'"]) {
					contents = contents.replaceAll(
						`${quote}${stub_import}${quote}`,
						`${quote}cloudflare:workers${quote}${padding}`
					);
				}
				fs.writeFileSync(file_path, contents);
			}
		}
	}
}
