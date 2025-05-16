import { DEV } from 'esm-env';
import { make_trackable } from '../../../utils/url.js';
import { b64_encode } from '../../utils.js';
import * as devalue from 'devalue';
import { HttpError } from '../../control.js';
import { INVALIDATED_PARAM, TRAILING_SLASH_PARAM } from '../../shared.js';
import { add_data_suffix } from '../../pathname.js';

/** @type {Array<((url: URL) => boolean)>} */
const invalidated = [];

/**
 * Calls the user's server `load` function.
 * @param {{
 *   event: import('types').SWRequestEvent;
 *   node: import('types').SWRNode | undefined;
 * }} opts
 * @returns {Promise<import('types').ServerDataNode | null>}
 */
export async function load_server_data({ event, node }) {
	if (!node?.server) return null;

	const uses = {
		dependencies: new Set(),
		params: new Set(),
		parent: false,
		route: false,
		url: false,
		search_params: new Set()
	};

	const load = node.server.load;
	const slash = node.server.trailingSlash;

	if (!load) {
		return { type: 'data', data: null, uses, slash };
	}

	const url = make_trackable(
		event.url,
		() => {
			if (DEV && done && !uses.url) {
				console.warn(
					`${node.server_id}: Accessing URL properties in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the URL changes`
				);
			}

			uses.url = true;
		},
		(param) => {
			if (DEV && done && !uses.search_params.has(param)) {
				console.warn(
					`${node.server_id}: Accessing URL properties in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the URL changes`
				);
			}

			uses.search_params.add(param);
		}
	);

	/** @type {import('../../client/types.js').NavigationState} */
	const current = {
		branch: [],
		error: null,
		// @ts-ignore - we need the initial value to be null
		url: null
	};

	const {  layouts, leaf } = route;

	const loaders = [...layouts, leaf];

	const url_changed = current.url ? id !== get_page_key(current.url) : false;
	const route_changed = current.route ? route.id !== current.route.id : false;
	const search_params_changed = diff_search_params(current.url, url);

	let parent_invalid = false;
	const invalid_server_nodes = loaders.map((loader, i) => {
		const previous = current.branch[i];

		const invalid =
			!!loader?.[0] &&
			(previous?.loader !== loader[1] ||
				has_changed(
					parent_invalid,
					route_changed,
					url_changed,
					search_params_changed,
					previous.server?.uses,
					event.params,
					event
				));

		if (invalid) {
			// For the next one
			parent_invalid = true;
		}

		return invalid;
	});

	const invalid = invalid_server_nodes;

	const done = false;
	const data_url = new URL(event.url);
	data_url.pathname = add_data_suffix(event.url.pathname);
	if (url.pathname.endsWith('/')) {
		data_url.searchParams.append(TRAILING_SLASH_PARAM, '1');
	}
	if (DEV && url.searchParams.has(INVALIDATED_PARAM)) {
		throw new Error(`Cannot used reserved query parameter "${INVALIDATED_PARAM}"`);
	}
	data_url.searchParams.append(INVALIDATED_PARAM, invalid.map((i) => (i ? '1' : '0')).join(''));

	// use self.fetch directly to allow using a 3rd party-patched fetch implementation
	const fetcher = self.fetch;
	const res = await fetcher(data_url.href, {});

	if (!res.ok) {
		// error message is a JSON-stringified string which devalue can't handle at the top level
		// turn it into a HttpError to not call handleError on the client again (was already handled on the server)
		// if `__data.json` doesn't exist or the server has an internal error,
		// avoid parsing the HTML error page as a JSON
		/** @type {string | undefined} */
		let message;
		if (res.headers.get('content-type')?.includes('application/json')) {
			message = await res.json();
		} else if (res.status === 404) {
			message = 'Not Found';
		} else if (res.status === 500) {
			message = 'Internal Error';
		}
		throw new HttpError(res.status, message);
	}

	// TODO: fix eslint error / figure out if it actually applies to our situation
	// eslint-disable-next-line
	return new Promise(async (resolve) => {
		/**
		 * Map of deferred promises that will be resolved by a subsequent chunk of data
		 * @type {Map<string, import('types').Deferred>}
		 */
		const deferreds = new Map();
		const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();
		const decoder = new TextDecoder();

		/**
		 * @param {any} data
		 */
		function deserialize(data) {
			return devalue.unflatten(data, {
				...app.decoders,
				Promise: (id) => {
					return new Promise((fulfil, reject) => {
						deferreds.set(id, { fulfil, reject });
					});
				}
			});
		}

		let text = '';

		while (true) {
			// Format follows ndjson (each line is a JSON object) or regular JSON spec
			const { done, value } = await reader.read();
			if (done && !text) break;

			text += !value && text ? '\n' : decoder.decode(value, { stream: true }); // no value -> final chunk -> add a new line to trigger the last parse

			while (true) {
				const split = text.indexOf('\n');
				if (split === -1) {
					break;
				}

				const node = JSON.parse(text.slice(0, split));
				text = text.slice(split + 1);

				if (node.type === 'redirect') {
					return resolve(node);
				}

				if (node.type === 'data') {
					// This is the first (and possibly only, if no pending promises) chunk
					node.nodes?.forEach((/** @type {any} */ node) => {
						if (node?.type === 'data') {
							node.uses = deserialize_uses(node.uses);
							node.data = deserialize(node.data);
						}
					});

					resolve(node);
				} else if (node.type === 'chunk') {
					// This is a subsequent chunk containing deferred data
					const { id, data, error } = node;
					const deferred = /** @type {import('types').Deferred} */ (deferreds.get(id));
					deferreds.delete(id);

					if (error) {
						deferred.reject(deserialize(error));
					} else {
						deferred.fulfil(deserialize(data));
					}
				}
			}
		}
	});
}

