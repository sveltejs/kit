/**
 * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash' | 'entries'} Option
 * @template {(import('types').SSRNode['universal'] | import('types').SSRNode['server'])[Option]} Value
 *
 * @param {Array<import('types').SSRNode | undefined>} nodes
 * @param {Option} option
 *
 * @returns {Value | undefined}
 */
export function get_option(nodes, option) {
	return nodes.reduce((value, node) => {
		return /** @type {Value} TypeScript's too dumb to understand this */ (
			node?.universal?.[option] ?? node?.server?.[option] ?? value
		);
	}, /** @type {Value | undefined} */ (undefined));
}
