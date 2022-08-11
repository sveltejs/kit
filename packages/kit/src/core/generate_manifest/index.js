import { s } from '../../utils/misc.js';
import { parse_route_id } from '../../utils/routing.js';
import { get_mime_lookup } from '../utils.js';

/**
 * Generates the data used to write the server-side manifest.js file. This data is used in the Vite
 * build process, to power routing, etc.
 * @param {{
 *   build_data: import('types').BuildData;
 *   relative_path: string;
 *   routes: import('types').RouteData[];
 *   format?: 'esm' | 'cjs'
 * }} opts
 */
export function generate_manifest({ build_data, relative_path, routes, format = 'esm' }) {
	/** @typedef {{ index: number, path: string }} LookupEntry */
	/** @type {Map<import('types').PageNode, LookupEntry>} */
	const bundled_nodes = new Map();

	build_data.manifest_data.nodes.forEach((node, i) => {
		bundled_nodes.set(node, {
			path: `${relative_path}/nodes/${i}.js`,
			index: i
		});
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

	/** @param {import('types').PageNode | undefined} id */
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
							errors: ${s(route.errors.map(get_index))},
							layouts: ${s(route.layouts.map(get_index))},
							leaf: ${s(get_index(route.leaf))}
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
