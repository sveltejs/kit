/** @import { EnvironmentModuleNode, ErrorPayload, ViteDevServer } from 'vite' */
/** @import { ModuleRunner } from 'vite/module-runner' */
/** @import { ManifestData, SSRManifest, SSRNode, RemoteChunk, UniversalNode, ValidatedConfig } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { get_mime_lookup, get_runtime_base } from '../../../core/utils.js';
import { from_fs, to_fs } from '../../../utils/vite.js';
import { compact } from '../../../utils/array.js';
import { styleText } from 'node:util';

// vite-specifc queries that we should skip handling for css urls
const vite_css_query_regex = /(?:\?|&)(?:raw|url|inline)(?:&|$)/;

/**
 * @param {typeof import('vite')} vite
 * @param {ViteDevServer} vite_dev_server
 * @param {ModuleRunner} runner
 * @param {ValidatedConfig} svelte_config
 * @param {ManifestData} manifest_data
 * @param {string} root
 * @param {() => RemoteChunk[]} get_remotes
 * @returns {SSRManifest}
 */
export function generate_manifest(
	vite,
	vite_dev_server,
	runner,
	svelte_config,
	manifest_data,
	root,
	get_remotes
) {
	return {
		app_dir: svelte_config.appDir,
		app_path: svelte_config.appDir,
		assets: new Set(manifest_data.assets.map((asset) => asset.file)),
		mime_types: get_mime_lookup(manifest_data),
		client: {
			start: `${get_runtime_base(root)}/client/entry.js`,
			app: `${to_fs(svelte_config.outDir)}/generated/dev/client/app.js`,
			imports: [],
			stylesheets: [],
			fonts: [],
			uses_env_dynamic_public: true,
			nodes:
				svelte_config.router.resolution === 'client'
					? undefined
					: manifest_data.nodes.map((node, i) => {
							if (node.component || node.universal) {
								return `${svelte_config.paths.base}${to_fs(svelte_config.outDir)}/generated/dev/client/nodes/${i}.js`;
							}
						}),
			// `css` is not necessary in dev, as the JS file from `nodes` will reference the CSS file
			routes:
				svelte_config.router.resolution === 'client'
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
		nodes: manifest_data.nodes.map((node, index) => {
			return async () => {
				const result = /** @type {SSRNode} */ ({});
				result.index = index;
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
						const { module_node, module } = await resolve(
							vite,
							vite_dev_server,
							runner,
							/** @type {string} */ (node.component)
						);

						module_nodes.push(module_node);

						return module.default;
					};
				}

				if (node.universal) {
					if (node.page_options?.ssr === false) {
						result.universal = /** @type {UniversalNode} */ (node.page_options);
					} else {
						// TODO: explain why the file was loaded on the server if we fail to load it
						const { module, module_node } = await resolve(
							vite,
							vite_dev_server,
							runner,
							node.universal
						);
						module_nodes.push(module_node);
						result.universal = module;
					}
				}

				if (node.server) {
					const { module } = await resolve(vite, vite_dev_server, runner, node.server);
					result.server = module;
				}

				// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
				// components/stylesheets loaded via import() during `load` are included
				result.inline_styles = async () => {
					/** @type {Set<EnvironmentModuleNode>} */
					const deps = new Set();

					for (const module_node of module_nodes) {
						await find_deps(vite_dev_server, module_node, deps);
					}

					/** @type {Record<string, string>} */
					const styles = {};

					for (const dep of deps) {
						if (vite.isCSSRequest(dep.url) && !vite_css_query_regex.test(dep.url)) {
							const inlineCssUrl = dep.url.includes('?')
								? dep.url.replace('?', '?inline&')
								: dep.url + '?inline';
							try {
								const mod = await runner.import(inlineCssUrl);
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
					() => runner.import(remote.file).then((module) => ({ default: module }))
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
								const url = path.resolve(root, endpoint.file);
								return await loud_ssr_load_module(vite, vite_dev_server, runner, url);
							}
						: null,
					endpoint_id: endpoint?.file
				};
			})
		),
		matchers: async () => {
			if (!manifest_data.params) return {};

			const url = path.resolve(root, manifest_data.params);
			const module = await runner.import(url);

			if (!module.params) {
				throw new Error(`${manifest_data.params} does not export \`params\` from \`defineParams\``);
			}

			return module.params;
		}
	};
}

/**
 * @param {typeof import('vite')} vite
 * @param {ViteDevServer} vite_dev_server
 * @param {ModuleRunner} runner
 * @param {string} url
 * @returns {Promise<Record<string, any>>}
 */
export async function loud_ssr_load_module(vite, vite_dev_server, runner, url) {
	try {
		return await runner.import(url);
	} catch (/** @type {any} */ err) {
		const msg = vite.buildErrorMessage(err, [
			styleText('red', `Internal server error: ${err.message}`)
		]);

		if (!vite_dev_server.config.logger.hasErrorLogged(err)) {
			vite_dev_server.config.logger.error(msg, { error: err });
		}

		// TODO this is inadequate — it doesn't reliably show the overlay on every page load,
		// and when it does appear it may immediately vanish. `hot.send` broadcasts
		// to all connected clients, even ones that are unaffected by the error.
		// we need a more considered approach
		vite_dev_server.environments.client.hot.send({
			type: 'error',
			err: /** @type {ErrorPayload['err']} */ ({
				...err,
				// these properties are non-enumerable and will
				// not be serialized unless we explicitly include them
				message: err.message,
				stack: err.stack ?? ''
			})
		});

		throw err;
	}
}

/**
 * @param {typeof import('vite')} vite
 * @param {ViteDevServer} vite_dev_server
 * @param {ModuleRunner} runner
 * @param {string} id
 */
async function resolve(vite, vite_dev_server, runner, id) {
	const url = id.startsWith('..') ? to_fs(path.resolve(id)) : `/${id}`;

	const module = await loud_ssr_load_module(vite, vite_dev_server, runner, url);

	const module_node = await vite_dev_server.environments.ssr.moduleGraph.getModuleByUrl(url);
	if (!module_node) throw new Error(`Could not find node for ${url}`);

	return { module, module_node, url };
}

/**
 * @param {ViteDevServer} vite
 * @param {EnvironmentModuleNode} node
 * @param {Set<EnvironmentModuleNode>} deps
 */
async function find_deps(vite, node, deps) {
	// since `transformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
	// instead of using `await`, we resolve all branches in parallel.
	/** @type {Promise<void>[]} */
	const branches = [];

	/** @param {EnvironmentModuleNode} node */
	async function add(node) {
		if (!deps.has(node)) {
			deps.add(node);
			await find_deps(vite, node, deps);
		}
	}

	/** @param {string} url */
	async function add_by_url(url) {
		const node = await vite.environments.ssr.moduleGraph.getModuleByUrl(url);

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
