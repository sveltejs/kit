/** @import { SSRManifest } from '@sveltejs/kit' */
/** @import { EnvironmentModuleNode } from 'vite' */
import fs from 'node:fs';
import { isCSSRequest } from 'vite';
import { manifest_data, mime_types } from '__sveltekit/manifest-data';
import { get_dev_server, get_remotes } from './context.js';
import { resolve } from './utils.js';
import { compact } from '../../../utils/array.js';
import { join } from '../../../utils/path.js';
import { from_fs, to_fs } from '../../../utils/vite.js';

// vite-specifc queries that we should skip handling for css urls
const vite_css_query_regex = /(?:\?|&)(?:raw|url|inline)(?:&|$)/;

/** @type {SSRManifest} */
export const manifest = {
	appDir: __SVELTEKIT_APP_DIR__,
	appPath: `${__SVELTEKIT_PATHS_BASE__}/${__SVELTEKIT_APP_DIR__}`,
	assets: new Set(manifest_data.assets.map((asset) => asset.file)),
	base: __SVELTEKIT_PATHS_BASE__,
	mimeTypes: mime_types,
	_: {
		client: {
			start: `${__SVELTEKIT_RUNTIME__}/client/entry.js`,
			app: `${to_fs(__SVELTEKIT_OUT_DIR__)}/generated/client/app.js`,
			imports: [],
			stylesheets: [],
			fonts: [],
			uses_env_dynamic_public: true,
			nodes: __SVELTEKIT_CLIENT_ROUTING__
				? undefined
				: manifest_data.nodes.map((node, i) => {
						if (node.component || node.universal) {
							return `${__SVELTEKIT_PATHS_BASE__}${to_fs(__SVELTEKIT_OUT_DIR__)}/generated/client/nodes/${i}.js`;
						}
					}),

			// \`css\` is not necessary in dev, as the JS file from \`nodes\` will reference the CSS file
			routes: __SVELTEKIT_CLIENT_ROUTING__
				? undefined
				: compact(
						manifest_data.routes.map((route) => {
							if (!route.page) return;

							return {
								id: route.id,
								pattern: route.pattern,
								params: route.params,
								layouts: route.page.layouts.map((l) =>
									l !== undefined ? [!!manifest_data.nodes[l].server, l] : undefined
								),
								errors: route.page.errors,
								leaf: [!!manifest_data.nodes[route.page.leaf].server, route.page.leaf]
							};
						})
					)
		},
		server_assets: new Proxy(
			{},
			{
				has: (_, /** @type {string} */ file) => fs.existsSync(from_fs(file)),
				get: (_, /** @type {string} */ file) => fs.statSync(from_fs(file)).size
			}
		),
		nodes: manifest_data.nodes.map((node, i) => {
			return async () => {
				/** @type {import('types').SSRNode} */
				const result = {};
				result.index = i;
				result.universal_id = node.universal;
				result.server_id = node.server;

				// these are unused in dev, but it's easier to include them
				result.imports = [];
				result.stylesheets = [];
				result.fonts = [];

				/** @type {EnvironmentModuleNode[]} */
				const module_nodes = [];

				if (node.component) {
					result.component = async () => {
						const { module, module_node } = await resolve(
							join(__SVELTEKIT_ROOT__, /** @type {string} */ (node.component))
						);
						module_nodes.push(module_node);
						return module.default;
					};
				}

				if (node.universal) {
					if (node.page_options?.ssr === false) {
						result.universal = node.page_options;
					} else {
						// TODO: explain why the file was loaded on the server if we fail to load it
						const { module, module_node } = await resolve(join(__SVELTEKIT_ROOT__, node.universal));
						module_nodes.push(module_node);
						result.universal = module;
					}
				}

				if (node.server) {
					const { module } = await resolve(join(__SVELTEKIT_ROOT__, node.server));
					result.server = module;
				}

				// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
				// components/stylesheets loaded via import() during `load` are included

				result.inline_styles = async () => {
					/** @type {Set<EnvironmentModuleNode>} */
					const deps = new Set();

					for (const module_node of module_nodes) {
						await find_deps(module_node, deps);
					}

					/** @type {Record<string, string>} */
					const styles = {};

					for (const dep of deps) {
						if (isCSSRequest(dep.url) && !vite_css_query_regex.test(dep.url)) {
							// if (isCSSRequest(dep.url) && !vite_css_query_regex.test(dep.url)) {
							const inline_css_url = dep.url.includes('?')
								? dep.url.replace('?', '?inline&')
								: dep.url + '?inline';
							try {
								const mod = await import(/* @vite-ignore */ inline_css_url);
								styles[dep.url] = mod.default;
							} catch {
								// this can happen with dynamically imported modules, I think
								// because the Vite module graph doesn't distinguish between
								// static and dynamic imports? TODO investigate, submit fix
							}
						}
					}

					return styles;
				};

				return result;
			};
		}),
		prerendered_routes: new Set(),
		get remotes() {
			return Object.fromEntries(
				get_remotes().map((remote) => [
					remote.hash,
					() =>
						import(/* @vite-ignore */ join(__SVELTEKIT_ROOT__, remote.file)).then((module) => ({
							default: module
						}))
				])
			);
		},
		routes: compact(
			manifest_data.routes.map((route) => {
				if (!route.page && !route.endpoint) return null;

				const endpoint = route.endpoint;

				return {
					id: route.id,
					pattern: route.pattern,
					params: route.params,
					page: route.page,
					endpoint: endpoint
						? async () => {
								const url = join(__SVELTEKIT_ROOT__, endpoint.file);
								const { module } = await resolve(url);
								return module;
							}
						: null,
					endpoint_id: endpoint?.file
				};
			})
		),
		matchers: async () => {
			if (!manifest_data.params) return {};

			const url = join(__SVELTEKIT_ROOT__, manifest_data.params);
			const { module } = await resolve(url);

			if (!module.params) {
				throw new Error(`${manifest_data.params} does not export \`params\` from \`defineParams\``);
			}

			return module.params;
		}
	}
};

/**
 * @param {EnvironmentModuleNode} node
 * @param {Set<EnvironmentModuleNode>} deps
 */
async function find_deps(node, deps) {
	const dev_server = get_dev_server();

	// since `ssrTransformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
	// instead of using `await`, we resolve all branches in parallel.
	/** @type {Promise<void>[]} */
	const branches = [];

	/** @param {EnvironmentModuleNode} node */
	async function add(node) {
		if (!deps.has(node)) {
			deps.add(node);
			await find_deps(node, deps);
		}
	}

	/** @param {string} url */
	async function add_by_url(url) {
		const node = await dev_server.environments.ssr.moduleGraph.getModuleByUrl(url);

		if (node) {
			await add(node);
		}
	}

	if (node.transformResult) {
		if (node.transformResult.deps) {
			node.transformResult.deps.forEach((url) => branches.push(add_by_url(url)));
		}

		if (node.transformResult.dynamicDeps) {
			node.transformResult.dynamicDeps.forEach((url) => branches.push(add_by_url(url)));
		}
	} else {
		node.importedModules.forEach((node) => branches.push(add(node)));
	}

	await Promise.all(branches);
}
