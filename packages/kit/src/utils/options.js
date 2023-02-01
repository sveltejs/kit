/**
 * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash'} Option
 * @template {Option extends 'prerender' ? import('types').PrerenderOption : Option extends 'trailingSlash' ? import('types').TrailingSlash : boolean} Value
 *
 * @param {Array<import('types').SSRNode | undefined>} nodes
 * @param {Option} option
 *
 * @returns {Value | undefined}
 */
export function get_option(nodes, option) {
	return nodes.reduce((value, node) => {
		return /** @type {any} TypeScript's too dumb to understand this */ (
			node?.universal?.[option] ?? node?.server?.[option] ?? value
		);
	}, /** @type {Value | undefined} */ (undefined));
}
