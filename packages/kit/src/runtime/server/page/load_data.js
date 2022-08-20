import { LoadURL, PrerenderingURL } from '../../../utils/url.js';

/**
 * Calls the user's `load` function.
 * @param {{
 *   dev: boolean;
 *   event: import('types').RequestEvent;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 * }} opts
 */
export async function load_server_data({ dev, event, node, parent }) {
	if (!node?.server) return null;

	const server_data = await node.server.load?.call(null, {
		// can't use destructuring here because it will always
		// invoke event.clientAddress, which breaks prerendering
		get clientAddress() {
			return event.clientAddress;
		},
		locals: event.locals,
		params: event.params,
		parent,
		platform: event.platform,
		request: event.request,
		routeId: event.routeId,
		setHeaders: event.setHeaders,
		url: event.url
	});

	const result = server_data ? await unwrap_promises(server_data) : null;

	if (dev) {
		check_serializability(result, /** @type {string} */ (node.server_id), 'data');
	}

	return result;
}

/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('types').RequestEvent;
 *   fetcher: typeof fetch;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 *   server_data_promise: Promise<Record<string, any> | null>;
 *   state: import('types').SSRState;
 * }} opts
 */
export async function load_data({ event, fetcher, node, parent, server_data_promise, state }) {
	const server_data = await server_data_promise;

	if (!node?.shared?.load) {
		return server_data;
	}

	const load_input = {
		url: state.prerendering ? new PrerenderingURL(event.url) : new LoadURL(event.url),
		params: event.params,
		data: server_data,
		routeId: event.routeId,
		fetch: fetcher,
		setHeaders: event.setHeaders,
		depends: () => {},
		parent
	};

	// TODO remove this for 1.0
	Object.defineProperties(load_input, {
		session: {
			get() {
				throw new Error(
					'session is no longer available. See https://github.com/sveltejs/kit/discussions/5883'
				);
			},
			enumerable: false
		}
	});

	const data = await node.shared.load.call(null, load_input);

	return data ? unwrap_promises(data) : null;
}

/** @param {Record<string, any>} object */
async function unwrap_promises(object) {
	/** @type {Record<string, any>} */
	const unwrapped = {};

	for (const key in object) {
		unwrapped[key] = await object[key];
	}

	return unwrapped;
}

/**
 * Check that the data can safely be serialized to JSON
 * @param {any} value
 * @param {string} id
 * @param {string} path
 */
function check_serializability(value, id, path) {
	const type = typeof value;

	if (type === 'string' || type === 'boolean' || type === 'number' || type === 'undefined') {
		// primitives are fine
		return;
	}

	if (type === 'object') {
		// nulls are fine...
		if (!value) return;

		// ...so are plain arrays...
		if (Array.isArray(value)) {
			value.forEach((child, i) => {
				check_serializability(child, id, `${path}[${i}]`);
			});
			return;
		}

		// ...and objects
		const tag = Object.prototype.toString.call(value);
		if (tag === '[object Object]') {
			for (const key in value) {
				check_serializability(value[key], id, `${path}.${key}`);
			}
			return;
		}
	}

	throw new Error(`${path} returned from 'load' in ${id} cannot be serialized as JSON`);
}
