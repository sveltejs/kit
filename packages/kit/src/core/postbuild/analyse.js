/** @import { ManifestData } from 'types' */
import process from 'node:process';
import { validate_server_exports } from '../../utils/exports.js';
import { extract_svelte_config, load_vite_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';
import { BODY_DEPENDENT_METHODS, ENDPOINT_METHODS } from '../../constants.js';
import { has_server_load, resolve_route } from '../../utils/routing.js';
import { createReadableStream } from '@sveltejs/kit/node';
import { PageNodes } from '../../utils/page_nodes.js';
import { get_runner } from '../../runner.js';
import { get_runtime_base } from '../utils.js';
import { import_peer } from '../../utils/import.js';
import { from_fs } from '../../utils/vite.js';
import { generate_manifest } from '../../exports/vite/dev/generate_manifest.js';
import { get_remotes_getter } from '../../exports/vite/plugins/remote.js';

export default forked(import.meta.url, analyse);

/**
 * @param {{
 *   manifest_data: ManifestData;
 *   env: Record<string, string>;
 *   vite_config_file: string | undefined;
 * }} opts
 */
async function analyse({ manifest_data, env, vite_config_file }) {
	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite', process.cwd()));
	const vite_config = await load_vite_config(vite_config_file, vite, 'serve', {
		logLevel: 'silent',
		// we only use the server to run modules — `middlewareMode` prevents it from
		// occupying a port, which would otherwise clash with a running dev server
		server: { middlewareMode: true, hmr: false, watch: null }
	});

	/** @type {import('types').ServerMetadata} */
	const metadata = {
		nodes: [],
		routes: new Map(),
		remotes: new Map()
	};

	const vite_dev_server = await vite.createServer(vite_config);

	// configure `import { building } from '$app/env'` —
	// essential we do this before analysing the code
	const runner = get_runner(vite, vite_dev_server);
	const runtime_base = get_runtime_base(vite_config.root);

	const { set_building } = /** @type {typeof import('../../runtime/app/env/server.js')} */ (
		await runner.import(`${runtime_base}/app/env/server.js`)
	);
	set_building();

	// set `read` and `manifest`, in case they're used in initialisation
	const { set_read_implementation, set_manifest } =
		/** @type {typeof import('../../runtime/server/internal.js')} */ (
			await runner.import(`${runtime_base}/server/internal.js`)
		);
	set_read_implementation((file) => createReadableStream(from_fs(file)));

	const config = extract_svelte_config(vite_config);
	const manifest = generate_manifest(
		vite,
		vite_dev_server,
		runner,
		config,
		manifest_data,
		vite_config.root,
		get_remotes_getter(vite_config)
	);
	set_manifest(manifest);

	// `set_env` lives in a separate module that imports the user's `src/env` config. We import it
	// *after* `set_building()` so that `building`-dependent expressions resolve correctly
	const { set_env } = /** @type {typeof import('<sveltekit:generated>/env/config.js')} */ (
		await runner.import('<sveltekit:generated>/env/config.js')
	);
	set_env(env);

	// TODO: try to statically analyse nodes first to avoid loading them?
	const nodes = await Promise.all(manifest.nodes.map((loader) => loader()));

	// analyse nodes
	for (const node of nodes) {
		if (config.router.type === 'hash' && node.universal) {
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

		// load the component module so that Vite processes imported remote functions
		try {
			await node.component?.();
		} catch {
			// ignore errors from loading the component code; we just want Vite
			// to process the modules through its pipeline
		}

		metadata.nodes[node.index] = {
			has_server_load: has_server_load(node),
			has_universal_load: node.universal?.load !== undefined
		};
	}

	// analyse routes
	for (const route of manifest.routes) {
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
	for (const [remote_hash, loader] of Object.entries(manifest.remotes)) {
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

		metadata.remotes.set(remote_hash, exports);
	}

	return { metadata };
}

/**
 * @param {import('types').SSRRoute} route
 * @param {import('types').SSREndpoint} mod
 */
function analyse_endpoint(route, mod) {
	validate_server_exports(mod, route.id);

	if (
		mod.prerender &&
		/** @type {import('types').HttpMethod[]} */ (BODY_DEPENDENT_METHODS).some(
			(method) => mod[method]
		)
	) {
		throw new Error(
			`Cannot prerender a +server file with ${BODY_DEPENDENT_METHODS.join(', ')} handlers (${route.id})`
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
