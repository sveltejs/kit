/** @import { ManifestData, PageNode, DevRouteInfo, DevRouteNode, DevRoutePageOption } from 'types' */
/** @import { PageOptions } from '../static_analysis/types.js' */
import { is_app_route } from '../../../core/sync/create_manifest_data/index.js';
import { get_page_options } from '../static_analysis/index.js';

const page_defaults = /** @type {const} */ ({
	ssr: true,
	csr: true,
	prerender: false,
	trailingSlash: 'never'
});

/**
 * describes each route for devtools, reading route files again on every call
 * @param {ManifestData} manifest_data
 * @param {string} root project root directory
 * @returns {{ routes: DevRouteInfo[], matchers: string | null }}
 */
export function get_route_info(manifest_data, root) {
	/** @type {Map<string, PageOptions | null>} */
	const cache = new Map();

	/** @param {string} file */
	const analyse = (file) => {
		let options = cache.get(file);
		if (options === undefined) {
			try {
				options = get_page_options(file, root);
			} catch {
				// the file was deleted before the manifest was rebuilt
				options = null;
			}
			cache.set(file, options);
		}
		return options;
	};

	/**
	 * @param {Array<{ file: string, inherited: boolean }>} files closest first and universal before server, the order the runtime applies them
	 * @param {keyof typeof page_defaults} option
	 * @returns {DevRoutePageOption}
	 */
	const resolve = (files, option) => {
		for (const { file, inherited } of files) {
			const options = analyse(file);
			if (options === null) return { known: false, file, inherited };
			if (options[option] !== undefined) {
				return { known: true, value: options[option], file, inherited };
			}
		}

		return { known: true, value: page_defaults[option], file: null, inherited: false };
	};

	/**
	 * @param {PageNode | undefined} node
	 * @returns {DevRouteNode | null}
	 */
	const to_node = (node) =>
		node
			? {
					component: node.component ?? null,
					universal: node.universal ?? null,
					server: node.server ?? null
				}
			: null;

	/**
	 * @param {PageNode | null} node
	 * @param {boolean} inherited
	 */
	const option_files = (node, inherited) =>
		/** @type {string[]} */ ([node?.universal, node?.server].filter(Boolean)).map((file) => ({
			file,
			inherited
		}));

	const routes = manifest_data.routes.filter(is_app_route).map((route) => {
		/** @type {DevRouteInfo} */
		const info = {
			id: route.id,
			params: route.params.map((param) => ({
				name: param.name,
				matcher: param.matcher ?? null,
				optional: param.optional,
				rest: param.rest
			})),
			page: null,
			endpoint: null
		};

		if (route.page) {
			const { page } = route;
			const leaf = manifest_data.nodes[page.leaf];
			const layouts = page.layouts.map((i) =>
				i === undefined ? undefined : manifest_data.nodes[i]
			);

			const files = [
				...option_files(leaf, false),
				...[...layouts].reverse().flatMap((layout) => option_files(layout ?? null, true))
			];

			info.page = {
				layouts: layouts.map(to_node),
				errors: page.errors.map((i) =>
					i === undefined ? null : (manifest_data.nodes[i].component ?? null)
				),
				leaf: /** @type {DevRouteNode} */ (to_node(leaf)),
				options: {
					ssr: resolve(files, 'ssr'),
					csr: resolve(files, 'csr'),
					prerender: resolve(files, 'prerender'),
					trailingSlash: resolve(files, 'trailingSlash')
				}
			};
		}

		if (route.endpoint) {
			const files = [{ file: route.endpoint.file, inherited: false }];

			info.endpoint = {
				file: route.endpoint.file,
				options: {
					prerender: resolve(files, 'prerender'),
					trailingSlash: resolve(files, 'trailingSlash')
				}
			};
		}

		return info;
	});

	return { routes, matchers: manifest_data.params };
}
