import { get_html } from './html.js';
import { load_node } from './load_node.js';
import { respond_with_error } from './respond_with_error.js';

const s = JSON.stringify;

/**
 * @param {{
 *   request: import('types').Request;
 *   options: import('types.internal').SSRRenderOptions;
 *   $session: any;
 *   route: import('types.internal').SSRPage;
 * }} opts
 * @returns {Promise<import('types').Response>}
 */
export async function respond({ request, options, $session, route }) {
	const match = route.pattern.exec(request.path);
	const params = route.params(match);

	const page = {
		host: request.host,
		path: request.path,
		query: request.query,
		params
	};

	let nodes;

	try {
		nodes = await Promise.all([
			options.load_component(options.manifest.layout),
			...route.parts.map((id) => options.load_component(id))
		]);
	} catch (e) {
		return await respond_with_error({
			request,
			options,
			$session,
			status: 500,
			error: e
		});
	}

	const leaf = nodes[nodes.length - 1].module;

	const page_config = {
		ssr: 'ssr' in leaf ? leaf.ssr : options.ssr,
		router: 'router' in leaf ? leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? leaf.hydrate : options.hydrate
	};

	if (options.only_render_prerenderable_pages && !leaf.prerender) {
		// if the page has `export const prerender = true`, continue,
		// otherwise bail out at this point
		return {
			status: 204,
			headers: {},
			body: null
		};
	}

	/** @type {import('./types.js').Loaded[]} */
	let branch;

	if (page_config.ssr) {
		let context = {};
		branch = [];

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			/** @type {import('./types.js').Loaded} */
			let loaded;

			try {
				loaded = await load_node({
					request,
					options,
					route,
					page,
					node,
					$session,
					context,
					is_leaf: i === nodes.length - 1
				});

				if (!loaded) return;

				if (loaded.loaded.redirect) {
					return {
						status: loaded.loaded.status,
						headers: {
							location: loaded.loaded.redirect
						}
					};
				}
			} catch (e) {
				// TODO
				loaded = {
					node: null,
					loaded: {
						status: 500,
						error: e
					},
					fetched: null,
					uses_credentials: null
				};
			}

			if (loaded.loaded.error) {
				// TODO backtrack until we find an $error.svelte component
				// that we can use as the leaf node
				// for now just return regular error page
				return await respond_with_error({
					request,
					options,
					$session,
					status: loaded.loaded.status,
					error: loaded.loaded.error
				});
			}

			branch.push(loaded);

			if (loaded.loaded.context) {
				// TODO come up with better names for stuff
				context = {
					...context,
					...loaded.loaded.context
				};
			}
		}
	}

	try {
		return await get_html({
			request,
			options,
			$session,
			page_config,
			status: 200,
			error: null,
			branch,
			page
		});
	} catch (error) {
		return await respond_with_error({
			request,
			options,
			$session,
			status: 500,
			error
		});
	}
}
