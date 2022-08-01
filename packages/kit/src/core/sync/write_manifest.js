import path from 'path';
import { s } from '../../utils/misc.js';
import { trim, write_if_changed } from './utils.js';

/**
 * Writes the client manifest to disk. The manifest is used to power the router. It contains the
 * list of routes and corresponding Svelte components (i.e. pages and layouts).
 * @param {import('types').ManifestData} manifest_data
 * @param {string} base
 * @param {string} output
 */
export function write_manifest(manifest_data, base, output) {
	/** @type {Record<string, number>} */
	const component_indexes = {};

	/** @type {Record<string, number>} */
	const module_indexes = {};

	/** @param {string} c */
	const get_path = (c) => path.relative(base, c);

	const components = `[\n\t${manifest_data.components
		.map((component, i) => {
			component_indexes[component] = i;
			return `() => import(${s(get_path(component))})`;
		})
		.join(',\n\t')}\n]`;

	const modules = `[\n\t${manifest_data.modules
		.map((module, i) => {
			module_indexes[module] = i;
			return `() => import(${s(get_path(module))})`;
		})
		.join(',\n\t')}\n]`;

	/**
	 * Serialize a page node as a pair of indices into the
	 * `components` and `modules` arrays
	 * @param {import('types').PageNode | undefined} node
	 */
	function serialize_node(node) {
		if (!node) return ',';

		const indices = [node.component ? component_indexes[node.component] : ''];
		if (node.module) indices.push(module_indexes[node.module]);
		return `[${indices.join(',')}]`;
	}

	const dictionary = `{
		${manifest_data.routes
			.map((route) => {
				if (route.type === 'page') {
					const errors = `[${route.errors
						.map((file) => file && component_indexes[file])
						.join(', ')}]`;

					const layouts = `[${route.layouts.map(serialize_node).join(', ')}]`;

					const page = serialize_node(route.page);

					const value = [errors, layouts, page].join(',');

					return `${s(route.id)}: [${value}]`;
				}
			})
			.filter(Boolean)
			.join(',\n\t\t')}
	}`.replace(/^\t/gm, '');

	write_if_changed(
		`${output}/client-manifest.js`,
		trim(`
			export { matchers } from './client-matchers.js';

			export const components = ${components};

			export const modules = ${modules};

			export const dictionary = ${dictionary};
		`)
	);
}
