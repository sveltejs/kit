import { find_deps } from '../../exports/vite/build/utils.js';

/**
 * Finds all the assets that are imported by server files associated with `routes`,
 * as well as by remote functions, param matchers and hooks
 * @param {import('types').BuildData} build_data
 * @param {import('types').RouteData[]} routes
 * @param {import('types').RemoteChunk[]} remotes
 * @param {string} root
 */
export function find_server_assets(build_data, routes, remotes, root) {
	/**
	 * All nodes actually used in the routes definition (prerendered routes are omitted).
	 * Root layout/error is always included as they are needed for 404 and root errors.
	 * @type {Set<any>}
	 */
	const used_nodes = new Set([0, 1]);

	/** @type {Set<string>} */
	const server_assets = new Set();

	/** @param {string} id */
	function add_assets(id) {
		if (id in build_data.server_manifest) {
			// follow dynamic imports too, since server code can `read` assets it imports lazily
			const deps = find_deps(build_data.server_manifest, id, true, root);
			for (const asset of deps.assets) {
				server_assets.add(asset);
			}
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
		if (node?.universal) add_assets(node.universal);
		if (node?.server) add_assets(node.server);
	}

	if (remotes.length > 0) {
		/** @type {Map<string, string>} */
		const ids = new Map();
		for (const [id, chunk] of Object.entries(build_data.server_manifest)) {
			ids.set(chunk.file, id);
		}

		for (const remote of remotes) {
			const id = ids.get(`chunks/remote-${remote.hash}.js`);
			if (id) add_assets(id);
		}
	}

	if (build_data.manifest_data.params) {
		add_assets(build_data.manifest_data.params);
	}

	if (build_data.manifest_data.hooks.server) {
		add_assets(build_data.manifest_data.hooks.server);
	}

	if (build_data.manifest_data.hooks.universal) {
		add_assets(build_data.manifest_data.hooks.universal);
	}

	return Array.from(server_assets);
}
