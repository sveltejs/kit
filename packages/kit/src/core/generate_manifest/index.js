import { s } from '../../utils/misc.js';

/**
 * @param {import('../../../types/internal').BuildData} build_data;
 * @param {string} relative_path;
 * @param {import('../../../types/internal').RouteData[]} routes;
 */
export function generate_manifest(
	build_data,
	relative_path,
	routes = build_data.manifest_data.routes
) {
	const bundled_nodes = new Map();

	// 0 and 1 are special, they correspond to the root layout and root error nodes
	bundled_nodes.set(build_data.manifest_data.components[0], {
		path: `${relative_path}/nodes/0.js`,
		index: 0
	});

	bundled_nodes.set(build_data.manifest_data.components[1], {
		path: `${relative_path}/nodes/1.js`,
		index: 1
	});

	routes.forEach((route) => {
		if (route.type === 'page') {
			[...route.a, ...route.b].forEach((component) => {
				if (!bundled_nodes.has(component)) {
					const i = build_data.manifest_data.components.indexOf(component);

					bundled_nodes.set(component, {
						path: `${relative_path}/nodes/${i}.js`,
						index: bundled_nodes.size
					});
				}
			});
		}
	});

	// prettier-ignore
	return `{
		assets: ${s(build_data.manifest_data.assets)},
		entry: ${s(build_data.client.entry)},
		nodes: [
			${Array.from(bundled_nodes.values()).map(node => `() => import('${node.path}')`).join(',\n\t\t\t')}
		],
		routes: [
			${routes.map(route => {
				if (route.type === 'page') {
					return `{
						type: 'page',
						pattern: ${route.pattern},
						params: ${get_params(route.params)},
						path: ${s(route.path)},
						a: ${s(route.a.map(component => bundled_nodes.get(component).index))},
						b: ${s(route.b.map(component => bundled_nodes.get(component).index))}
					}`.replace(/^\t\t/gm, '');
				} else {
					return `{
						type: 'endpoint',
						pattern: ${route.pattern},
						params: ${get_params(route.params)},
						load: () => import('${relative_path}/${build_data.server.manifest[route.file].file}')
					}`.replace(/^\t\t/gm, '');
				}
			}).join(',\n\t\t\t')}
		]
	}`.replace(/^\t/gm, '');
}

/** @param {string[]} array */
function get_params(array) {
	// given an array of params like `['x', 'y', 'z']` for
	// src/routes/[x]/[y]/[z]/svelte, create a function
	// that turns a RexExpMatchArray into ({ x, y, z })
	return array.length
		? '(m) => ({ ' +
				array
					.map((param, i) => {
						return param.startsWith('...')
							? `${param.slice(3)}: m[${i + 1}] || ''`
							: `${param}: m[${i + 1}]`;
					})
					.join(', ') +
				'})'
		: 'null';
}
