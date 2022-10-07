import { disable_search, make_trackable } from '../../../utils/url.js';
import { unwrap_promises } from '../../../utils/promises.js';
/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('types').RequestEvent;
 *   state: import('types').SSRState;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 * }} opts
 * @returns {Promise<import('types').ServerDataNode | null>}
 */
export async function load_server_data({ event, state, node, parent }) {
	if (!node?.server) return null;

	const uses = {
		dependencies: new Set(),
		params: new Set(),
		parent: false,
		url: false
	};

	const url = make_trackable(event.url, () => {
		uses.url = true;
	});

	if (state.prerendering) {
		disable_search(url);
	}

	const result = await node.server.load?.call(null, {
		...event,
		/** @param {string[]} deps */
		depends: (...deps) => {
			for (const dep of deps) {
				const { href } = new URL(dep, event.url);
				uses.dependencies.add(href);
			}
		},
		params: new Proxy(event.params, {
			get: (target, key) => {
				uses.params.add(key);
				return target[/** @type {string} */ (key)];
			}
		}),
		parent: async () => {
			uses.parent = true;
			return parent();
		},
		url
	});

	const data = result ? await unwrap_promises(result) : null;

	return {
		type: 'data',
		data,
		uses: {
			dependencies: uses.dependencies.size > 0 ? Array.from(uses.dependencies) : undefined,
			params: uses.params.size > 0 ? Array.from(uses.params) : undefined,
			parent: uses.parent ? 1 : undefined,
			url: uses.url ? 1 : undefined
		}
	};
}

/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('types').RequestEvent;
 *   fetched: import('./types').Fetched[];
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 *   resolve_opts: import('types').RequiredResolveOptions;
 *   server_data_promise: Promise<import('types').ServerDataNode | null>;
 *   state: import('types').SSRState;
 * }} opts
 * @returns {Promise<Record<string, any> | null>}
 */
export async function load_data({
	event,
	fetched,
	node,
	parent,
	server_data_promise,
	state,
	resolve_opts
}) {
	const server_data_node = await server_data_promise;

	if (!node?.shared?.load) {
		return server_data_node?.data ?? null;
	}

	/** @type {import('types').LoadEvent} */
	const load_event = {
		url: event.url,
		params: event.params,
		data: server_data_node?.data ?? null,
		routeId: event.routeId,
		fetch: async (input, init) => {
			const response = await event.fetch(input, init);

			const url = new URL(input instanceof Request ? input.url : input, event.url);
			const same_origin = url.origin === event.url.origin;

			const request_body = init?.body;
			const dependency = same_origin && state.prerendering?.dependencies.get(url.pathname);

			const proxy = new Proxy(response, {
				get(response, key, _receiver) {
					async function text() {
						const body = await response.text();

						if (!body || typeof body === 'string') {
							const status_number = Number(response.status);
							if (isNaN(status_number)) {
								throw new Error(
									`response.status is not a number. value: "${
										response.status
									}" type: ${typeof response.status}`
								);
							}

							fetched.push({
								url: same_origin ? url.href.slice(event.url.origin.length) : url.href,
								method: event.request.method,
								request_body: /** @type {string | ArrayBufferView | undefined} */ (request_body),
								response_body: body,
								response: response
							});

							// ensure that excluded headers can't be read
							const get = response.headers.get;
							response.headers.get = (key) => {
								const lower = key.toLowerCase();
								const value = get.call(response.headers, lower);
								if (value && !lower.startsWith('x-sveltekit-')) {
									const included = resolve_opts.filterSerializedResponseHeaders(lower, value);
									if (!included) {
										throw new Error(
											`Failed to get response header "${lower}" — it must be included by the \`filterSerializedResponseHeaders\` option: https://kit.svelte.dev/docs/hooks#server-hooks-handle`
										);
									}
								}

								return value;
							};
						}

						if (dependency) {
							dependency.body = body;
						}

						return body;
					}

					if (key === 'arrayBuffer') {
						return async () => {
							const buffer = await response.arrayBuffer();

							if (dependency) {
								dependency.body = new Uint8Array(buffer);
							}

							// TODO should buffer be inlined into the page (albeit base64'd)?
							// any conditions in which it shouldn't be?

							return buffer;
						};
					}

					if (key === 'text') {
						return text;
					}

					if (key === 'json') {
						return async () => {
							return JSON.parse(await text());
						};
					}

					// TODO arrayBuffer?

					return Reflect.get(response, key, response);
				}
			});

			return proxy;
		},
		setHeaders: event.setHeaders,
		depends: () => {},
		parent
	};

	// TODO remove this for 1.0
	Object.defineProperties(load_event, {
		session: {
			get() {
				throw new Error(
					'session is no longer available. See https://github.com/sveltejs/kit/discussions/5883'
				);
			},
			enumerable: false
		}
	});

	const data = await node.shared.load.call(null, load_event);

	return data ? unwrap_promises(data) : null;
}
