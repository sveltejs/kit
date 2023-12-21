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
import { ENDPOINT_METHODS } from '../../constants.js';
import { filter_private_env, filter_public_env } from '../../utils/env.js';
import { resolve_route } from '../../utils/routing.js';

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
	internal.set_building();

	// set env, in case it's used in initialisation
	const { publicPrefix: public_prefix, privatePrefix: private_prefix } = config.env;
	const private_env = filter_private_env(env, { public_prefix, private_prefix });
	const public_env = filter_public_env(env, { public_prefix, private_prefix });
	internal.set_private_env(private_env);
	internal.set_public_env(public_env);
	internal.set_safe_public_env(public_env);

	/** @type {import('types').ServerMetadata} */
	const metadata = {
		nodes: [],
		routes: new Map()
	};

	const nodes = await Promise.all(manifest._.nodes.map((loader) => loader()));

	// analyse nodes
	for (const node of nodes) {
		metadata.nodes[node.index] = {
			has_server_load: node.server?.load !== undefined || node.server?.trailingSlash !== undefined
		};
	}

	// analyse routes
	for (const route of manifest._.routes) {
		const page =
			route.page &&
			analyse_page(
				route.page.layouts.map((n) => (n === undefined ? n : nodes[n])),
				nodes[route.page.leaf]
			);

		const endpoint = route.endpoint && analyse_endpoint(route, await route.endpoint());

		if (page?.prerender && endpoint?.prerender) {
			throw new Error(`Cannot prerender a route with both +page and +server files (${route.id})`);
		}

		if (page?.config && endpoint?.config) {
			for (const key in { ...page.config, ...endpoint.config }) {
				if (JSON.stringify(page.config[key]) !== JSON.stringify(endpoint.config[key])) {
					throw new Error(
						`Mismatched route config for ${route.id} — the +page and +server files must export the same config, if any`
					);
				}
			}
		}

		const page_methods = page?.methods ?? [];
		const api_methods = endpoint?.methods ?? [];
		const entries = page?.entries ?? endpoint?.entries;

		metadata.routes.set(route.id, {
			config: page?.config ?? endpoint?.config,
			methods: Array.from(new Set([...page_methods, ...api_methods])),
			page: {
				methods: page_methods
			},
			api: {
				methods: api_methods
			},
			prerender: page?.prerender ?? endpoint?.prerender,
			entries:
				entries && (await entries()).map((entry_object) => resolve_route(route.id, entry_object))
		});
	}

	return metadata;
}

/**
 * @param {import('types').SSRRoute} route
 * @param {import('types').SSREndpoint} mod
 */
function analyse_endpoint(route, mod) {
	validate_server_exports(mod, route.id);

	if (mod.prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
		throw new Error(
			`Cannot prerender a +server file with POST, PATCH, PUT, or DELETE (${route.id})`
		);
	}

	/** @type {Array<import('types').HttpMethod | '*'>} */
	const methods = [];

	for (const method of /** @type {import('types').HttpMethod[]} */ (ENDPOINT_METHODS)) {
		if (mod[method]) methods.push(method);
	}

	if (mod.fallback) {
		methods.push('*');
	}

	return {
		config: mod.config,
		entries: mod.entries,
		methods,
		prerender: mod.prerender ?? false
	};
}

/**
 * @param {Array<import('types').SSRNode | undefined>} layouts
 * @param {import('types').SSRNode} leaf
 */
function analyse_page(layouts, leaf) {
	for (const layout of layouts) {
		if (layout) {
			validate_layout_server_exports(layout.server, layout.server_id);
			validate_layout_exports(layout.universal, layout.universal_id);
		}
	}

	/** @type {Array<'GET' | 'POST'>} */
	const methods = ['GET'];
	if (leaf.server?.actions) methods.push('POST');

	validate_page_server_exports(leaf.server, leaf.server_id);
	validate_page_exports(leaf.universal, leaf.universal_id);

	return {
		config: get_config([...layouts, leaf]),
		entries: leaf.universal?.entries ?? leaf.server?.entries,
		methods,
		prerender: get_option([...layouts, leaf], 'prerender') ?? false
	};
}

/**
 * Do a shallow merge (first level) of the config object
 * @param {Array<import('types').SSRNode | undefined>} nodes
 */
function get_config(nodes) {
	/** @type {any} */
	let current = {};

	for (const node of nodes) {
		if (!node?.universal?.config && !node?.server?.config) continue;

		current = {
			...current,
			...node?.universal?.config,
			...node?.server?.config
		};
	}

	return Object.keys(current).length ? current : undefined;
}