/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('types').SWRequestEvent;
 *   fetched: import('./types.js').Fetched[];
 *   node: import('types').SWRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 *   resolve_opts: import('types').RequiredResolveOptions;
 *   server_data_promise: Promise<import('types').ServerDataNode | null>;
 *   csr: boolean;
 * }} opts
 * @returns {Promise<Record<string, any | Promise<any>> | null>}
 */
export async function load_data({
	event,
	fetched,
	node,
	parent,
	server_data_promise,
	resolve_opts,
	csr
}) {
	const server_data_node = await server_data_promise;

	if (!node?.universal?.load) {
		return server_data_node?.data ?? null;
	}

	const result = await node.universal.load.call(null, {
		url: event.url,
		params: event.params,
		data: server_data_node?.data ?? null,
		route: event.route,
		fetch: create_universal_fetch(event, fetched, csr, resolve_opts),
		setHeaders: event.setHeaders,
		depends: () => {},
		parent,
		untrack: (fn) => fn()
	});

	if (__SVELTEKIT_DEV__) {
		validate_load_response(result, node.universal_id);
	}

	return result ?? null;
}

/**
 * @param {Pick<import('types').SWRequestEvent, 'fetch' | 'url' | 'request' | 'route'>} event
 * @param {import('./types.js').Fetched[]} fetched
 * @param {boolean} csr
 * @param {Pick<Required<import('@sveltejs/kit').ResolveOptions>, 'filterSerializedResponseHeaders'>} resolve_opts
 * @returns {typeof fetch}
 */
