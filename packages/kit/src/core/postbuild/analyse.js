import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { get_option } from '../../utils/options.js';
import {
	validate_common_exports,
	validate_page_server_exports,
	validate_server_exports
} from '../../utils/exports.js';
import { load_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';
import { should_polyfill } from '../../utils/platform.js';
import { installPolyfills } from '../../exports/node/polyfills.js';

export default forked(import.meta.url, analyse);

/**
 * @param {{
 *   manifest_path: string;
 *   env: Record<string, string>
 * }} opts
 */
async function analyse({ manifest_path, env }) {
	/** @type {import('types').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	/** @type {import('types').ValidatedKitConfig} */
	const config = (await load_config()).kit;

	const server_root = join(config.outDir, 'output');

	/** @type {import('types').ServerInternalModule} */
	const internal = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

	if (should_polyfill) {
		installPolyfills();
	}

	// configure `import { building } from '$app/environment'` —
	// essential we do this before analysing the code
	internal.set_building(true);

	// set env, in case it's used in initialisation
	const entries = Object.entries(env);
	const prefix = config.env.publicPrefix;
	internal.set_private_env(Object.fromEntries(entries.filter(([k]) => !k.startsWith(prefix))));
	internal.set_public_env(Object.fromEntries(entries.filter(([k]) => k.startsWith(prefix))));

	/** @type {import('types').ServerMetadata} */
	const metadata = {
		nodes: [],
		routes: new Map()
	};

	// analyse nodes
	for (const loader of manifest._.nodes) {
		const node = await loader();

		metadata.nodes[node.index] = {
			has_server_load: node.server?.load !== undefined
		};
	}

	// analyse routes
	for (const route of manifest._.routes) {
		/** @type {Array<'GET' | 'POST'>} */
		const page_methods = [];

		/** @type {import('types').HttpMethod[]} */
		const api_methods = [];

		/** @type {import('types').PrerenderOption | undefined} */
		let prerender = undefined;
		/** @type {any} */
		let config = undefined;

		if (route.endpoint) {
			const mod = await route.endpoint();
			if (mod.prerender !== undefined) {
				validate_server_exports(mod, route.id);

				if (mod.prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
					throw new Error(
						`Cannot prerender a +server file with POST, PATCH, PUT, or DELETE (${route.id})`
					);
				}

				prerender = mod.prerender;
			}

			if (mod.GET) api_methods.push('GET');
			if (mod.POST) api_methods.push('POST');
			if (mod.PUT) api_methods.push('PUT');
			if (mod.PATCH) api_methods.push('PATCH');
			if (mod.DELETE) api_methods.push('DELETE');
			if (mod.OPTIONS) api_methods.push('OPTIONS');

			config = mod.config;
		}

		if (route.page) {
			const nodes = await Promise.all(
				[...route.page.layouts, route.page.leaf].map((n) => {
					if (n !== undefined) return manifest._.nodes[n]();
				})
			);

			const layouts = nodes.slice(0, -1);
			const page = nodes.at(-1);

			for (const layout of layouts) {
				if (layout) {
					validate_common_exports(layout.server, layout.server_id);
					validate_common_exports(layout.universal, layout.universal_id);
				}
			}

			if (page) {
				page_methods.push('GET');
				if (page.server?.actions) page_methods.push('POST');

				validate_page_server_exports(page.server, page.server_id);
				validate_common_exports(page.universal, page.universal_id);
			}

			const should_prerender = get_option(nodes, 'prerender');
			prerender =
				should_prerender === true ||
				// Try prerendering if ssr is false and no server needed. Set it to 'auto' so that
				// the route is not removed from the manifest, there could be a server load function.
				// People can opt out of this behavior by explicitly setting prerender to false
				(should_prerender !== false && get_option(nodes, 'ssr') === false && !page?.server?.actions
					? 'auto'
					: should_prerender ?? false);

			config = get_config(nodes);
		}

		metadata.routes.set(route.id, {
			config,
			methods: Array.from(new Set([...page_methods, ...api_methods])),
			page: {
				methods: page_methods
			},
			api: {
				methods: api_methods
			},
			prerender
		});
	}

	return metadata;
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
