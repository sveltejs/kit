import { disable_search, make_trackable } from '../../../utils/url.js';

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
 *   fetcher: typeof fetch;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 *   server_data_promise: Promise<import('types').ServerDataNode | null>;
 *   state: import('types').SSRState;
 * }} opts
 * @returns {Promise<Record<string, any> | null>}
 */
export async function load_data({ event, fetcher, node, parent, server_data_promise }) {
	const server_data_node = await server_data_promise;

	if (!node?.shared?.load) {
		return server_data_node?.data ?? null;
	}

	const load_event = {
		url: event.url,
		params: event.params,
		data: server_data_node?.data ?? null,
		routeId: event.routeId,
		fetch: fetcher,
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

/** @param {Record<string, any>} object */
async function unwrap_promises(object) {
	/** @type {Record<string, any>} */
	const unwrapped = {};

	for (const key in object) {
		unwrapped[key] = await object[key];
	}

	return unwrapped;
}
