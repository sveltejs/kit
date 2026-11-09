/** @import { Plugin } from 'vite' */
/** @import { PlatformProxy } from '@cloudflare/platform-proxy' */
/** @import { GetPlatformProxyOptions } from '@cloudflare/platform-proxy' */
/** @import { PluginOptions } from './index.js' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { exactRegex } from '@rolldown/pluginutils';
import { getPlatformProxy } from '@cloudflare/platform-proxy';
import { custom_worker_environment } from './config.js';
import { is_dev_or_build } from './utils.js';

/**
 * @param {PluginOptions} plugin_options the options also passed to the Cloudflare Vite plugin
 * @param {string} stub_import
 * @param {() => boolean} has_custom_worker whether a custom Worker runs in workerd during development
 * @returns {{ plugin: Plugin; attach: (url: string) => Promise<void> }}
 */
export function plugin_platform(plugin_options, stub_import, has_custom_worker) {
	/** @type {Extract<GetPlatformProxyOptions, { url?: undefined }>} */
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
				// match the Cloudflare Vite plugin, which reads `cloudflare.config.ts` from Vite's root,
				// evaluates it with Vite's mode and stores the bindings' data in the same place
				configPath: path.join(config.root, 'cloudflare.config.ts'),
				mode: config.mode,
				persist: plugin_options.persistState,
				// The Cloudflare Vite plugin turns remote bindings off when `CLOUDFLARE_VITE_FORCE_LOCAL`
				// is `true`, which `cf-vite dev --local` sets (like `wrangler dev --local`). We do the same
				// so that the platform proxy matches it. The plugin has already copied `CLOUDFLARE_`
				// variables from `.env` files into `process.env` by this point. See
				// https://github.com/cloudflare/workers-sdk/blob/d437be397b9e36d76f1a0cd44fe56e77c70a077d/packages/vite-plugin-cloudflare/src/plugin-config.ts#L338-L344
				remoteBindings:
					process.env.CLOUDFLARE_VITE_FORCE_LOCAL === 'true' ? false : plugin_options.remoteBindings
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
