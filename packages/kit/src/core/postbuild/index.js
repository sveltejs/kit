import { writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { get_option } from '../../runtime/server/utils.js';
import {
	validate_common_exports,
	validate_page_server_exports,
	validate_server_exports
} from '../../utils/exports.js';
import { prerender } from './prerender.js';

const [, , client_out_dir, manifest_path, results_path, verbose, env] = process.argv;

/** @type {import('types').SSRManifest} */
const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

/** @type {import('types').PrerenderMap} */
const prerender_map = new Map();

// analyse routes
for (const route of manifest._.routes) {
	if (route.endpoint) {
		const mod = await route.endpoint();
		if (mod.prerender !== undefined) {
			validate_server_exports(mod, route.id);

			if (mod.prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
				throw new Error(
					`Cannot prerender a +server file with POST, PATCH, PUT, or DELETE (${route.id})`
				);
			}

			prerender_map.set(route.id, mod.prerender);
		}
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
				validate_common_exports(layout.server, route.id);
				validate_common_exports(layout.universal, route.id);
			}
		}

		if (page) {
			validate_page_server_exports(page.server, route.id);
			validate_common_exports(page.universal, route.id);
		}

		const should_prerender = get_option(nodes, 'prerender');
		const prerender =
			should_prerender === true ||
			// Try prerendering if ssr is false and no server needed. Set it to 'auto' so that
			// the route is not removed from the manifest, there could be a server load function.
			// People can opt out of this behavior by explicitly setting prerender to false
			(should_prerender !== false && get_option(nodes, 'ssr') === false && !page?.server?.actions
				? 'auto'
				: false);

		prerender_map.set(route.id, prerender);
	}
}

const { prerendered } = await prerender({
	manifest,
	prerender_map,
	client_out_dir,
	verbose,
	env
});

writeFileSync(
	results_path,
	JSON.stringify({ prerendered, prerender_map }, (_key, value) =>
		value instanceof Map ? Array.from(value.entries()) : value
	)
);
