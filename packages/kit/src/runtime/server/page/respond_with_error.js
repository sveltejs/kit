import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { coalesce_to_error, resolve_option } from '../utils.js';

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   options: import('types/internal').SSRRenderOptions;
 *   state: import('types/internal').SSRRenderState;
 *   $session: any;
 *   status: number;
 *   error: Error;
 * }} opts
 */
export async function respond_with_error({ request, options, state, $session, status, error }) {
	const default_layout = await options.load_component(options.manifest.layout);
	const default_error = await options.load_component(options.manifest.error);

	const page = {
		host: request.host,
		path: request.path,
		query: request.query,
		params: {}
	};

	// error pages don't fall through, so we know it's not undefined
	const loaded = /** @type {import('./types').Loaded} */ (await load_node({
		request,
		options,
		state,
		route: null,
		page,
		node: default_layout,
		$session,
		context: {},
		is_leaf: false,
		is_error: false
	}));

	const branch = [
		loaded,
		/** @type {import('./types').Loaded} */ (await load_node({
			request,
			options,
			state,
			route: null,
			page,
			node: default_error,
			$session,
			context: loaded ? loaded.context : {},
			is_leaf: false,
			is_error: true,
			status,
			error
		}))
	];

	const leaf_promise = async () => branch[branch.length - 1].node.module;

	const page_config = {
		ssr: await resolve_option(options.ssr, { request, page: leaf_promise }),
		router: await resolve_option(options.router, { request, page: leaf_promise }),
		hydrate: await resolve_option(options.hydrate, { request, page: leaf_promise }),
		prerender: await resolve_option(options.prerender, { request, page: leaf_promise })
	};

	try {
		return await render_response({
			options,
			$session,
			page_config,
			status,
			error,
			branch,
			page
		});
	} catch (/** @type {unknown} */ err) {
		const error = coalesce_to_error(err);

		options.handle_error(error);

		return {
			status: 500,
			headers: {},
			body: error.stack
		};
	}
}
