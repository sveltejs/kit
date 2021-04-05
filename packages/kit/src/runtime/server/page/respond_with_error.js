import { get_html } from './html.js';
import { load_node } from './load_node.js';

/**
 * @param {{
 *   request: import('types').Request;
 *   options: import('types.internal').SSRRenderOptions;
 *   $session: any;
 *   status: number;
 *   error: Error;
 * }} opts
 */
export async function respond_with_error({ request, options, $session, status, error }) {
	const default_layout = await options.load_component(options.manifest.layout);
	const default_error = await options.load_component(options.manifest.error);

	const page = {
		host: request.host,
		path: request.path,
		query: request.query,
		params: {}
	};

	const branch = [
		await load_node({
			request,
			options,
			route: null,
			page,
			node: default_layout,
			$session,
			context: {},
			is_leaf: false
		}),
		{
			node: default_error,
			loaded: {
				maxage: 0
			},
			fetched: null,
			uses_credentials: null
		}
	];

	try {
		return await get_html({
			request,
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
	} catch (error) {
		return {
			status: 500,
			headers: {},
			body: options.dev ? error.stack : error.message
		};
	}
}
