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
export async function load_node({ event, options, state, node, fetcher, $session }) {
	/** @type {Record<string, any>} */
	let server_data;

	if (node.server) {
		const should_prerender = node.module?.prerender ?? options.prerender.default;
		const mod = node.server;

		if (should_prerender && (mod.POST || mod.PUT || mod.DELETE || mod.PATCH)) {
			throw new Error('Cannot prerender pages that have endpoints with mutative methods');
		}

		// TODO unwrap top-level promises
		server_data = await mod.GET.call(null, event);
	} else {
		server_data = {};
	}

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

		if (options.dev) {
			// TODO remove this for 1.0
			Object.defineProperty(load_event, 'page', {
				get: () => {
					throw new Error('`page` in `load` functions has been replaced by `url` and `params`');
				}
			});
		}

		// TODO unwrap top-level promises
		data = await node.module.load.call(null, load_event);
	}

	return {
		node,
		data,
		server_data // we return this separately so it can be serialized into the page
	};
}
