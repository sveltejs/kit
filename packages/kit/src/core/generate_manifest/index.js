import { s } from '../../utils/misc.js';
import { parse_route_id } from '../../utils/routing.js';
import { get_mime_lookup } from '../utils.js';

/**
 * @param {{
 *   build_data: import('types').BuildData;
 *   relative_path: string;
 *   routes: import('types').RouteData[];
 *   format?: 'esm' | 'cjs'
 * }} opts
 */
export function generate_manifest({ build_data, relative_path, routes, format = 'esm' }) {
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
	const load =
		format === 'esm'
			? (path) => `import('${path}')`
			: (path) => `Promise.resolve().then(() => require('${path}'))`;

	/** @type {(path: string) => string} */
	const loader = (path) => `() => ${load(path)}`;

	const assets = build_data.manifest_data.assets.map((asset) => asset.file);
	if (build_data.service_worker) {
		assets.push(build_data.service_worker);
	}

	/** @param {string | undefined} id */
	const get_index = (id) => id && /** @type {LookupEntry} */ (bundled_nodes.get(id)).index;

	const matchers = new Set();

	// prettier-ignore
	return `{
		appDir: ${s(build_data.app_dir)},
		assets: new Set(${s(assets)}),
		mimeTypes: ${s(get_mime_lookup(build_data.manifest_data))},
		_: {
			entry: ${s(build_data.client.entry)},
			nodes: [
				${Array.from(bundled_nodes.values()).map(node => loader(node.path)).join(',\n\t\t\t\t')}
			],
			routes: [
				${routes.map(route => {
					const { pattern, names, types } = parse_route_id(route.id);

					types.forEach(type => {
						if (type) matchers.add(type);
					});

					if (route.type === 'page') {
						return `{
							type: 'page',
							id: ${s(route.id)},
							pattern: ${pattern},
							names: ${s(names)},
							types: ${s(types)},
							path: ${route.path ? s(route.path) : null},
							shadow: ${route.shadow ? loader(`${relative_path}/${build_data.server.vite_manifest[route.shadow].file}`) : null},
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
							id: ${s(route.id)},
							pattern: ${pattern},
							names: ${s(names)},
							types: ${s(types)},
							load: ${loader(`${relative_path}/${build_data.server.vite_manifest[route.file].file}`)}
						}`.replace(/^\t\t/gm, '');
					}
				}).filter(Boolean).join(',\n\t\t\t\t')}
			],
			matchers: async () => {
				${Array.from(matchers).map(type => `const { match: ${type} } = await ${load(`${relative_path}/entries/matchers/${type}.js`)}`).join('\n\t\t\t\t')}
				return { ${Array.from(matchers).join(', ')} };
			}
		}
	}`.replace(/^\t/gm, '');
}
