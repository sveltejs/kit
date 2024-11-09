import { BROWSER, DEV } from 'esm-env';
import { validate_server_exports } from '../../utils/exports.js';
import { exec } from '../../utils/routing.js';
import { decode_pathname, decode_params } from '../../utils/url.js';
import { base } from '__sveltekit/paths';

/**
 * @param {import('types').SSROptions} options
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @param {import('types').SSRState} state
 * @returns {(info: Request | import('crossws').Peer) => import('types').MaybePromise<Partial<import('crossws').Hooks>>}
 */
export function resolve(options, manifest, state) {
	return async (info) => {
		/** @type {Request} */
		let request;

		// These types all need to be straightened out
		if (info.request) {
			request = info.request;
		} else {
			request = info;
		}

		/** URL but stripped from the potential `/__data.json` suffix and its search param  */
		const url = new URL(request.url);

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
			return {};
		}

		/** @type {Record<string, string>} */
		const headers = {};

		try {
			// determine whether we need to redirect to add/remove a trailing slash
			if (route && route.endpoint) {
				// if `paths.base === '/a/b/c`, then the root route is `/a/b/c/`,
				// regardless of the `trailingSlash` route option

				const node = await route.endpoint();

				if (DEV) {
					validate_server_exports(node, /** @type {string} */ (route.endpoint_id));
				}

				return {
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
							request: req,
							socket: {
								/**
								 * Accept a WebSocket Upgrade request
								 * @param {RequestInit} init
								 * @returns {RequestInit}
								 */
								accept: (init) => {
									return { ...init };
								},
								/**
								 * Reject a WebSocket Upgrade request
								 * @param {number} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses). Must be in the range 400-599.
								 * @param {{ message: string } extends App.Error ? App.Error | string | undefined : never} body An object that conforms to the App.Error type. If a string is passed, it will be used as the message property.
								 * @return {Response} A Response object
								 * @throws {Error} If the provided status is invalid (not between 400 and 599).
								 */
								reject: (status, body) => {
									if ((!BROWSER || DEV) && (isNaN(status) || status < 400 || status > 599)) {
										throw new Error(
											`HTTP error status codes must be between 400 and 599 — ${status} is invalid`
										);
									}

									try {
										const jsonBody = JSON.stringify(body);
										return new Response(jsonBody, {
											status,
											headers: {
												'content-type': 'application/json'
											}
										});
									} catch (e) {
										console.error(e);
										throw new Error('Failed to serialize error body');
									}
								}
							},
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
							resolve: async (event) => {
								if (node.socket && node.socket.upgrade) {
									return await node.socket.upgrade(event.request);
								} else {
									return new Response('Not Implemented', { status: 501 });
								}
							}
						});

						return response ?? new Response('Not Implemented', { status: 501 });
					}
				};
			}
		} catch (e) {
			console.error(e);
			return {};
		}
	};
}
