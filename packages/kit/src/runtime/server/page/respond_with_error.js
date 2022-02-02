import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types/internal').SSROptions} SSROptions
 * @typedef {import('types/internal').SSRState} SSRState
 */

/**
 * @param {{
 *   event: import('types/hooks').RequestEvent;
 *   options: SSROptions;
 *   state: SSRState;
 *   $session: any;
 *   status: number;
 *   error: Error;
 *   ssr: boolean;
 * }} opts
 */
export async function respond_with_error({ event, options, state, $session, status, error, ssr }) {
	try {
		const default_layout = await options.manifest._.nodes[0](); // 0 is always the root layout
		const default_error = await options.manifest._.nodes[1](); // 1 is always the root error

		/** @type {Record<string, string>} */
		const params = {}; // error page has no params

		const layout_loaded = /** @type {Loaded} */ (
			await load_node({
				event,
				options,
				state,
				route: null,
				url: event.url, // TODO this is redundant, no?
				params,
				node: default_layout,
				$session,
				stuff: {},
				is_error: false
			})
		);

		const error_loaded = /** @type {Loaded} */ (
			await load_node({
				event,
				options,
				state,
				route: null,
				url: event.url,
				params,
				node: default_error,
				$session,
				stuff: layout_loaded ? layout_loaded.stuff : {},
				is_error: true,
				status,
				error
			})
		);

		return await render_response({
			options,
			state,
			$session,
			page_config: {
				hydrate: options.hydrate,
				router: options.router
			},
			stuff: error_loaded.stuff,
			status,
			error,
			branch: [layout_loaded, error_loaded],
			url: event.url,
			params,
			ssr
		});
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, event);

		return new Response(error.stack, {
			status: 500
		});
	}
}
