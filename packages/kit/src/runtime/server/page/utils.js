/**
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRNode} node
 * @param {import('types/internal').SSRRenderState} state
 */
export function is_prerender_enabled(options, node, state) {
	return (
		options.prerender && (!!node.module.prerender || (!!state.prerender && state.prerender.all))
	);
}

/** @param {URL} url */
export function create_url_proxy(url) {
	return new Proxy(url, {
		get: (target, prop, receiver) => {
			if (prop === 'search' || prop === 'searchParams') {
				throw new Error(`Cannot access url.${prop} on a page with prerendering enabled`);
			}
			return Reflect.get(target, prop, receiver);
		}
	});
}
