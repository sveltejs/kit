import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types').SSROptions} SSROptions
 * @typedef {import('types').SSRState} SSRState
 */

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: SSROptions;
 *   state: SSRState;
 *   $session: any;
 *   status: number;
 *   error: Error;
 *   resolve_opts: import('types').RequiredResolveOptions;
 * }} opts
 */
export async function respond_with_error({
	event,
	options,
	state,
	$session,
	status,
	error,
	resolve_opts
}) {
	try {
		const default_layout = await options.manifest._.nodes[0](); // 0 is always the root layout
		const default_error = await options.manifest._.nodes[1](); // 1 is always the root error

		const layout_loaded = /** @type {Loaded} */ (
			await load_node({
				event,
				options,
				state,
				route: null,
				node: default_layout,
				$session,
				stuff: {},
				is_error: false,
				is_leaf: false
			})
		);

		const error_loaded = /** @type {Loaded} */ (
			await load_node({
				event,
				options,
				state,
				route: null,
				node: default_error,
				$session,
				stuff: layout_loaded ? layout_loaded.stuff : {},
				is_error: true,
				is_leaf: false,
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
			event,
			resolve_opts
		});
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, event);

		return new Response(error.stack, {
			status: 500
		});
	}
}
