import { writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import * as devalue from 'devalue';
import { get_option } from '../../runtime/server/utils.js';
import {
	validate_common_exports,
	validate_page_server_exports,
	validate_server_exports
} from '../../utils/exports.js';
import { load_config } from '../config/index.js';

const [, , out, manifest_path, env_json] = process.argv;
const env = JSON.parse(env_json);

/** @type {import('types').SSRManifest} */
const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

/** @type {import('types').PrerenderMap} */
const prerender_map = new Map();

/** @type {import('types').ValidatedKitConfig} */
const config = (await load_config()).kit;

const server_root = join(config.outDir, 'output');

/** @type {import('types').ServerInternalModule} */
const internal = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

// configure `import { building } from '$app/environment'` —
// essential we do this before analysing the code
internal.set_building(true);

// set env, in case it's used in initialisation
const entries = Object.entries(env);
const prefix = config.env.publicPrefix;
internal.set_private_env(Object.fromEntries(entries.filter(([k]) => !k.startsWith(prefix))));
internal.set_public_env(Object.fromEntries(entries.filter(([k]) => k.startsWith(prefix))));

const nodes = [];

// analyse nodes
for (const loader of manifest._.nodes) {
	const node = await loader();

	nodes.push({
		has_server_load: node.server?.load !== undefined
	});
}

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
				: should_prerender ?? false);

		prerender_map.set(route.id, prerender);
	}
}

writeFileSync(`${out}/analysis.json`, devalue.stringify({ nodes, prerender_map }));

process.exit(0);
