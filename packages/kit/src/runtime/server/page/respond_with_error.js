import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { GENERIC_ERROR } from '../utils.js';
import { create_fetch } from './fetch.js';

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
	const { fetcher, fetched } = create_fetch({ event, options, state, route: GENERIC_ERROR });

	try {
		const branch = [];

		if (resolve_opts.ssr) {
			const default_layout = await options.manifest._.nodes[0](); // 0 is always the root layout
			const default_error = await options.manifest._.nodes[1](); // 1 is always the root error

			const layout_loaded = /** @type {Loaded} */ (
				await load_node({
					event,
					options,
					state,
					node: default_layout,
					$session,
					fetcher
				})
			);

			const error_loaded = /** @type {Loaded} */ ({
				node: default_error,
				data: {},
				server_data: {}
			});

			branch.push(layout_loaded, error_loaded);
		}

		return await render_response({
			options,
			state,
			$session,
			page_config: {
				hydrate: options.hydrate,
				router: options.router
			},
			status,
			error,
			branch,
			fetched,
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
