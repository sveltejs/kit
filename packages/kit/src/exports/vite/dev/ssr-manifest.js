import { server_assets } from '__sveltekit/server-assets';
import { remotes } from '__sveltekit/remotes';
import { env, kit, manifest_data, mime_types } from '__sveltekit/manifest-data';
import { to_fs } from '../filesystem.js';
import { compact } from '../../../utils/array.js';
import { join } from '../../../utils/path.js';
import { posixify } from '../../../utils/os.js';

export { env };
export const base_path = kit.paths.base;
export const prerendered = new Set();

export const manifest = {
	appDir: kit.appDir,
	appPath: kit.appDir,
	assets: new Set(manifest_data.assets.map((asset) => asset.file)),
	mimeTypes: mime_types,
	_: {
		client: {
			start: posixify(join(import.meta.dirname, '../../../runtime/client/entry.js')),
			app: `${to_fs(kit.outDir)}/generated/client/app.js`,
			imports: [],
			stylesheets: [],
			fonts: [],
			uses_env_dynamic_public: true,
			nodes:
				kit.router.resolution === 'client'
					? undefined
					: manifest_data.nodes.map((node, i) => {
							if (node.component || node.universal) {
								return `${kit.paths.base}${to_fs(kit.outDir)}/generated/client/nodes/${i}.js`;
							}
						}),

			// \`css\` is not necessary in dev, as the JS file from \`nodes\` will reference the CSS file
			routes:
				kit.router.resolution === 'client'
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
		server_assets,
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

				/** @type {string[]} */
				const urls = [];

				if (node.component) {
					result.component = async () => {
						const { module, url } = await resolve(
							join(__SVELTEKIT_ROOT__, /** @type {string} */ (node.component))
						);
						urls.push(url);
						return module.default;
					};
				}

				if (node.universal) {
					if (node.page_options?.ssr === false) {
						result.universal = node.page_options;
					} else {
						// TODO: explain why the file was loaded on the server if we fail to load it
						const { module, url } = await resolve(join(__SVELTEKIT_ROOT__, node.universal));
						urls.push(url);
						result.universal = module;
					}
				}

				if (node.server) {
					const { module } = await resolve(join(__SVELTEKIT_ROOT__, node.server));
					result.server = module;
				}

				// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
				// components/stylesheets loaded via import() during `load` are included

				const event = `sveltekit:inline-styles-node-${i}-response`;
				result.inline_styles = async () => {
					if (!import.meta.hot) throw new Error('hmr must be enabled in the dev environment');

					const { promise, resolve } = Promise.withResolvers();

					/** @param {Record<string, string>} styles */
					const listener = async (styles) => {
						import.meta.hot?.off(event, listener);
						const importing_styles = Object.entries(styles).map(
							async ([dep_url, inline_css_url]) => {
								return [
									dep_url,
									await import(/* @vite-ignore */ inline_css_url).then((mod) => mod.default)
								];
							}
						);
						resolve(Object.fromEntries(await Promise.all(importing_styles)));
					};

					import.meta.hot.on(event, listener);
					import.meta.hot.send('sveltekit:inline-styles-request', {
						urls,
						node: result.index
					});

					return promise;
				};

				return result;
			};
		}),
		prerendered_routes: new Set(),
		get remotes() {
			return Object.fromEntries(
				remotes.map((remote) => [
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
			const importing_matchers = manifest_data.matchers.map(async ([name, file]) => {
				const url = join(__SVELTEKIT_ROOT__, file);
				const { module } = await resolve(url);
				if (!module.match) {
					throw new Error(`${file} does not export a \`match\` function`);
				}
				return [name, module.match];
			});
			return Object.fromEntries(await Promise.all(importing_matchers));
		}
	}
};

/** @param {string} url */
async function loud_ssr_load_module(url) {
	try {
		return await import(/* @vite-ignore */ url);
	} catch (err) {
		if (err instanceof Error) {
			import.meta.hot?.send('sveltekit:ssr-load-module', {
				...err,
				// these properties are non-enumerable and will not be
				// serialized unless we explicitly include them
				message: err.message,
				stack: err.stack
			});
		}

		throw err;
	}
}

/** @param {string} id */
async function resolve(id) {
	const url = id.startsWith('..') ? to_fs(id) : `file:///${id}`;
	const module = await loud_ssr_load_module(url);
	return { module, url };
}