export function create_universal_fetch(event, fetched, csr, resolve_opts) {
	/**
	 * @param {URL | RequestInfo} input
	 * @param {RequestInit} [init]
	 */
	const universal_fetch = async (input, init) => {
		const cloned_body = input instanceof Request && input.body ? input.clone().body : null;

		const cloned_headers =
			input instanceof Request && [...input.headers].length
				? new Headers(input.headers)
				: init?.headers;

		let response = await event.fetch(input, init);

		const url = new URL(input instanceof Request ? input.url : input, event.url);
		const same_origin = url.origin === event.url.origin;

		if (!same_origin && (url.protocol === 'https:' || url.protocol === 'http:')) {
			// simulate CORS errors and "no access to body in no-cors mode" server-side for consistency with client-side behaviour
			const mode = input instanceof Request ? input.mode : (init?.mode ?? 'cors');
			if (mode === 'no-cors') {
				response = new Response('', {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers
				});
			} else {
				const acao = response.headers.get('access-control-allow-origin');
				if (!acao || (acao !== event.url.origin && acao !== '*')) {
					throw new Error(
						`CORS error: ${
							acao ? 'Incorrect' : 'No'
						} 'Access-Control-Allow-Origin' header is present on the requested resource`
					);
				}
			}
		}

		const proxy = new Proxy(response, {
			get(response, key, _receiver) {
				/**
				 * @param {string} body
				 * @param {boolean} is_b64
				 */
				async function push_fetched(body, is_b64) {
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
						request_body: /** @type {string | ArrayBufferView | undefined} */ (
							input instanceof Request && cloned_body
								? await stream_to_string(cloned_body)
								: init?.body
						),
						request_headers: cloned_headers,
						response_body: body,
						response,
						is_b64
					});
				}

				if (key === 'arrayBuffer') {
					return async () => {
						const buffer = await response.arrayBuffer();

						if (buffer instanceof ArrayBuffer) {
							await push_fetched(b64_encode(buffer), true);
						}

						return buffer;
					};
				}

				async function text() {
					const body = await response.text();

					if (!body || typeof body === 'string') {
						await push_fetched(body, false);
					}

					return body;
				}

				if (key === 'text') {
					return text;
				}

				if (key === 'json') {
					return async () => {
						return JSON.parse(await text());
					};
				}

				return Reflect.get(response, key, response);
			}
		});

		if (csr) {
			// ensure that excluded headers can't be read
			const get = response.headers.get;
			response.headers.get = (key) => {
				const lower = key.toLowerCase();
				const value = get.call(response.headers, lower);
				if (value && !lower.startsWith('x-sveltekit-')) {
					const included = resolve_opts.filterSerializedResponseHeaders(lower, value);
					if (!included) {
						throw new Error(
							`Failed to get response header "${lower}" — it must be included by the \`filterSerializedResponseHeaders\` option: https://svelte.dev/docs/kit/hooks#Server-hooks-handle (at ${event.route.id})`
						);
					}
				}

				return value;
			};
		}

		return proxy;
	};

	// Don't make this function `async`! Otherwise, the user has to `catch` promises they use for streaming responses or else
	// it will be an unhandled rejection. Instead, we add a `.catch(() => {})` ourselves below to this from happening.
	return (input, init) => {
		// See docs in fetch.js for why we need to do this
		const response = universal_fetch(input, init);
		response.catch(() => {});
		return response;
	};
}

/**
 * @param {ReadableStream<Uint8Array>} stream
 */
async function stream_to_string(stream) {
	let result = '';
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		result += decoder.decode(value);
	}
	return result;
}

/**
 * @param {any} data
 * @param {string} [id]
 */
function validate_load_response(data, id) {
	if (data != null && Object.getPrototypeOf(data) !== Object.prototype) {
		throw new Error(
			`a load function in ${id} returned ${
				typeof data !== 'object'
					? `a ${typeof data}`
					: data instanceof Response
						? 'a Response object'
						: Array.isArray(data)
							? 'an array'
							: 'a non-plain object'
			}, but must return a plain object at the top level (i.e. \`return {...}\`)`
		);
	}
}

/**
 * @param {any} uses
 * @return {import('types').Uses}
 */
function deserialize_uses(uses) {
	return {
		dependencies: new Set(uses?.dependencies ?? []),
		params: new Set(uses?.params ?? []),
		parent: !!uses?.parent,
		route: !!uses?.route,
		url: !!uses?.url,
		search_params: new Set(uses?.search_params ?? [])
	};
}

/**
 * @param {boolean} parent_changed
 * @param {boolean} route_changed
 * @param {boolean} url_changed
 * @param {Set<string>} search_params_changed
 * @param {import('types').Uses | undefined} uses
 * @param {Record<string, string>} params
 * @param {import('types').SWRequestEvent} current
 */
function has_changed(
	parent_changed,
	route_changed,
	url_changed,
	search_params_changed,
	uses,
	params,
	current
) {
	if (!uses) return false;

	if (uses.parent && parent_changed) return true;
	if (uses.route && route_changed) return true;
	if (uses.url && url_changed) return true;

	for (const tracked_params of uses.search_params) {
		if (search_params_changed.has(tracked_params)) return true;
	}

	for (const param of uses.params) {
		if (params[param] !== current.params[param]) return true;
	}

	for (const href of uses.dependencies) {
		if (invalidated.some((fn) => fn(new URL(href)))) return true;
	}

	return false;
}

/**
 * @param {URL | null} old_url
 * @param {URL} new_url
 */
function diff_search_params(old_url, new_url) {
	if (!old_url) return new Set(new_url.searchParams.keys());

	const changed = new Set([...old_url.searchParams.keys(), ...new_url.searchParams.keys()]);

	for (const key of changed) {
		const old_values = old_url.searchParams.getAll(key);
		const new_values = new_url.searchParams.getAll(key);

		if (
			old_values.every((value) => new_values.includes(value)) &&
			new_values.every((value) => old_values.includes(value))
		) {
			changed.delete(key);
		}
	}

	return changed;
}
