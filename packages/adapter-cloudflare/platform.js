/** @import { Plugin } from 'vite' */
/** @import { GetPlatformProxyOptions } from 'wrangler' */
import { exactRegex } from '@rolldown/pluginutils';
import { getPlatformProxy } from 'wrangler';

/**
 * @param {GetPlatformProxyOptions} options
 * @param {string} stub_import
 * @returns {Plugin}
 */
export function plugin_platform(options, stub_import) {
	// shared so that concurrent servers start one proxy and only the last close disposes it
	const setup = async () => {
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
