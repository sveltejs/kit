import path from 'path';
import { s } from '../../utils/misc.js';
import { trim, write_if_changed } from './utils.js';

/**
 * @param {import('types').ManifestData} manifest_data
 * @param {string} base
 * @param {string} output
 */
export function write_manifest(manifest_data, base, output) {
	/** @type {Record<string, number>} */
	const component_indexes = {};

	/** @param {string} c */
	const get_path = (c) => path.relative(base, c);

	const components = `[
		${manifest_data.components
			.map((component, i) => {
				component_indexes[component] = i;

				return `() => import(${s(get_path(component))})`;
			})
			.join(',\n\t\t\t\t\t')}
	]`.replace(/^\t/gm, '');

	/** @param {Array<string | undefined>} parts */
	const get_indices = (parts) =>
		`[${parts.map((part) => (part ? component_indexes[part] : '')).join(', ')}]`;

	const dictionary = `{
		${manifest_data.routes
			.map((route) => {
				if (route.type === 'page') {
					const tuple = [get_indices(route.a), get_indices(route.b)];
					if (route.shadow) tuple.push('1');

					return `${s(route.id)}: [${tuple.join(', ')}]`;
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

			export const dictionary = ${dictionary};
		`)
	);
}
