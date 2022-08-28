import { relative } from 'path';
import { s } from '../../utils/misc.js';
import { trim, write_if_changed } from './utils.js';

/**
 * Writes the client manifest to disk. The manifest is used to power the router. It contains the
 * list of routes and corresponding Svelte components (i.e. pages and layouts).
 * @param {import('types').ManifestData} manifest_data
 * @param {string} output
 */
export function write_client_manifest(manifest_data, output) {
	/**
	 * Creates a module that exports a `CSRPageNode`
	 * @param {import('types').PageNode} node
	 */
	function generate_node(node) {
		const declarations = [];

		if (node.shared) {
			declarations.push(
				`import * as shared from ${s(relative(`${output}/nodes`, node.shared))};`,
				`export { shared };`
			);
		}

		if (node.component) {
			declarations.push(
				`export { default as component } from ${s(relative(`${output}/nodes`, node.component))};`
			);
		}

		if (node.server) {
			declarations.push(`export const server = true;`);
		}

		return declarations.join('\n');
	}

	const nodes = manifest_data.nodes
		.map((node, i) => {
			write_if_changed(`${output}/nodes/${i}.js`, generate_node(node));
			return `() => import('./nodes/${i}')`;
		})
		.join(',\n\t');

	const dictionary = `{
		${manifest_data.routes
			.map((route) => {
				if (route.page) {
					// Skip the first error, it's always the root error page with number 1
					const errors = route.page.errors.slice(1).map((n) => n ?? '');
					// Do _not_ skip the first layout, it's always the root layout with number 0,
					// but we don't know whether it has a server load function or not, which we need to encode
					const layouts = route.page.layouts.map((n) => {
						if (n == undefined) {
							return '';
						}
						return get_node_id(manifest_data.nodes, n);
					});

					while (layouts.at(-1) === '') layouts.pop();
					while (errors.at(-1) === '') errors.pop();

					const array = [get_node_id(manifest_data.nodes, route.page.leaf)];

					array.push(`[${layouts.join(',')}]`);
					// only include non-root error nodes if they exist
					if (errors.length > 0) array.push(`[${errors.join(',')}]`);

					return `${s(route.id)}: [${array.join(',')}]`;
				}
			})
			.filter(Boolean)
			.join(',\n\t\t')}
	}`.replace(/^\t/gm, '');

	// String representation of __GENERATED__/client-manifest.js
	write_if_changed(
		`${output}/client-manifest.js`,
		trim(`
			export { matchers } from './client-matchers.js';

			export const nodes = [
				${nodes}
			];

			export const dictionary = ${dictionary};
		`)
	);
}

/**
 * Encode whether or not the route uses the server data
 * using the ones' complement, to save space
 * @param {import('types').PageNode[]} nodes
 * @param {number} id
 */
function get_node_id(nodes, id) {
	console.log(nodes[id]);
	return `${nodes[id].server ? '~' : ''}${id}`;
}
