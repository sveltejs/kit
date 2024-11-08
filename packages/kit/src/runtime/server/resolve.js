import { DEV } from 'esm-env';
import { validate_server_exports } from '../../utils/exports.js';
import { exec } from '../../utils/routing.js';
import { decode_pathname } from '../../utils/url.js';
import { base } from '__sveltekit/paths';

/* global __SVELTEKIT_ADAPTER_NAME__ */

/**
 * @param {import('types').SSROptions} options
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {(info: Request | import('crossws').Peer) => import('types').MaybePromise<Partial<import('crossws').Hooks>>}
 */
export function resolve(options, manifest) {
	return async (info) => {
		let req = info;

		// These types all need to be straightened out
		if (!req.url) {
			req = info.request;
		}

		/** URL but stripped from the potential `/__data.json` suffix and its search param  */
		const url = new URL(req.url);

		// reroute could alter the given URL, so we pass a copy
		let rerouted_path;
		try {
			rerouted_path = options.hooks.reroute({ url }) ?? url.pathname;
		} catch {
			return {};
		}

		let decoded;
		try {
			decoded = decode_pathname(rerouted_path);
		} catch (e) {
			console.error(e);
			return {};
		}

		if (base && decoded.startsWith(base)) {
			decoded = decoded.slice(base.length) || '/';
		}

		/** @type {import('types').SSRRoute | null} */
		let route = null;

		// Should we find a good way to pass the decoded params to some of the websocket hooks?
		// /** @type {Record<string, string>} */
		// let params = {};

		try {
			// TODO this could theoretically break - should probably be inside a try-catch
			const matchers = await manifest._.matchers();

			for (const candidate of manifest._.routes) {
				const match = candidate.pattern.exec(decoded);

				if (!match) continue;

				const matched = exec(match, candidate.params, matchers);
				if (matched) {
					route = candidate;
					break;
				}
			}
		} catch (e) {
			console.error(e);
			return {};
		}

		try {
			// determine whether we need to redirect to add/remove a trailing slash
			if (route && route.endpoint) {
				// if `paths.base === '/a/b/c`, then the root route is `/a/b/c/`,
				// regardless of the `trailingSlash` route option

				const node = await route.endpoint();

				if (DEV) {
					validate_server_exports(node, /** @type {string} */ (route.endpoint_id));
				}

				return node.socket ?? {};
			}

			return {};
		} catch (e) {
			console.error(e);
			return {};
		}
	};
}
