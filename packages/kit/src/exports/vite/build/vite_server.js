/** @import { ValidatedConfig } from 'types' */
/** @import { Connect, PluginOption, ViteDevServer } from 'vite' */
import fs from 'node:fs';
import path, { basename } from 'node:path';
import { createServer, isFetchableDevEnvironment } from 'vite';
import { exactRegex } from 'rolldown/filter';
import { sveltekit_env, sveltekit_ipc } from '../module_ids.js';
import { createNodeWorkerEnvironment } from '../dev/worker_environment.js';
import { dedent } from '../../../core/sync/utils.js';
import {
	check_feature,
	create_app_dir_matcher,
	has_correct_case,
	invalidate_module,
	remove_static_middlewares
} from '../dev/index.js';
import { getRequest, setResponse } from '@sveltejs/kit/node';
import { s } from '../../../utils/misc.js';
import { get_env } from '../utils.js';
import sirv from 'sirv';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';

/**
 * @param {object} opts
 * @param {ValidatedConfig} opts.svelte_config
 * @param {string} opts.out
 * @param {string} opts.manifest_path
 * @param {string} opts.server_path
 * @param {PluginOption} [opts.vite_plugins]
 * @returns {Promise<ViteDevServer>}
 */
export async function create_build_server({
	svelte_config,
	out,
	manifest_path,
	server_path,
	vite_plugins
}) {
	/** @type {Connect.ServerStackItem | undefined} */
	let serve_static_middleware;

	/** @type {ViteDevServer} */
	let dev_server;

	/** @type {PluginOption} */
	const plugin_ipc = {
		name: 'vite-plugin-sveltekit-compile:ipc',
		configureServer(vite) {
			dev_server = vite;
		},
		applyToEnvironment(environment) {
			return environment.config.consumer === 'server';
		},
		resolveId: {
			filter: {
				id: exactRegex('__sveltekit/ipc')
			},
			handler() {
				return '\0virtual:__sveltekit/ipc';
			}
		},
		load: {
			filter: {
				id: exactRegex(sveltekit_ipc)
			},
			handler() {
				const address = dev_server.httpServer?.address();
				const port =
					typeof address === 'string' ? Number(address.split(':').at(-1)) : address?.port;

				return dedent`
          // helps us avoid global fetch warnings we emit when the user uses it incorrectly
          const native_fetch = globalThis.fetch;

          // we have to send a request to the Vite dev server and configure
          // the middleware to intercept and respond instead of using
          // import.meta.hot for two-way communication because workerd
          // doesn't like it when we await a promise created from a different
          // request context
          export function get(pathname) {
            return native_fetch(\`http://localhost:${port}/${svelte_config.kit.appDir}\${pathname}\`);
          }
        `;
			}
		}
	};

	/** @type {{ public: Record<string, string>; private: Record<string, string> }} */
	let env;

	/** @type {PluginOption} */
	const plugin_server = {
		name: 'vite-plugin-sveltekit-compile:build-entry',
		config(_, vite_config_env) {
			env = get_env(svelte_config.kit.env, vite_config_env.mode);

			return {
				appType: 'custom',
				cacheDir: `node_modules/.vite-${basename(server_path, '.js')}`,
				environments: {
					ssr: {
						build: {
							outDir: `${out}/server`
						}
					}
				},
				publicDir: `${out}/client`,
				resolve: {
					alias: [
						{
							find: '__SERVER__',
							replacement: `${out}/server`
						}
					]
				},
				server: {
					watch: {
						ignored: out
					}
				}
			};
		},
		configureServer(vite) {
			const assets = svelte_config.kit.paths.assets
				? SVELTE_KIT_ASSETS
				: svelte_config.kit.paths.base;

			const asset_server = sirv(`${out}/client`, {
				dev: true,
				etag: true,
				maxAge: 0,
				extensions: [],
				setHeaders: (res) => {
					res.setHeader('access-control-allow-origin', '*');
				}
			});

			vite.middlewares.use((req, res, next) => {
				const base = `${vite.config.server.https ? 'https' : 'http'}://${
					req.headers[':authority'] || req.headers.host
				}`;

				const decoded = decodeURI(new URL(base + req.url).pathname);

				if (decoded.startsWith(assets)) {
					const pathname = decoded.slice(assets.length);
					const file = svelte_config.kit.files.assets + pathname;

					if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) {
						if (has_correct_case(file, svelte_config.kit.files.assets)) {
							req.url = encodeURI(pathname); // don't need query/hash
							asset_server(req, res);
							return;
						}
					}
				}

				next();
			});

			const read_pathname = create_app_dir_matcher(
				svelte_config.kit.paths.base,
				svelte_config.kit.appDir,
				'/read'
			);

			const check_feature_pathname = create_app_dir_matcher(
				svelte_config.kit.paths.base,
				svelte_config.kit.appDir,
				'/check-feature'
			);

			return () => {
				serve_static_middleware = vite.middlewares.stack.find(
					(middleware) =>
						/** @type {Function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
				);

				// Vite will give a 403 on URLs like /test, /static, and /package.json preventing us from
				// serving routes with those names. See https://github.com/vitejs/vite/issues/7363
				remove_static_middlewares(vite.middlewares);

				// ensure the server port is up-to-date
				invalidate_module(vite, sveltekit_ipc);

				vite.middlewares.use((req, res, next) => {
					// Vite's base middleware strips out the base path. Restore it
					req.url = req.originalUrl;

					const base = `${vite.config.server.https ? 'https' : 'http'}://${
						req.headers[':authority'] || req.headers.host
					}`;

					const url = new URL(base + req.url);
					const decoded = decodeURI(url.pathname);

					if (decoded.match(check_feature_pathname)) {
						const route_id = url.searchParams.get('route_id');
						const config = url.searchParams.get('config');
						const feature = url.searchParams.get('feature');

						if (!route_id || !config || !feature) {
							res.writeHead(400);
							res.end('Must have route_id, config, and feature query arguments');
							return;
						}

						const result = check_feature(
							route_id,
							JSON.parse(config),
							feature,
							svelte_config.kit.adapter
						);

						res.writeHead(200);
						res.end(result?.message);
						return;
					}

					if (decoded.match(read_pathname)) {
						const file = url.searchParams.get('file');
						if (!file) {
							res.writeHead(400);
							res.end('Missing file query argument');
							return;
						}

						const readable_stream = fs.createReadStream(
							`${svelte_config.kit.outDir}/output/server/${file}`
						);

						res.writeHead(200);
						readable_stream.pipe(res);
						return;
					}

					next();
				});
			};
		},
		applyToEnvironment(environment) {
			return environment.config.consumer === 'server';
		},
		resolveId: {
			filter: {
				id: [
					exactRegex('sveltekit:server-manifest'),
					exactRegex('sveltekit:server'),
					exactRegex('sveltekit:env')
				]
			},
			handler(id) {
				if (id === 'sveltekit:server-manifest') {
					return manifest_path;
				}

				// substitute the Server class with our script instead
				if (id === 'sveltekit:server') {
					return server_path;
				}

				if (id === 'sveltekit:env') {
					return sveltekit_env;
				}
			}
		},
		load: {
			filter: {
				id: exactRegex(sveltekit_env)
			},
			handler() {
				return `export const env = ${s({ ...env.private, ...env.public })};`;
			}
		}
	};

	/** @type {PluginOption} */
	const plugin_node_environment = {
		name: 'vite-plugin-sveltekit-compile:node-environment',
		config() {
			return {
				environments: {
					ssr: {
						dev: {
							createEnvironment: createNodeWorkerEnvironment
						}
					}
				}
			};
		},
		configureServer(vite) {
			return () => {
				vite.middlewares.use(async (req, res, next) => {
					// Vite's base middleware strips out the base path. Restore it
					req.url = req.originalUrl;

					const base = `${vite.config.server.https ? 'https' : 'http'}://${
						req.headers[':authority'] || req.headers.host
					}`;

					// fallback to our own fetch handler if the adapter doesn't provide one
					if (!isFetchableDevEnvironment(vite.environments.ssr)) {
						throw new Error(
							'The Vite configured dev SSR environment must be a FetchableDevEnvironment'
						);
					}

					const request = await getRequest({
						base,
						request: req
					});
					const response = await vite.environments.ssr.dispatchFetch(request);

					if (response.status === 404) {
						// @ts-expect-error
						serve_static_middleware?.handle(req, res, () => {
							void setResponse(res, response);
						});
					} else {
						void setResponse(res, response);
					}

					next();
				});
			};
		},
		applyToEnvironment(environment) {
			return environment.config.consumer === 'server';
		},
		resolveId: {
			filter: {
				id: exactRegex('__sveltekit/dev-server-entry')
			},
			handler() {
				return path.join(import.meta.dirname, '../dev/ssr_entry.js');
			}
		}
	};

	/** @type {PluginOption} */
	const plugins = [
		vite_plugins,
		plugin_ipc,
		plugin_server,
		svelte_config.kit.adapter?.vite?.plugins ?? plugin_node_environment
	].filter(Boolean);

	return createServer({
		configFile: false,
		command: 'serve',
		plugins
	});
}
