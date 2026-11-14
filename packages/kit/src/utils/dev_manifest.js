/** @import { DevManifestData, DevManifestLoaders, SSREndpoint, SSRManifest, SSRNode, UniversalNode } from 'types' */

/**
 * Creates the manifest used during `vite dev` from data that can be written to disk, so that
 * the runtime that renders requests does not have to be the one that runs Vite
 * @param {DevManifestData} data
 * @param {DevManifestLoaders} loaders
 * @returns {SSRManifest}
 */
export function create_dev_manifest(data, loaders) {
	return {
		app_dir: data.app_dir,
		app_path: data.app_path,
		assets: new Set(data.assets),
		mime_types: data.mime_types,
		client: data.client,
		server_assets: loaders.server_assets,
		nodes: data.nodes.map((node, index) => {
			return async () => {
				/** @type {SSRNode} */
				const result = {
					index,
					universal_id: node.universal,
					server_id: node.server,
					// these are unused in dev, but it's easier to include them
					imports: [],
					stylesheets: [],
					fonts: []
				};

				/** @type {string[]} */
				const loaded = [];

				if (node.component) {
					const component = node.component;

					result.component = async () => {
						const module = await loaders.load(component);
						loaded.push(component);
						return module.default;
					};
				}

				if (node.universal) {
					if (node.page_options?.ssr === false) {
						result.universal = /** @type {UniversalNode} */ (node.page_options);
					} else {
						// TODO: explain why the file was loaded on the server if we fail to load it
						result.universal = await loaders.load(node.universal);
						loaded.push(node.universal);
					}
				}

				if (node.server) {
					result.server = await loaders.load(node.server);
				}

				// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
				// components/stylesheets loaded via import() during `load` are included
				result.inline_styles = () => loaders.inline_styles(loaded);

				return result;
			};
		}),
		prerendered_routes: new Set(),
		get remotes() {
			return Object.fromEntries(
				loaders
					.remotes()
					.map((remote) => [
						remote.hash,
						() => loaders.load(remote.file).then((module) => ({ default: module }))
					])
			);
		},
		routes: data.routes.map(({ endpoint, ...route }) => ({
			...route,
			endpoint: endpoint
				? () => /** @type {Promise<SSREndpoint>} */ (loaders.load(endpoint))
				: null,
			endpoint_id: endpoint ?? undefined
		})),
		matchers: async () => {
			if (!data.params) return {};

			const module = await loaders.load(data.params);

			return module.params ?? {};
		}
	};
}
