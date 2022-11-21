import { relative_path, resolve_entry } from '../../utils/filesystem.js';
import { s } from '../../utils/misc.js';
import { trim, write_if_changed } from './utils.js';

/**
 * Writes the client manifest to disk. The manifest is used to power the router. It contains the
 * list of routes and corresponding Svelte components (i.e. pages and layouts).
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} output
 */
export function write_client_manifest(config, manifest_data, output) {
	/**
	 * Creates a module that exports a `CSRPageNode`
	 * @param {import('types').PageNode} node
	 */
	function generate_node(node) {
		const declarations = [];

		if (node.shared) {
			declarations.push(
				`import * as shared from ${s(relative_path(`${output}/nodes`, node.shared))};`,
				`export { shared };`
			);
		}

		if (node.component) {
			declarations.push(
				`export { default as component } from ${s(
					relative_path(`${output}/nodes`, node.component)
				)};`
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

	const layouts_with_server_load = new Set();

	const dictionary = `{
		${manifest_data.routes
			.map((route) => {
				if (route.page) {
					const errors = route.page.errors.slice(1).map((n) => n ?? '');
					const layouts = route.page.layouts.slice(1).map((n) => n ?? '');

					while (layouts.at(-1) === '') layouts.pop();
					while (errors.at(-1) === '') errors.pop();

					// Encode whether or not the route uses server data
					// using the ones' complement, to save space
					const array = [`${route.leaf?.server ? '~' : ''}${route.page.leaf}`];
					// Encode whether or not the layout uses server data.
					// It's a different method compared to pages because layouts
					// are reused across pages, so we safe space by doing it this way.
					route.page.layouts.forEach((layout) => {
						if (layout != undefined && manifest_data.nodes[layout].server) {
							layouts_with_server_load.add(layout);
						}
					});

					// only include non-root layout/error nodes if they exist
					if (layouts.length > 0 || errors.length > 0) array.push(`[${layouts.join(',')}]`);
					if (errors.length > 0) array.push(`[${errors.join(',')}]`);

					return `${s(route.id)}: [${array.join(',')}]`;
				}
			})
			.filter(Boolean)
			.join(',\n\t\t')}
	}`.replace(/^\t/gm, '');

	const hooks_file = resolve_entry(config.kit.files.hooks.client);

	// String representation of __GENERATED__/client-manifest.js
	write_if_changed(
		`${output}/client-manifest.js`,
		trim(`
			${hooks_file ? `import * as client_hooks from '${relative_path(output, hooks_file)}';` : ''}

			export { matchers } from './client-matchers.js';

			export const nodes = [${nodes}];

			export const server_loads = [${[...layouts_with_server_load].join(',')}];

			export const dictionary = ${dictionary};

			export const hooks = {
				handleError: ${
					hooks_file ? 'client_hooks.handleError || ' : ''
				}(({ error }) => { console.error(error) }),
			};
		`)
	);
}
