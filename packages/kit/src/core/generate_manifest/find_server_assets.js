import { find_deps } from '../../exports/vite/build/utils.js';

/**
 * Generates the data used to write the server-side manifest.js file. This data is used in the Vite
 * build process, to power routing, etc.
 * @param {import('types').BuildData} build_data
 * @param {import('types').RouteData[]} routes
 */
export function find_server_assets(build_data, routes) {
	/**
	 * All nodes actually used in the routes definition (prerendered routes are omitted).
	 * Root layout/error is always included as they are needed for 404 and root errors.
	 * @type {Set<any>}
	 */
	const used_nodes = new Set([0, 1]);

	// TODO add hooks.server.js asset imports
	/** @type {Set<string>} */
	const server_assets = new Set();

	/** @param {string} id */
	function add_assets(id) {
		const deps = find_deps(build_data.server_manifest, id, false);
		for (const asset of deps.assets) {
			server_assets.add(asset);
		}
	}

	for (const route of routes) {
		if (route.page) {
			for (const i of route.page.layouts) used_nodes.add(i);
			for (const i of route.page.errors) used_nodes.add(i);
			used_nodes.add(route.page.leaf);
		}

		if (route.endpoint) {
			add_assets(route.endpoint.file);
		}
	}

	for (const n of used_nodes) {
		const node = build_data.manifest_data.nodes[n];
		if (node.server) add_assets(node.server);
	}

	return Array.from(server_assets);
}
