import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { get_option } from '../../utils/options.js';
import {
	validate_layout_exports,
	validate_layout_server_exports,
	validate_page_exports,
	validate_page_server_exports,
	validate_server_exports
} from '../../utils/exports.js';
import { load_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';
import { installPolyfills } from '../../exports/node/polyfills.js';
import { resolvePath } from '../../exports/index.js';
import { ENDPOINT_METHODS } from '../../constants.js';
import { filter_private_env, filter_public_env } from '../../utils/env.js';

export default forked(import.meta.url, analyse);

/**
 * @param {{
 *   manifest_path: string;
 *   env: Record<string, string>
 * }} opts
 */
async function analyse({ manifest_path, env }) {
	/** @type {import('@sveltejs/kit').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	/** @type {import('types').ValidatedKitConfig} */
	const config = (await load_config()).kit;

	const server_root = join(config.outDir, 'output');

	/** @type {import('types').ServerInternalModule} */
	const internal = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

	installPolyfills();

	// configure `import { building } from '$app/environment'` —
	// essential we do this before analysing the code
	internal.set_building(true);

	// set env, in case it's used in initialisation
	const { publicPrefix: public_prefix, privatePrefix: private_prefix } = config.env;
	internal.set_private_env(filter_private_env(env, { public_prefix, private_prefix }));
	internal.set_public_env(filter_public_env(env, { public_prefix, private_prefix }));

	const node_promises = manifest._.nodes.map((loader) => loader());
	const node_metadata_promise = Promise.all(node_promises.map(analyse_node));
	const route_metadata_promise = Promise.all(
		manifest._.routes.map((route) => analyse_route(route, { node_promises }))
	);

	const [nodes, routes] = await Promise.all([node_metadata_promise, route_metadata_promise]);

	return {
		nodes,
		routes: new Map(routes)
	};
}

/**
 * Do a shallow merge (first level) of the config object
 * @param {Array<import('types').SSRNode | undefined>} nodes
 */
function get_config(nodes) {
	let current = {};
	for (const node of nodes) {
		const config = node?.universal?.config ?? node?.server?.config;
		if (config) {
			current = {
				...current,
				...config
			};
		}
	}

	return Object.keys(current).length ? current : undefined;
}

/**
 * @param {Promise<import('types').SSRNode>} nodePromise
 * @returns {Promise<{ has_server_load: boolean }>}
 */
async function analyse_node(nodePromise) {
	const node = await nodePromise;
	return {
		has_server_load: node.server?.load !== undefined || node.server?.trailingSlash !== undefined
	};
}

/**
 *
 * @param {import('types').SSRRoute} route
 * @param {{node_promises: Promise<import('types').SSRNode>[]}} config
 * @returns {Promise<[string, import('types').ServerMetadataRoute]>}
 */
async function analyse_route(route, { node_promises }) {
	const endpointResultPromise = analyse_route_endpoint(route.endpoint?.(), { file: route.id });
	const pageResultPromise = analyse_route_page(route.page, { node_promises });
	const [endpoint, page] = await Promise.all([endpointResultPromise, pageResultPromise]);
	const { methods, prerender, config, entries } = merge_route_options({ endpoint, page });
	return [
		route.id,
		{
			config,
			methods,
			page: {
				methods: /** @type {("GET" | "POST")[]} */ (page.methods)
			},
			api: {
				methods: endpoint.methods
			},
			prerender,
			entries:
				entries && (await entries()).map((entry_object) => resolvePath(route.id, entry_object))
		}
	];
}

/**
 *
 * @param {{ endpoint: RouteAnalysisResult, page: RouteAnalysisResult }} analysis_results
 * @returns {RouteAnalysisResult}
 */
function merge_route_options({ endpoint, page }) {
	return {
		methods: [...new Set([...endpoint.methods, ...page.methods])],
		prerender: page.prerender ?? endpoint.prerender,
		entries: page.entries ?? endpoint.entries,
		config: {
			...endpoint.config,
			...page.config
		}
	};
}

/** @typedef {{
     methods: (import('types').HttpMethod | "*")[];
     prerender: import('types').PrerenderOption | undefined;
     config: any;
     entries: import('types').PrerenderEntryGenerator | undefined;
   }} RouteAnalysisResult
 */

/**
 * @param {Promise<import('types').SSREndpoint> | undefined} endpoint_promise
 * @param {{file: string}} config
 * @returns {Promise<RouteAnalysisResult>}
 */
async function analyse_route_endpoint(endpoint_promise, { file }) {
	if (!endpoint_promise) {
		return {
			methods: [],
			prerender: undefined,
			config: undefined,
			entries: undefined
		};
	}
	const endpoint_module = await endpoint_promise;
	if (endpoint_module.prerender !== undefined) {
		validate_server_exports(endpoint_module, file);

		if (
			endpoint_module.prerender &&
			(endpoint_module.POST ||
				endpoint_module.PATCH ||
				endpoint_module.PUT ||
				endpoint_module.DELETE)
		) {
			throw new Error(`Cannot prerender a +server file with POST, PATCH, PUT, or DELETE (${file})`);
		}
	}

	/** @type {(import('types').HttpMethod | '*')[]} */
	const methods = [];
	Object.values(endpoint_module).forEach((/** @type {import('types').HttpMethod} */ method) => {
		if (endpoint_module[method] && ENDPOINT_METHODS.has(method)) {
			methods.push(method);
		} else if (endpoint_module.fallback) {
			methods.push('*');
		}
	});

	return {
		methods,
		prerender: endpoint_module.prerender,
		config: endpoint_module.config,
		entries: endpoint_module.entries
	};
}

/**
 * @param {import('types').PageNodeIndexes | null} page_indexes
 * @param {{ node_promises: Promise<import('types').SSRNode>[] }} config
 * @returns {Promise<RouteAnalysisResult>}
 */
async function analyse_route_page(page_indexes, { node_promises }) {
	if (!page_indexes) {
		return {
			methods: [],
			prerender: undefined,
			config: undefined,
			entries: undefined
		};
	}

	const nodes = await Promise.all(
		[...page_indexes.layouts, page_indexes.leaf].map((n) => {
			if (n !== undefined) return node_promises[n];
		})
	);

	const layouts = nodes.slice(0, -1);
	const page = nodes.at(-1);

	for (const layout of layouts) {
		if (layout) {
			validate_layout_server_exports(layout.server, layout.server_id);
			validate_layout_exports(layout.universal, layout.universal_id);
		}
	}

	/** @type {Array<'GET' | 'POST'>} */
	const methods = [];
	if (page) {
		methods.push('GET');
		if (page.server?.actions) methods.push('POST');

		validate_page_server_exports(page.server, page.server_id);
		validate_page_exports(page.universal, page.universal_id);
	}

	return {
		methods,
		prerender: get_option(nodes, 'prerender'),
		config: get_config(nodes),
		entries: get_option(nodes, 'entries')
	};
}
