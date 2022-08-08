import { LoadURL, PrerenderingURL } from '../../../utils/url.js';

/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   node: import('types').SSRNode;
 *   fetcher: typeof fetch;
 *   $session: any;
 * }} opts
 * @returns {Promise<import('./types').Loaded>}
 */
export async function load_data({ event, options, state, node, fetcher, $session }) {
	/** @type {Record<string, any> | null} */
	const server_data = node.server?.GET?.call(null, event) ?? null; // TODO unwrap top-level promises

	let data = server_data;

	if (node.module?.load) {
		/** @type {import('types').LoadEvent} */
		const load_event = {
			url: state.prerendering ? new PrerenderingURL(event.url) : new LoadURL(event.url),
			params: event.params,
			data: server_data,
			routeId: event.routeId,
			get session() {
				if (node.module.prerender ?? options.prerender.default) {
					throw Error(
						'Attempted to access session from a prerendered page. Session would never be populated.'
					);
				}
				return $session;
			},
			fetch: fetcher,
			setHeaders: event.setHeaders
		};

		// TODO unwrap top-level promises
		data = (await node.module.load.call(null, load_event)) ?? null;
	}

	return {
		node,
		data,
		server_data // we return this separately so it can be serialized into the page
	};
}
