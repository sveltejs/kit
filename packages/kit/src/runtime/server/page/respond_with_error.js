import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types/internal').SSRNode} SSRNode
 * @typedef {import('types/internal').SSRRenderOptions} SSRRenderOptions
 * @typedef {import('types/internal').SSRRenderState} SSRRenderState
 */

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   loader: import('types/internal').ComponentLoader;
 *   options: SSRRenderOptions;
 *   state: SSRRenderState;
 *   $session: any;
 *   status: number;
 *   error: Error;
 * }} opts
 */
export async function respond_with_error({
	request,
	loader,
	options,
	state,
	$session,
	status,
	error
}) {
	const default_layout = await loader.loadComponent({ id: options.manifest.layout });
	const default_error = await loader.loadComponent({ id: options.manifest.error });

	const page = {
		host: request.host,
		path: request.path,
		query: request.query,
		params: {}
	};

	// error pages don't fall through, so we know it's not undefined
	const loaded = /** @type {Loaded} */ (
		await load_node({
			request,
			loader,
			options,
			state,
			route: null,
			page,
			node: default_layout,
			$session,
			stuff: {},
			prerender_enabled: is_prerender_enabled(options, default_error, state),
			is_leaf: false,
			is_error: false
		})
	);

	const branch = [
		loaded,
		/** @type {Loaded} */ (
			await load_node({
				request,
				loader,
				options,
				state,
				route: null,
				page,
				node: default_error,
				$session,
				stuff: loaded ? loaded.stuff : {},
				prerender_enabled: is_prerender_enabled(options, default_error, state),
				is_leaf: false,
				is_error: true,
				status,
				error
			})
		)
	];

	try {
		return await render_response({
			loader,
			options,
			$session,
			page_config: {
				hydrate: options.hydrate,
				router: options.router,
				ssr: options.ssr
			},
			status,
			error,
			branch,
			page
		});
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return {
			status: 500,
			headers: {},
			body: error.stack
		};
	}
}

/**
 * @param {SSRRenderOptions} options
 * @param {SSRNode} node
 * @param {SSRRenderState} state
 */
export function is_prerender_enabled(options, node, state) {
	if (!options.prerender) {
		return false;
	}
	const module = /** @type {import('types/internal').SSRComponent} */ (node.module);
	return !!module.prerender || (!!state.prerender && state.prerender.all);
}
