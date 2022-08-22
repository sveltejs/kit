import { LoadURL, PrerenderingURL } from '../../../utils/url.js';

/**
 * Calls the user's `load` function.
 * @param {{
 *   dev: boolean;
 *   event: import('types').RequestEvent;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 * }} opts
 * @returns {Promise<import('types').ServerDataNode | null>}
 */
export async function load_server_data({ dev, event, node, parent }) {
	if (!node?.server) return null;

	const uses = {
		dependencies: new Set(),
		params: new Set(),
		parent: false,
		url: false
	};

	/** @param {string[]} deps */
	function depends(...deps) {
		for (const dep of deps) {
			const { href } = new URL(dep, event.url);
			uses.dependencies.add(href);
		}
	}

	const params = new Proxy(event.params, {
		get: (target, key) => {
			uses.params.add(key);
			return target[/** @type {string} */ (key)];
		}
	});

	const result = await node.server.load?.call(null, {
		// can't use destructuring here because it will always
		// invoke event.clientAddress, which breaks prerendering
		get clientAddress() {
			return event.clientAddress;
		},
		depends,
		locals: event.locals,
		params,
		parent: async () => {
			uses.parent = true;
			return parent();
		},
		platform: event.platform,
		request: event.request,
		routeId: event.routeId,
		setHeaders: event.setHeaders,
		url: event.url
	});

	const data = result ? await unwrap_promises(result) : null;

	if (dev) {
		check_serializability(data, /** @type {string} */ (node.server_id), 'data');
	}

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
 *   fetcher: typeof fetch;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 *   server_data_promise: Promise<import('types').ServerDataNode | null>;
 *   state: import('types').SSRState;
 * }} opts
 * @returns {Promise<Record<string, any> | null>}
 */
export async function load_data({ event, fetcher, node, parent, server_data_promise, state }) {
	const server_data_node = await server_data_promise;

	if (!node?.shared?.load) {
		return server_data_node?.data ?? null;
	}

	const load_input = {
		url: state.prerendering ? new PrerenderingURL(event.url) : new LoadURL(event.url),
		params: event.params,
		data: server_data_node?.data ?? null,
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
