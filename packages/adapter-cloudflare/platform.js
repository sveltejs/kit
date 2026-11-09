/** @import { Plugin } from 'vite' */
/** @import { PlatformProxy } from '@cloudflare/platform-proxy' */
/** @import { GetPlatformProxyOptions } from '@cloudflare/platform-proxy' */
/** @import { PluginOptions } from './index.js' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { exactRegex } from '@rolldown/pluginutils';
import { getPlatformProxy } from '@cloudflare/platform-proxy';
import { is_dev_or_build } from './utils.js';

/**
 * @param {PluginOptions} plugin_options the options also passed to the Cloudflare Vite plugin
 * @param {string} stub_import
 * @returns {Plugin}
 */
export function plugin_platform(plugin_options, stub_import) {
	/** @type {Extract<GetPlatformProxyOptions, { url?: undefined }>} */
	let options = {};

	// shared so that concurrent servers start one proxy and only the last close disposes it
	const setup = async () => {
		const shared = (globalThis.__sveltekit_cloudflare_platform_setup ??= {
			servers: 0,
			proxy: start_platform_proxy(options)
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
			options = {
				// match the Cloudflare Vite plugin, which reads `cloudflare.config.ts` from Vite's root,
				// evaluates it with Vite's mode and stores the bindings' data in the same place
				configPath: path.join(config.root, 'cloudflare.config.ts'),
				mode: config.mode,
				persist: plugin_options.persistState,
				// the plugin copies `CLOUDFLARE_` variables from `.env` files into `process.env`
				remoteBindings:
					process.env.CLOUDFLARE_VITE_FORCE_LOCAL === 'true' ? false : plugin_options.remoteBindings
			};
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
 * Starts a platform proxy for the bindings in `cloudflare.config.ts`, or an empty one
 * when there is no config file, since the Cloudflare Vite plugin doesn't require one
 * @param {Extract<GetPlatformProxyOptions, { url?: undefined }>} options
 * @returns {Promise<PlatformProxy>}
 */
async function start_platform_proxy(options) {
	if (options.configPath && fs.existsSync(options.configPath)) {
		return getPlatformProxy(options);
	}

	const cache = {
		delete: () => Promise.resolve(false),
		match: () => Promise.resolve(undefined),
		put: () => Promise.resolve()
	};

	return /** @type {PlatformProxy} */ (
		/** @type {unknown} */ ({
			env: {},
			cf: {},
			ctx: { waitUntil() {}, passThroughOnException() {}, props: {} },
			caches: { open: () => Promise.resolve(cache), default: cache },
			dispose: () => Promise.resolve()
		})
	);
}
