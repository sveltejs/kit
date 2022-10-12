import { s } from '../../utils/misc.js';
import { get_mime_lookup } from '../utils.js';
import { resolve_symlinks } from '../../exports/vite/build/utils.js';

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

	const matchers = new Set();

	// prettier-ignore
	// String representation of
	/** @type {import('types').SSRManifest} */
	return `{
		appDir: ${s(build_data.app_dir)},
		appPath: ${s(build_data.app_path)},
		assets: new Set(${s(assets)}),
		mimeTypes: ${s(get_mime_lookup(build_data.manifest_data))},
		_: {
			entry: ${s(build_data.client.entry)},
			nodes: [
				${Array.from(bundled_nodes.values()).map(node => loader(node.path)).join(',\n\t\t\t\t')}
			],
			routes: [
				${routes.map(route => {
					route.types.forEach(type => {
						if (type) matchers.add(type);
					});

					if (!route.page && !route.endpoint) return;

					return `{
					id: ${s(route.id)},
					pattern: ${route.pattern},
					names: ${s(route.names)},
					types: ${s(route.types)},
					page: ${route.page ? `{ layouts: ${get_nodes(route.page.layouts)}, errors: ${get_nodes(route.page.errors)}, leaf: ${route.page.leaf} }` : 'null'},
					endpoint: ${route.endpoint ? loader(`${relative_path}/${resolve_symlinks(build_data.server.vite_manifest, route.endpoint.file).chunk.file}`) : 'null'}
				}`;
				}).filter(Boolean).join(',\n\t\t\t\t')}
			],
			matchers: async () => {
				${Array.from(matchers).map(type => `const { match: ${type} } = await ${load(`${relative_path}/entries/matchers/${type}.js`)}`).join('\n\t\t\t\t')}
				return { ${Array.from(matchers).join(', ')} };
			}
		}
	}`.replace(/^\t/gm, '');
}

/** @param {Array<number | undefined>} indexes */
function get_nodes(indexes) {
	let string = indexes.map((n) => n ?? '').join(',');

	if (indexes.at(-1) === undefined) {
		// since JavaScript ignores trailing commas, we need to insert a dummy
		// comma so that the array has the correct length if the last item
		// is undefined
		string += ',';
	}

	return `[${string}]`;
}
