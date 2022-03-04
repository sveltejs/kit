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

	/** @param {string[]} parts */
	const get_indices = (parts) =>
		`[${parts.map((part) => (part ? `c[${component_indexes[part]}]` : '')).join(', ')}]`;

	const routes = `[
		${manifest_data.routes
			.map((route) => {
				if (route.type === 'page') {
					const params =
						route.params.length > 0 &&
						'(m) => ({ ' +
							route.params
								.map((param, i) => {
									return param.startsWith('...')
										? `${param.slice(3)}: d(m[${i + 1}] || '')`
										: `${param}: d(m[${i + 1}])`;
								})
								.join(', ') +
							'})';

					const tuple = [route.pattern, get_indices(route.a), get_indices(route.b)];

					// optional items
					if (params || route.shadow) tuple.push(params || 'null');
					if (route.shadow) tuple.push(`'${route.key}'`);

					return `// ${route.a[route.a.length - 1]}\n\t\t[${tuple.join(', ')}]`;
				}
			})
			.filter(Boolean)
			.join(',\n\n\t\t')}
	]`.replace(/^\t/gm, '');

	write_if_changed(
		`${output}/manifest.js`,
		trim(`
			const c = ${components};

			const d = decodeURIComponent;

			export const routes = ${routes};

			// we import the root layout/error components eagerly, so that
			// connectivity errors after initialisation don't nuke the app
			export const fallback = [c[0](), c[1]()];
		`)
	);
}
