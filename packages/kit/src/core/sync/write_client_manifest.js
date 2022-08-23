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

	// TODO omit default layout/error, as they are common to all routes
	const dictionary = `{
		${manifest_data.routes
			.map((route) => {
				if (route.page) {
					const errors = route.page.errors.map((n) => n ?? '').join(',');
					const layouts = route.page.layouts.map((n) => n ?? '').join(',');
					const leaf = route.page.leaf;

					/** @type {import('types').RouteData | null} */
					let current_route = route;

					/** @type {import('types').PageNode | null} */
					let current_node = route.leaf;

					let uses_server_data = false;
					while (current_route && !uses_server_data) {
						uses_server_data = !!current_node?.server;
						current_route = current_route.parent;
						current_node = current_route?.layout ?? null;
					}

					const suffix = uses_server_data ? ', 1' : '';

					return `${s(route.id)}: [[${errors}], [${layouts}], ${leaf}${suffix}]`;
				}
			})
			.filter(Boolean)
			.join(',\n\t\t')}
	}`.replace(/^\t/gm, '');

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
