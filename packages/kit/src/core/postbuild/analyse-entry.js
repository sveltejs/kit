import { manifest } from 'sveltekit:server-manifest';
import { get, manifest_data } from '__sveltekit/manifest-data';
import { remotes } from '__sveltekit/remotes';
import { set_manifest, set_read_implementation } from '__sveltekit/server';
import { ENDPOINT_METHODS } from '../../constants.js';
import { set_private_env, set_public_env } from '../../runtime/shared-server.js';
import { has_server_load, resolve_route } from '../../utils/routing.js';
import { validate_server_exports } from '../../utils/exports.js';
import { PageNodes } from '../../utils/page_nodes.js';
import { check_feature } from '../../utils/features.js';
import { create_synchronous_read } from '../../runtime/server/utils.js';

const event = 'sveltekit:analyse-request';

if (import.meta.hot) {
	import.meta.hot.off(event, analyse);
	import.meta.hot.on(event, analyse);
}

/**
 *
 * @param {{
 *   private_env: Record<string, string>;
 *   public_env: Record<string, string>;
 *   hash: boolean;
 *   server_manifest: import('vite').Manifest;
 *   tracked_features: Record<string, string[]>;
 * }} opts
 */
async function analyse({ private_env, public_env, hash, server_manifest, tracked_features }) {
	// set env, `read`, and `manifest`, in case they're used in initialisation
	set_private_env(private_env);
	set_public_env(public_env);
	set_manifest(manifest);
	set_read_implementation(
		create_synchronous_read(async (file) => {
			const response = await get(`/read?${new URLSearchParams({ file })}`);

			if (!response.ok) {
				throw new Error(
					`read(...) failed: could not fetch ${file} (${response.status} ${response.statusText})`
				);
			}

			return response.body;
		})
	);

	/** @type {import('types').ServerMetadata} */
	const metadata = {
		nodes: [],
		routes: new Map(),
		remotes: new Map()
	};

	const nodes = await Promise.all(manifest._.nodes.map((loader) => loader()));

	// analyse nodes
	for (const node of nodes) {
		if (hash && node.universal) {
			const options = Object.keys(node.universal).filter((o) => o !== 'load');
			if (options.length > 0) {
				throw new Error(
					`Page options are ignored when \`router.type === 'hash'\` (${node.universal_id} has ${options
						.filter((o) => o !== 'load')
						.map((o) => `'${o}'`)
						.join(', ')})`
				);
			}
		}

		metadata.nodes[node.index] = {
			has_server_load: has_server_load(node),
			has_universal_load: node.universal?.load !== undefined
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

		const route_config = page?.config ?? endpoint?.config ?? {};
		const prerender = page?.prerender ?? endpoint?.prerender;

		if (prerender !== true) {
			for (const feature of list_features(
				route,
				manifest_data,
				server_manifest,
				tracked_features
			)) {
				await check_feature(route.id, route_config, feature);
			}
		}

		const page_methods = page?.methods ?? [];
		const api_methods = endpoint?.methods ?? [];
		const entries = page?.entries ?? endpoint?.entries;

		metadata.routes.set(route.id, {
			config: route_config,
			methods: Array.from(new Set([...page_methods, ...api_methods])),
			page: {
				methods: page_methods
			},
			api: {
				methods: api_methods
			},
			prerender,
			entries:
				entries && (await entries()).map((entry_object) => resolve_route(route.id, entry_object))
		});
	}

	// analyse remotes
	for (const remote of remotes) {
		const loader = manifest._.remotes[remote.hash];
		const { default: functions } = await loader();

		const exports = new Map();

		for (const name in functions) {
			const internals = /** @type {import('types').RemoteInternals} */ (functions[name].__);
			const type = internals.type;

			exports.set(name, {
				type,
				dynamic: type !== 'prerender' || internals.dynamic
			});
		}

		metadata.remotes.set(remote.hash, exports);
	}

	import.meta.hot?.send('sveltekit:analyse-response', metadata);
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
	/** @type {Array<'GET' | 'POST'>} */
	const methods = ['GET'];
	if (leaf.server?.actions) methods.push('POST');

	const nodes = new PageNodes([...layouts, leaf]);
	nodes.validate();

	return {
		config: nodes.get_config(),
		entries: leaf.universal?.entries ?? leaf.server?.entries,
		methods,
		prerender: nodes.prerender()
	};
}

/**
 * @param {import('types').SSRRoute} route
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {Record<string, string[]>} tracked_features
 */
function list_features(route, manifest_data, server_manifest, tracked_features) {
	const features = new Set();

	const route_data = /** @type {import('types').RouteData} */ (
		manifest_data.routes.find((r) => r.id === route.id)
	);

	const visited = new Set();
	/** @param {string} id */
	function visit(id) {
		if (visited.has(id)) return;
		visited.add(id);

		const chunk = server_manifest[id];
		if (!chunk) return;

		if (chunk.file in tracked_features) {
			for (const feature of tracked_features[chunk.file]) {
				features.add(feature);
			}
		}

		if (chunk.imports) {
			for (const id of chunk.imports) {
				visit(id);
			}
		}
	}

	let page_node = route_data?.leaf;
	while (page_node) {
		if (page_node.server) visit(page_node.server);
		page_node = page_node.parent ?? null;
	}

	if (route_data.endpoint) {
		visit(route_data.endpoint.file);
	}

	if (manifest_data.hooks.server) {
		// TODO if hooks.server.js imports `read`, it will be in the entry chunk
		// we don't currently account for that case
		visit(manifest_data.hooks.server);
	}

	return Array.from(features);
}
