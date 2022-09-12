import { render_response } from './render.js';
import { load_data, load_server_data } from './load_data.js';
import {
	handle_error_and_jsonify,
	GENERIC_ERROR,
	get_option,
	static_error_page
} from '../utils.js';
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
 *   error: unknown;
 *   resolve_opts: import('types').RequiredResolveOptions;
 * }} opts
 */
export async function respond_with_error({ event, options, state, status, error, resolve_opts }) {
	const { fetcher, fetched, cookies } = create_fetch({
		event,
		options,
		state,
		route: GENERIC_ERROR,
		resolve_opts
	});

	try {
		const branch = [];
		const default_layout = await options.manifest._.nodes[0](); // 0 is always the root layout
		const ssr = get_option([default_layout], 'ssr') ?? true;

		if (ssr) {
			const server_data_promise = load_server_data({
				event,
				state,
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
				ssr,
				csr: get_option([default_layout], 'csr') ?? true
			},
			status,
			error: handle_error_and_jsonify(event, options, error),
			branch,
			fetched,
			cookies,
			event,
			resolve_opts
		});
	} catch (error) {
		return static_error_page(options, 500, handle_error_and_jsonify(event, options, error).message);
	}
}
