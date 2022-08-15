import { LoadURL, PrerenderingURL } from '../../../utils/url.js';

/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('types').RequestEvent;
 *   node: import('types').SSRNode | undefined;
 *   parent: () => Promise<import('types').JSONObject | null>;
 * }} opts
 */
export async function load_server_data({ event, node, parent }) {
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

	return server_data ? unwrap_promises(server_data) : null;
}

/**
 * Calls the user's `load` function.
 * @param {{
 *   $session: Record<string, any>;
 *   event: import('types').RequestEvent;
 *   fetcher: typeof fetch;
 *   node: import('types').SSRNode | undefined;
 *   options: import('types').SSROptions;
 *   parent: () => Promise<Record<string, any>>;
 *   server_data_promise: Promise<import('types').JSONObject | null>;
 *   state: import('types').SSRState;
 * }} opts
 */
export async function load_data({
	$session,
	event,
	fetcher,
	node,
	options,
	parent,
	server_data_promise,
	state
}) {
	const server_data = await server_data_promise;

	if (!node?.shared?.load) {
		return server_data;
	}

	const data = await node.shared.load.call(null, {
		url: state.prerendering ? new PrerenderingURL(event.url) : new LoadURL(event.url),
		params: event.params,
		data: server_data,
		routeId: event.routeId,
		get session() {
			if (node.shared.prerender ?? options.prerender.default) {
				throw Error(
					'Attempted to access session from a prerendered page. Session would never be populated.'
				);
			}
			return $session;
		},
		fetch: fetcher,
		setHeaders: event.setHeaders,
		depends: () => {},
		parent
	});

	return data ? unwrap_promises(data) : null;
}

/** @param {Record<string, any>} object */
async function unwrap_promises(object) {
	/** @type {import('types').JSONObject} */
	const unwrapped = {};

	for (const key in object) {
		unwrapped[key] = await object[key];
	}

	return unwrapped;
}
