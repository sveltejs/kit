/** @import { Plugin, PreviewServer, ViteDevServer } from 'vite' */
/** @import { GetPlatformProxyOptions } from 'wrangler' */
import path from 'node:path';
import { exactRegex } from '@rolldown/pluginutils';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

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
export function plugin_platform(options, stub_import, get_environment) {
	const explicit_environment = options.environment;

	/** @param {ViteDevServer | PreviewServer} server */
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

			if (!('watcher' in server)) return;

			// reinitialise the platform proxy when the wrangler config changes
			const resolved = unstable_readConfig({ config: options.configPath });
			if (!resolved.configPath) return;

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
		configurePreviewServer: setup,
		// a restarting server is set up before the old one closes, so the proxy survives
		closeServer: dispose,
		closePreviewServer: dispose,
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
