import { s } from '../../utils/misc.js';
import { get_mime_lookup } from '../utils.js';

/**
 * @param {import('types').BuildData} build_data;
 * @param {string} relative_path;
 * @param {import('types').RouteData[]} routes;
 * @param {'esm' | 'cjs'} format
 */
export function generate_manifest(
	build_data,
	relative_path,
	routes = build_data.manifest_data.routes,
	format = 'esm'
) {
	/** @typedef {{ index: number, path: string }} LookupEntry */
	/** @type {Map<string, LookupEntry>} */
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
				if (component && !bundled_nodes.has(component)) {
					const i = build_data.manifest_data.components.indexOf(component);

					bundled_nodes.set(component, {
						path: `${relative_path}/nodes/${i}.js`,
						index: bundled_nodes.size
					});
				}
			});
		}
	});

	/** @type {(path: string) => string} */
	const importer =
		format === 'esm'
			? (path) => `() => import('${path}')`
			: (path) => `() => Promise.resolve().then(() => require('${path}'))`;

	const assets = build_data.manifest_data.assets.map((asset) => asset.file);
	if (build_data.service_worker) {
		assets.push(build_data.service_worker);
	}

	/** @param {string} id */
	const get_index = (id) => id && /** @type {LookupEntry} */ (bundled_nodes.get(id)).index;

	// prettier-ignore
	return `{
		appDir: ${s(build_data.app_dir)},
		assets: new Set(${s(assets)}),
		_: {
			mime: ${s(get_mime_lookup(build_data.manifest_data))},
			entry: ${s(build_data.client.entry)},
			nodes: [
				${Array.from(bundled_nodes.values()).map(node => importer(node.path)).join(',\n\t\t\t\t')}
			],
			routes: [
				${routes.map(route => {
					if (route.type === 'page') {
						return `{
							type: 'page',
							pattern: ${route.pattern},
							params: ${get_params(route.params)},
							path: ${route.path ? s(route.path) : null},
							shadow: ${route.shadow ? importer(`${relative_path}/${build_data.server.vite_manifest[route.shadow].file}`) : null},
							a: ${s(route.a.map(get_index))},
							b: ${s(route.b.map(get_index))}
						}`.replace(/^\t\t/gm, '');
					} else {
						if (!build_data.server.vite_manifest[route.file]) {
							// this is necessary in cases where a .css file snuck in —
							// perhaps it would be better to disallow these (and others?)
							return null;
						}

						return `{
							type: 'endpoint',
							pattern: ${route.pattern},
							params: ${get_params(route.params)},
							load: ${importer(`${relative_path}/${build_data.server.vite_manifest[route.file].file}`)}
						}`.replace(/^\t\t/gm, '');
					}
				}).filter(Boolean).join(',\n\t\t\t\t')}
			]
		}
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
