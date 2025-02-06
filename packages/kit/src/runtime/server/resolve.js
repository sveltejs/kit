import { DEV } from 'esm-env';
import { validate_server_exports } from '../../utils/exports.js';
import { exec } from '../../utils/routing.js';
import { decode_pathname, decode_params } from '../../utils/url.js';
import { base } from '__sveltekit/paths';

/** @type {Partial<import('crossws').Hooks>} */
const noHooks = {};

/**
 * @param {import('types').SSROptions} options
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @param {import('types').SSRState} state
 * @returns {(info: RequestInit | import('crossws').Peer) => Promise<Partial<import('crossws').Hooks>>}
 */
export function resolve(options, manifest, state) {
	return async (info) => {
		/** @type {Request} */
		let request;

		// Check if info is a Peer object
		if ('request' in info) {
			// @ts-ignore the type UpgradeRequest is equivalent to Request
			request = info.request;
		} else {
			// @ts-ignore although the type is RequestInit, it is almost always a Request object
			request = info;
		}

		const url = new URL(request.url);

		// reroute could alter the given URL, so we pass a copy
		let rerouted_path;
		try {
			rerouted_path = options.hooks.reroute({ url }) ?? url.pathname;
		} catch {
			return noHooks;
		}

		let decoded;
		try {
			decoded = decode_pathname(rerouted_path);
		} catch (e) {
			console.error(e);

			return noHooks;
		}

		if (base) {
			if (!decoded.startsWith(base)) {
				return noHooks;
			}
			decoded = decoded.slice(base.length) || '/';
		}

		/** @type {import('types').SSRRoute | null} */
		let route = null;

		/** @type {Record<string, string>} */
		let params = {};

		try {
			// TODO this could theoretically break - should probably be inside a try-catch
			const matchers = await manifest._.matchers();

			for (const candidate of manifest._.routes) {
				const match = candidate.pattern.exec(decoded);

				if (!match) continue;

				const matched = exec(match, candidate.params, matchers);
				if (matched) {
					route = candidate;
					params = decode_params(matched);
					break;
				}
			}
		} catch (e) {
			console.error(e);

			return noHooks;
		}

		/** @type {Record<string, string>} */
		const headers = {};

		try {
			if (route && route.endpoint) {
				const node = await route.endpoint();

				if (DEV) {
					validate_server_exports(node, /** @type {string} */ (route.endpoint_id));
				}

				/** @type {Partial<import('crossws').Hooks>} */
				const hooks = {
					...node.socket,
					upgrade: async (req) => {
						/** @type {import('@sveltejs/kit').RequestEvent} */
						const event = {
							// @ts-expect-error `cookies` and `fetch` need to be created after the `event` itself
							cookies: null,
							// @ts-expect-error
							fetch: null,
							getClientAddress:
								state.getClientAddress ||
								(() => {
									throw new Error(
										`${__SVELTEKIT_ADAPTER_NAME__} does not specify getClientAddress. Please raise an issue`
									);
								}),
							locals: {},
							params,
							platform: state.platform,
							// @ts-expect-error this usage of request is valid, but the typing is a bit wonky
							request: req,
							route: { id: route?.id ?? null },
							setHeaders: (new_headers) => {
								for (const key in new_headers) {
									const lower = key.toLowerCase();
									const value = new_headers[key];

									if (lower === 'set-cookie') {
										throw new Error(
											'Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies'
										);
									} else if (lower in headers) {
										throw new Error(`"${key}" header is already set`);
									} else {
										headers[lower] = value;

										if (state.prerendering && lower === 'cache-control') {
											state.prerendering.cache = /** @type {string} */ (value);
										}
									}
								}
							},
							url,
							isDataRequest: false,
							isSubRequest: state.depth > 0
						};

						const response = await options.hooks.handle({
							event,
							resolve: async () => {
								const init = (await node.socket?.upgrade?.(req)) ?? undefined;
								return new Response(undefined, init);
							}
						});

						return response ?? new Response('Not Implemented', { status: 501 });
					}
				};

				return hooks;
			}
		} catch (e) {
			console.error(e);

			return noHooks;
		}

		return noHooks;
	};
}
