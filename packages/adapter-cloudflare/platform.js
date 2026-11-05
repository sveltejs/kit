/** @import { Plugin } from 'vite' */
/** @import { PlatformProxy } from '@cloudflare/platform-proxy' */
/** @import { PlatformProxyOptions } from './index.js' */
import fs from 'node:fs';
import path from 'node:path';
import { exactRegex } from '@rolldown/pluginutils';
import { getPlatformProxy } from '@cloudflare/platform-proxy';
import { custom_worker_environment } from './config.js';
import { is_dev_or_build } from './utils.js';

/**
 * @param {PlatformProxyOptions} user_options
 * @param {string} stub_import
 * @param {() => boolean} has_custom_worker whether a custom Worker runs in workerd during development
 * @returns {{ plugin: Plugin; attach: (url: string) => Promise<void> }}
 */
export function plugin_platform(user_options, stub_import, has_custom_worker) {
	/** @type {PlatformProxyOptions & { configPath?: string }} */
	let options = {};

	/**
	 * Shared so that concurrent servers start one proxy and only the last close disposes it
	 * @param {() => Promise<PlatformProxy>} start
	 */
	const setup = async (start) => {
		const shared = (globalThis.__sveltekit_cloudflare_platform_setup ??= {
			servers: 0,
			proxy: start()
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

	/** @type {Promise<void> | undefined} */
	let attached;

	/** @type {Plugin} */
	const plugin = {
		name: 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module',
		apply: is_dev_or_build,
		configResolved(config) {
			options = {
				// the Cloudflare Vite plugin reads `cloudflare.config.ts` from Vite's root
				configPath: path.join(config.root, 'cloudflare.config.ts'),
				mode: config.mode,
				...user_options
			};
		},
		configureServer() {
			// a custom Worker's runtime only starts with the dev server, so we attach to it
			// once the first request reaches SvelteKit
			if (has_custom_worker()) return;
			return setup(() => start_platform_proxy(options));
		},
		// a restarting server is set up before the old one closes, so the proxy survives
		async closeServer() {
			if (has_custom_worker()) {
				if (!attached) return;
				attached = undefined;
			}
			await dispose();
		},
		applyToEnvironment(environment) {
			// a custom Worker imports the real `cloudflare:workers` module in workerd
			return environment.name !== custom_worker_environment;
		},
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

	return {
		plugin,
		attach: (url) =>
			(attached ??= setup(() => getPlatformProxy({ url })).catch((error) => {
				// let the next request retry
				attached = undefined;
				throw error;
			}))
	};
}

/**
 * Starts a platform proxy for the bindings in `cloudflare.config.ts`, or an empty one
 * when there is no config file, since the Cloudflare Vite plugin doesn't require one
 * @param {PlatformProxyOptions & { configPath?: string }} options
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
