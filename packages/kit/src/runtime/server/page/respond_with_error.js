import { render_response } from './render.js';
import { load_data, load_server_data } from './load_data.js';
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
 *   status: number;
 *   error: Error;
 *   resolve_opts: import('types').RequiredResolveOptions;
 * }} opts
 */
export async function respond_with_error({ event, options, state, status, error, resolve_opts }) {
	const { fetcher, fetched, cookies } = create_fetch({
		event,
		options,
		state,
		route: GENERIC_ERROR
	});

	try {
		const branch = [];

		if (resolve_opts.ssr) {
			const default_layout = await options.manifest._.nodes[0](); // 0 is always the root layout

			const server_data_promise = load_server_data({
				dev: options.dev,
				event,
				node: default_layout,
				parent: async () => ({})
			});

			const server_data = await server_data_promise;

			const data = await load_data({
				event,
				fetcher,
				node: default_layout,
				parent: async () => ({}),
				server_data_promise,
				state
			});

			branch.push(
				{
					node: default_layout,
					server_data,
					data
				},
				{
					node: await options.manifest._.nodes[1](), // 1 is always the root error
					data: null,
					server_data: null
				}
			);
		}

		return await render_response({
			options,
			state,
			page_config: {
				hydrate: options.hydrate,
				router: options.router
			},
			status,
			error,
			branch,
			fetched,
			cookies,
			event,
			resolve_opts,
			validation_errors: undefined
		});
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, event);

		return new Response(error.stack, {
			status: 500
		});
	}
}
