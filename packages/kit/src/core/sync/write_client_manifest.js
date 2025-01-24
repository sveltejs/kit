import path from 'node:path';
import { relative_path, resolve_entry } from '../../utils/filesystem.js';
import { s } from '../../utils/misc.js';
import { dedent, isSvelte5Plus, write_if_changed } from './utils.js';
import colors from 'kleur';

/**
 * Writes the client manifest to disk. The manifest is used to power the router. It contains the
 * list of routes and corresponding Svelte components (i.e. pages and layouts).
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {string} output_client
 * @param {string} output_server
 * @param {Array<{ has_server_load: boolean }>} [metadata] If this is omitted, we have to assume that all routes with a `+layout/page.server.js` file have a server load function
 */
export function write_client_manifest(kit, manifest_data, output_client, output_server, metadata) {
	/**
	 * Creates a module that exports a `CSRPageNode`
	 * @param {import('types').PageNode} node
	 */
	function generate_node(node) {
		const declarations = [];

		if (node.universal) {
			declarations.push(
				`import * as universal from ${s(relative_path(`${output_client}/nodes`, node.universal))};`,
				'export { universal };'
			);
		}

		if (node.component) {
			declarations.push(
				`export { default as component } from ${s(
					relative_path(`${output_client}/nodes`, node.component)
				)};`
			);
		}

		return declarations.join('\n');
	}

	/** @type {Map<import('types').PageNode, number>} */
	const indices = new Map();
	const nodes = manifest_data.nodes
		.map((node, i) => {
			indices.set(node, i);

			write_if_changed(`${output_client}/nodes/${i}.js`, generate_node(node));
			return `() => import('./nodes/${i}')`;
		})
		.join(',\n');

	const layouts_with_server_load = new Set();

	const dictionary = dedent`
		{
			${manifest_data.routes
				.map((route) => {
					if (route.page) {
						const errors = route.page.errors.slice(1).map((n) => n ?? '');
						const layouts = route.page.layouts.slice(1).map((n) => n ?? '');

						while (layouts.at(-1) === '') layouts.pop();
						while (errors.at(-1) === '') errors.pop();

						let leaf_has_server_load = false;
						if (route.leaf) {
							if (metadata) {
								const i = /** @type {number} */ (indices.get(route.leaf));

								leaf_has_server_load = metadata[i].has_server_load;
							} else if (route.leaf.server) {
								leaf_has_server_load = true;
							}
						}

						// Encode whether or not the route uses server data
						// using the ones' complement, to save space
						const array = [`${leaf_has_server_load ? '~' : ''}${route.page.leaf}`];

						// Encode whether or not the layout uses server data.
						// It's a different method compared to pages because layouts
						// are reused across pages, so we save space by doing it this way.
						route.page.layouts.forEach((layout) => {
							if (layout == undefined) return;

							let layout_has_server_load = false;

							if (metadata) {
								layout_has_server_load = metadata[layout].has_server_load;
							} else if (manifest_data.nodes[layout].server) {
								layout_has_server_load = true;
							}

							if (layout_has_server_load) {
								layouts_with_server_load.add(layout);
							}
						});

						// only include non-root layout/error nodes if they exist
						if (layouts.length > 0 || errors.length > 0) array.push(`[${layouts.join(',')}]`);
						if (errors.length > 0) array.push(`[${errors.join(',')}]`);

						return `${s(route.id)}: [${array.join(',')}]`;
					}
				})
				.filter(Boolean)
				.join(',\n')}
		}
	`;

	const client_hooks_file = resolve_entry(kit.files.hooks.client);
	const universal_hooks_file = resolve_entry(kit.files.hooks.universal);

	const typo = resolve_entry('src/+hooks.client');
	if (typo) {
		console.log(
			colors
				.bold()
				.yellow(
					`Unexpected + prefix. Did you mean ${typo.split('/').at(-1)?.slice(1)}?` +
						` at ${path.resolve(typo)}`
				)
		);
	}

	write_if_changed(
		`${output_client}/app.js`,
		dedent`
			${
				client_hooks_file
					? `import * as client_hooks from '${relative_path(output_client, client_hooks_file)}';`
					: ''
			}
			${
				universal_hooks_file
					? `import * as universal_hooks from '${relative_path(output_client, universal_hooks_file)}';`
					: ''
			}

			export { matchers } from './matchers.js';

			export const nodes = [
				${nodes}
			];

			export const server_loads = [${[...layouts_with_server_load].join(',')}];

			export const dictionary = ${dictionary};

			export const hooks = {
				handleError: ${
					client_hooks_file ? 'client_hooks.handleError || ' : ''
				}(({ error }) => { console.error(error) }),
				${client_hooks_file ? 'init: client_hooks.init,' : ''}
				reroute: ${universal_hooks_file ? 'universal_hooks.reroute || ' : ''}(() => {}),
				transport: ${universal_hooks_file ? 'universal_hooks.transport || ' : ''}{}
			};

			export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

			export const hash = ${JSON.stringify(kit.router.type === 'hash')};

			export const decode = (type, value) => decoders[type](value);

			export { default as root } from '../root.${isSvelte5Plus() ? 'js' : 'svelte'}';
		`
	);

	// write matchers to a separate module so that we don't
	// need to worry about name conflicts
	const imports = [];
	const matchers = [];

	for (const key in manifest_data.matchers) {
		const src = manifest_data.matchers[key];

		imports.push(`import { match as ${key} } from ${s(relative_path(output_client, src))};`);
		matchers.push(key);
	}

	const module = imports.length
		? `${imports.join('\n')}\n\nexport const matchers = { ${matchers.join(', ')} };`
		: 'export const matchers = {};';

	write_if_changed(`${output_client}/matchers.js`, module);

	// Write out the server version of the routing manifest for use of _app/routes/... requests
	// We do that by creating a dictionary of route_id -> CSRRoute. The imports will be transformed
	// by Vite to point to the correct client nodes, and at runtime, the server will stringify the object.
	const server_nodes = manifest_data.nodes.map((_, i) => {
		return `() => import('${relative_path(`${output_server}`, `${output_client}/nodes`)}/${i}')`;
	});
	const server_dictionary = dedent`
		{
			${manifest_data.routes
				.map((route) => {
					if (route.page && route.leaf) {
						let leaf_has_server_load = false;
						if (metadata) {
							leaf_has_server_load = metadata[route.page.leaf].has_server_load;
						} else if (route.leaf.server) {
							leaf_has_server_load = true;
						}

						const id = s(route.id);
						const leaf = `[${leaf_has_server_load}, ${server_nodes[route.page.leaf]}]`;
						// Setting undefined explictly instead of the empty string in case of no loader prevents truncation of the array
						// when there's trailing undefined values, which is important because errors/layouts need to be the same length.
						const errors = `[${route.page.errors.map((n) => (n != null ? server_nodes[n] : 'undefined')).join(',')}]`;
						const layouts = `[${route.page.layouts.map((n) => (n != null ? `[${layouts_with_server_load.has(n)}, ${server_nodes[n]}]` : 'undefined')).join(',')}]`;

						const nodes = [`${route.page.leaf}: ${server_nodes[route.page.leaf]}`];
						for (const node of route.page.layouts.concat(route.page.errors)) {
							if (node != null) {
								nodes.push(`${node}: ${server_nodes[node]}`);
							}
						}

						// String representation of
						/** @type {import('types').CSRRoute} */
						// without exec because that's not needed when doing server side routing resolution
						return (
							s(route.id) +
							': {' +
							dedent`
								id: ${id},
								leaf: ${leaf},
								errors: ${errors},
								layouts: ${layouts},
								nodes: {${nodes.join(',\n')}},
							` +
							'}'
						);
					}
				})
				.filter(Boolean)
				.join(',\n')}
		}
	`;

	write_if_changed(
		`${output_server}/route_resolution_dictionary.js`,
		dedent`
			export const dictionary = ${server_dictionary};
		`
	);
}
